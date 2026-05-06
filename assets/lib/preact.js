export { h, render } from 'https://esm.sh/preact@10';
export { useState, useEffect, useRef, useMemo } from 'https://esm.sh/preact@10/hooks';
export { default as htm } from 'https://esm.sh/htm@3';

import { h } from 'https://esm.sh/preact@10';
import htm from 'https://esm.sh/htm@3';

export const html = htm.bind(h);
