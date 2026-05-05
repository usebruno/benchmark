# Bruno Benchmarks

Performance tracking dashboard for [Bruno](https://github.com/usebruno/bruno).

## What is this?

A static site that visualizes benchmark results across commits. Tests run in Bruno's CI on Ubuntu, macOS, and Windows — results are ingested here and rendered as trend charts.

- **Dashboard** — trend charts per benchmark, all OS overlaid, switchable metrics (mean, median, p90, p99, etc.)
- **Docs** — how the system works, data format, and how to add new benchmarks
- **Ingestion** — fully autonomous script that discovers suites and OS from GitHub Actions artifacts

## Quick start

Serve locally:

```
python3 -m http.server 8090
```

Open `http://localhost:8090`.

## Ingesting data

The ingestion workflow only needs a source repo and commit SHA. It finds the workflow run, downloads artifacts, discovers suites from filenames, and updates the manifest automatically.

**Manual trigger:** Actions → Ingest Benchmark Results → Run workflow → provide repo and commit SHA.

**Automatic trigger:** Bruno's CI sends a `repository_dispatch` event with the repo and commit SHA.

## Structure

```
├── index.html                  # Dashboard
├── docs.html                   # Documentation
├── assets/
│   ├── style.css               # Shared styles (dark/light themes)
│   ├── app.js                  # Dashboard logic (ECharts)
│   ├── docs.css                # Docs page styles
│   └── icons.svg               # SVG sprite
├── data/
│   ├── manifest.json           # Auto-populated suite registry
│   └── {suite}/{os}.json       # Historical data (one per OS per suite)
├── scripts/
│   └── ingest.js               # Autonomous ingestion script
└── .github/workflows/
    └── ingest.yml              # Ingestion workflow
```

## Adding a new benchmark

1. Write `tests/benchmarks/{name}/{name}.bench.ts` in the Bruno repo
2. Push to `main` — results are uploaded as artifacts
3. Trigger ingestion with the commit SHA
4. The dashboard picks it up automatically

No manual config needed. The ingestion script auto-registers new suites in `manifest.json`.
