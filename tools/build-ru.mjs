import { parse } from 'node-html-parser';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const PAGES = ['index.html', 'case-lumery.html', 'case-aleria.html', 'case-bitronix.html', 'case-every-bali.html'];
const ATTRS = ['alt', 'aria-label', 'title', 'placeholder'];
const LOCAL = /^(assets\/|styles\.css|case\.css|script\.js|case\.js|particle-video\.js)/;
const norm = (s) => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const js = JSON.parse(readFileSync('i18n/ru/js.json', 'utf8'));
mkdirSync('ru', { recursive: true });
let missingTotal = 0;
for (const page of PAGES) {
  const dictPath = `i18n/ru/${page}.json`;
  if (!existsSync(dictPath)) { console.log(page, 'no dictionary yet — skipped'); continue; }
  const dict = JSON.parse(readFileSync(dictPath, 'utf8'));
  const missing = new Set();
  const lookup = (s) => { const k = norm(s); if (!k) return null; if (dict[k]) return dict[k]; if (js[k]) return js[k]; if (!/^[\d\s—–\-·+×%.,:/&↗→⊕©]+$/.test(k)) missing.add(k); return null; };
  const src = readFileSync(page, 'utf8'); const doctype = (src.match(/^\s*<!doctype[^>]*>/i) || [''])[0];
  const root = parse(src.slice(doctype.length), { comment: true });
  const walk = (n) => {
    if (n.nodeType === 3) {
      const raw = n.rawText; const tr = lookup(raw);
      if (tr) { const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0]; n.rawText = lead + esc(tr) + tail; }
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.rawTagName;
    if (tag === 'script') { const v = n.getAttribute('src'); if (v && LOCAL.test(v)) n.setAttribute('src', '../' + v); return; }
    if (tag === 'style' || tag === 'svg') return;
    for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const tr = lookup(v); if (tr) n.setAttribute(a, escAttr(tr)); } }
    if (tag === 'meta') { const v = n.getAttribute('content'); const isDesc = n.getAttribute('name') === 'description' || ['og:description', 'og:title'].includes(n.getAttribute('property')); if (v && isDesc) { const tr = lookup(v); if (tr) n.setAttribute('content', escAttr(tr)); } if (n.getAttribute('property') === 'og:locale') n.setAttribute('content', 'ru_RU'); }
    for (const a of ['src', 'href', 'poster', 'content']) { const v = n.getAttribute(a); if (v && LOCAL.test(v)) n.setAttribute(a, '../' + v); }
    const ss = n.getAttribute('srcset'); if (ss) n.setAttribute('srcset', ss.split(',').map((p) => p.trim().replace(/^(assets\/)/, '../$1')).join(', '));
    n.childNodes.forEach(walk);
  };
  walk(root);
  const html = root.querySelector('html'); html.setAttribute('lang', 'ru'); html.setAttribute('data-asset-base', '../');
  const head = root.querySelector('head');
  head.insertAdjacentHTML('beforeend', `\n    <link rel="alternate" hreflang="en" href="../${page}" />\n    <link rel="alternate" hreflang="ru" href="./${page}" />\n    <script>window.I18N = ${JSON.stringify(js)};</script>\n  `);
  // language switch: RU page points back to the EN twin
  const sw = root.querySelector('.lang-switch');
  if (sw) { sw.setAttribute('href', `../${page}`); sw.setAttribute('hreflang', 'en'); sw.setAttribute('lang', 'en'); sw.set_content('EN'); sw.setAttribute('aria-label', 'English version'); }
  const out = doctype + root.toString();
  writeFileSync(`ru/${page}`, out);
  missingTotal += missing.size;
  console.log(page, '→ ru/', missing.size ? `untranslated ${missing.size}: ${[...missing].slice(0, 5).join(' | ')}` : 'all strings translated');
}
process.exitCode = 0;
