import { parse } from 'node-html-parser';
import { readFileSync, writeFileSync } from 'node:fs';
const PAGES = ['index.html', 'case-lumery.html', 'case-aleria.html', 'case-bitronix.html', 'case-every-bali.html'];
const SKIP = new Set(['script', 'style', 'svg', 'noscript']);
const ATTRS = ['alt', 'aria-label', 'title', 'placeholder', 'content'];
const out = {};
for (const page of PAGES) {
  const root = parse(readFileSync(page, 'utf8'));
  const seen = new Map();
  const add = (s, where) => { s = s.replace(/\s+/g, ' ').trim(); if (!s || /^[\d\s—–\-·+×%.,:/&↗→⊕©]+$/.test(s)) return; if (!seen.has(s)) seen.set(s, where); };
  const walk = (n) => {
    if (n.nodeType === 3) { add(n.rawText.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' '), n.parentNode?.rawTagName); return; }
    if (n.nodeType !== 1) return;
    if (SKIP.has(n.rawTagName)) return;
    for (const a of ATTRS) { const v = n.getAttribute(a); if (v && (a !== 'content' || n.getAttribute('name') === 'description' || (n.getAttribute('property') || '').startsWith('og:'))) add(v, `@${a}`); }
    n.childNodes.forEach(walk);
  };
  walk(root);
  out[page] = Object.fromEntries([...seen].map(([s, w]) => [s, '']));
  console.log(page, seen.size, 'strings');
}
writeFileSync('i18n/en.json', JSON.stringify(out, null, 2));
// JS-side strings
const js = {};
for (const f of ['script.js', 'case.js']) {
  const src = readFileSync(f, 'utf8');
  const re = /(?:title|lead|body|linkLabel|kind|name|features|path|stage|description|alt|label|note|caption):\s*"((?:[^"\\]|\\.)*)"/g;
  let m; while ((m = re.exec(src))) js[m[1]] = '';
  for (const m2 of src.matchAll(/\[\s*"([^"]+)",\s*"([^"]+)"\s*\]/g)) { js[m2[1]] = ''; js[m2[2]] = ''; }
}
for (const k of Object.keys(js)) if (/^assets\//.test(k) || /^[\d\s—–\-·+×%.,:/&↗→⊕]+$/.test(k)) delete js[k];
writeFileSync('i18n/en-js.json', JSON.stringify(js, null, 2));
console.log('js strings', Object.keys(js).length);
