import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { routes, pageFile } from '../js/core/routes.js';
const root = new URL('../', import.meta.url);
const shell = await readFile(new URL('templates/shell.html',root),'utf8');
for(const [page,title] of Object.entries(routes)) {
  const fragment = await readFile(new URL(`templates/pages/${page}.html`,root),'utf8');
  let body = shell.replace('<!-- PAGE_CONTENT -->',fragment);
  // Real anchors: open in new tab, copy link and browser history work natively.
  body = body.replace(/<button\b([^>]*?)\sonclick="(?:showPage|navMobile)\('([^']+)'\)"([^>]*)>([\s\S]*?)<\/button>/g,
    (all,before,target,after,label) => Object.hasOwn(routes,target)
      ? `<a${before} href="app/${pageFile(target)}" data-route="${target}"${after}>${label}</a>` : all);
  const html = `<!doctype html>
<html lang="ko" data-page="${page}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <base href="../">
  <title>${title} · WBD Baseball Analyzer</title>
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="app/styles/analyzer.css">
  <link rel="stylesheet" href="app/styles/pages.css">
  <script type="module" src="app/js/bootstrap.js"></script>
</head>
<body>
  <div id="boot-status" role="status" aria-live="polite">분석기 준비 중…</div>
  <noscript>분석기를 사용하려면 JavaScript를 켜 주세요.</noscript>
${body}
</body>
</html>\n`;
  await writeFile(new URL(pageFile(page),root),html);
}
console.log(`Built ${Object.keys(routes).length} pages in ${fileURLToPath(root)}`);
