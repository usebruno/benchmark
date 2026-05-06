#!/usr/bin/env node

/**
 * Fully autonomous benchmark ingestion.
 *
 * Given a source repo and commit SHA:
 * 1. Finds the benchmark workflow run for that commit via GitHub API
 * 2. Downloads all benchmark-results-{os} artifacts
 * 3. Discovers suites from the results filenames (results/{suite}.json)
 * 4. Appends data points to data/{suite}/{os}.json
 * 5. Auto-registers new suites/OS in data/manifest.json
 *
 * Env vars:
 *   SOURCE_REPO  - e.g. "usebruno/bruno"
 *   COMMIT_SHA   - the commit to ingest
 *   GITHUB_TOKEN - for API access and artifact downloads
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceRepo = process.env.SOURCE_REPO;
const commitSha = process.env.COMMIT_SHA;
const token = process.env.GITHUB_TOKEN;

if (!sourceRepo || !commitSha || !token) {
  console.error('Missing required env vars: SOURCE_REPO, COMMIT_SHA, GITHUB_TOKEN');
  process.exit(1);
}

const ARTIFACT_PREFIX = 'benchmark-results-';
const API = `https://api.github.com/repos/${sourceRepo}`;

async function api(endpoint) {
  const res = await fetch(`${API}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${endpoint}`);
  return res.json();
}

async function downloadArtifact(artifactId, destDir) {
  const url = `${API}/actions/artifacts/${artifactId}/zip`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Failed to download artifact ${artifactId}: ${res.status}`);

  const zipPath = path.join(destDir, `${artifactId}.zip`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(zipPath, buffer);

  const extractDir = path.join(destDir, String(artifactId));
  fs.mkdirSync(extractDir, { recursive: true });
  execSync(`unzip -o -q "${zipPath}" -d "${extractDir}"`);
  fs.unlinkSync(zipPath);

  return extractDir;
}

function updateManifest(suiteId, os, suiteMeta) {
  const manifestPath = path.join('data', 'manifest.json');
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    : { suites: [] };

  if (!manifest.sourceRepo) {
    manifest.sourceRepo = sourceRepo;
  }

  let suite = manifest.suites.find(s => s.id === suiteId);
  if (!suite) {
    suite = {
      id: suiteId,
      name: suiteMeta?.name || suiteId,
      os: [],
      direction: suiteMeta?.direction || 'smaller',
      unit: suiteMeta?.unit || 'ms'
    };
    manifest.suites.push(suite);
    console.log(`  Registered new suite: ${suiteId}`);
  } else if (suiteMeta) {
    // Update metadata from results if the source provides it
    if (suiteMeta.name && suiteMeta.name !== suiteId) suite.name = suiteMeta.name;
    if (suiteMeta.direction) suite.direction = suiteMeta.direction;
    if (suiteMeta.unit) suite.unit = suiteMeta.unit;
  }

  if (!suite.os.includes(os)) {
    suite.os.push(os);
    suite.os.sort();
    console.log(`  Added OS "${os}" to suite "${suiteId}"`);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

function appendDataPoint(suiteId, os, entries) {
  const dataDir = path.join('data', suiteId);
  const dataFile = path.join(dataDir, `${os}.json`);
  fs.mkdirSync(dataDir, { recursive: true });

  let history = [];
  if (fs.existsSync(dataFile)) {
    history = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  }

  history.push({
    commit: commitSha,
    date: new Date().toISOString(),
    entries
  });

  fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
}

async function main() {
  console.log(`Ingesting benchmarks for ${sourceRepo} @ ${commitSha.substring(0, 7)}`);

  // 1. Find the workflow run for this commit (works for both push and pull_request events)
  console.log('Finding workflow run...');
  const runs = await api(`/actions/runs?head_sha=${commitSha}&status=completed&per_page=20`);
  const benchmarkRun = runs.workflow_runs.find(r => r.name === 'Benchmarks');

  if (!benchmarkRun) {
    console.error(`No completed Benchmarks workflow run found for commit ${commitSha.substring(0, 7)}`);
    console.error(`Searched ${runs.total_count} completed runs`);
    process.exit(1);
  }

  const runId = benchmarkRun.id;

  console.log(`Found run ${runId}`);

  // 2. List artifacts for this run
  const artifactsRes = await api(`/actions/runs/${runId}/artifacts`);
  const benchmarkArtifacts = artifactsRes.artifacts.filter(a => a.name.startsWith(ARTIFACT_PREFIX));

  if (benchmarkArtifacts.length === 0) {
    console.error('No benchmark artifacts found in this run');
    process.exit(1);
  }

  console.log(`Found ${benchmarkArtifacts.length} artifact(s): ${benchmarkArtifacts.map(a => a.name).join(', ')}`);

  const tmpDir = path.join(process.cwd(), '.tmp-artifacts');
  fs.mkdirSync(tmpDir, { recursive: true });

  let ingested = 0;

  // 3. Process each artifact
  for (const artifact of benchmarkArtifacts) {
    const os = artifact.name.replace(ARTIFACT_PREFIX, '');
    console.log(`\nProcessing ${artifact.name} (os: ${os})...`);

    const extractDir = await downloadArtifact(artifact.id, tmpDir);

    // 4. Discover suites — find all .json files under any "results" directory
    //    The artifact may contain paths like tests/benchmarks/results/mounting.json
    const resultFiles = [];
    function findResults(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findResults(full);
        } else if (entry.isFile() && entry.name.endsWith('.json') && dir.endsWith('results')) {
          resultFiles.push(full);
        }
      }
    }
    findResults(extractDir);

    if (resultFiles.length === 0) {
      console.log(`  No results JSON files found in artifact, skipping`);
      continue;
    }
    for (const filePath of resultFiles) {
      const suiteId = path.basename(filePath, '.json');
      const results = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const entries = results.entries || results;
      const suiteMeta = results.suite || null;

      console.log(`  Suite: ${suiteId} (${Object.keys(entries).length} entries)${suiteMeta ? ` [${suiteMeta.unit}, ${suiteMeta.direction}]` : ''}`);

      updateManifest(suiteId, os, suiteMeta);
      appendDataPoint(suiteId, os, entries);
      ingested++;
    }
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\nDone. Ingested ${ingested} data point(s).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
