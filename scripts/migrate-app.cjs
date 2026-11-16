/* One-time, explicit migration. Never run as part of the normal page build.
 * Usage: node scripts/migrate-app.cjs --parser-bundle /path/to/babelBundle.js
 * Alternatively install @babel/parser and @babel/traverse in the development environment.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'app');
if (fs.existsSync(path.join(OUT, 'migration.json')) && !process.argv.includes('--overwrite-migration')) {
  throw new Error('Migration already exists. Edit app/ modules directly; normal HTML builds use app/scripts/build.mjs. Re-extraction would overwrite subsequent fixes.');
}
let parse, traverse;
const bundle = process.argv[process.argv.indexOf('--parser-bundle') + 1];
if (process.argv.includes('--parser-bundle')) {
  const babel = require(path.resolve(bundle));
  parse = code => babel.babelParse(code, 'analyzer.js', false);
  traverse = babel.traverse;
} else {
  parse = code => require('@babel/parser').parse(code, { sourceType: 'script' });
  traverse = require('@babel/traverse').default;
}
function write(file, text) {
  const dest = path.join(OUT, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text, 'utf8');
}
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m => !/\bsrc=/.test(m[1]));
let source = '', line = 1;
for (const m of scripts) {
  const at = html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length;
  source += '\n'.repeat(at - line) + m[2];
  line = source.split('\n').length;
}
const ast = parse(source);
let root;
traverse(ast, { Program(p) { root = p.scope; } });
const rootNames = Object.keys(root.bindings);
if (rootNames.includes('wbdContext')) throw new Error('Context name collision');
const declarationIds = new Set();
for (const n of ast.program.body) {
  if (n.type === 'FunctionDeclaration') declarationIds.add(n.id);
  if (n.type === 'VariableDeclaration') for (const d of n.declarations) {
    if (d.id.type !== 'Identifier') throw new Error('Top-level destructuring needs manual migration');
    declarationIds.add(d.id);
  }
}
// Rewrite by binding identity, never by text search: local variables and strings are untouched.
const edits = new Map();
const windowNames = new Set();
traverse(ast, {
  Identifier(p) {
    const name = p.node.name;
    if (declarationIds.has(p.node) || !root.bindings[name] || p.scope.getBinding(name) !== root.bindings[name]) return;
    if (!p.isReferencedIdentifier() && !p.isBindingIdentifier()) return;
    let value = `wbdContext.${name}`;
    if (p.parent.type === 'ObjectProperty' && p.parent.shorthand) {
      if (p.key === 'key') return;
      value = `${name}: ${value}`;
    }
    edits.set(p.node.start, { start:p.node.start, end:p.node.end, value });
  },
  AssignmentExpression(p) {
    const n = p.node.left;
    if (n.type === 'MemberExpression' && n.object.name === 'window' && !n.computed) windowNames.add(n.property.name);
  }
});
const replacements = [...edits.values()].sort((a,b) => b.start - a.start);
function slice(start, end) {
  let text = source.slice(start, end);
  for (const edit of replacements) if (edit.start >= start && edit.end <= end) {
    text = text.slice(0, edit.start-start) + edit.value + text.slice(edit.end-start);
  }
  return text;
}
// Boundaries are original source lines; AST statements remain indivisible.
const domains = [
  [0,'profiles'],[2176,'core-data'],[3176,'server-library'],[3695,'navigation-charts'],
  [3955,'home'],[4726,'pitcher'],[5852,'batter'],[7293,'player-cards'],
  [8123,'team-editor'],[9093,'pitch-maps'],[9445,'metrics'],[10049,'game-stats'],
  [11107,'team-analysis'],[12309,'team-visuals'],[13560,'comparison-awards'],
  [14290,'matchup'],[14964,'settings-changelog'],[15988,'insights-base'],
  [16859,'pitch-types'],[17422,'scout-data'],[18164,'scout-pitcher'],
  [19255,'scout-batter'],[20726,'defense'],[21944,'scout-report-ui'],
  [22831,'scout-pitcher-grades'],[23710,'scout-batter-grades'],[24323,'scout-strategy'],
  [25181,'report-tools'],[25528,'team-scout'],[25872,'game-report'],
  [27071,'team-ratings'],[28457,'records'],[28693,'league'],[29905,'profile-manager'],
  [30302,'team-builder'],[31397,'team-simulation'],[31946,'run-value-xout'],
  [32677,'export'],[34208,'shortcuts-fielding'],[34668,'lineup-form'],
  [35352,'game-by-game'],[35681,'data-dashboard'],[36000,'compatibility-patches']
].map(([start,name]) => ({start,name,register:[],initialize:[],symbols:[]}));
for (const n of ast.program.body) {
  const domain = domains.findLast(d => d.start <= n.loc.start.line);
  const note = `// Original index.html:${n.loc.start.line}\n`;
  if (n.type === 'FunctionDeclaration') {
    domain.register.push(note + `wbdContext.${n.id.name} = ` + slice(n.start,n.end) + ';');
    domain.symbols.push(n.id.name);
  } else if (n.type === 'VariableDeclaration') {
    domain.initialize.push(note + n.declarations.map(d => `wbdContext.${d.id.name} = ${d.init ? slice(d.init.start,d.init.end) : 'undefined'};`).join('\n'));
    domain.symbols.push(...n.declarations.map(d => d.id.name));
  } else {
    // Bootstrap owns asynchronous startup. Leave original data loading functions intact.
    if (source.slice(n.start,n.end).startsWith('initServerLibrary(false).then(')) continue;
    domain.initialize.push(note + slice(n.start,n.end));
  }
}
for (const d of domains) {
  write(`js/features/${d.name}.js`, `/** ${d.name}: migrated analysis and UI logic. Shared state is explicit in wbdContext. */\nexport function register(wbdContext) {\n${d.register.join('\n\n')}\n}\n\nexport function initialize(wbdContext) {\n${d.initialize.join('\n\n')}\n}\n`);
}
write('js/features/index.js', domains.map((d,i)=>`import * as feature${i} from './${d.name}.js';`).join('\n') + `\nexport const features = [${domains.map((d,i)=>`feature${i}`).join(', ')}];\n`);
write('js/core/symbols.js', `// Compatibility exports for existing inline HTML handlers and window-based extension hooks.\nexport const symbols = ${JSON.stringify([...new Set([...rootNames,...windowNames])].sort(),null,2)};\n`);
write('styles/analyzer.css', [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n'));

// Extract real page fragments using balanced div tags (including quoted > characters).
let body = html.slice(html.indexOf('<body>')+6, html.indexOf('<!-- 프로필 사진 매핑'));
const pages = [];
const starts = [...body.matchAll(/<div\s+class="page(?: active)?"\s+id="page-([^"]+)"[^>]*>/g)];
for (const m of starts) {
  const tags = /<\/?div\b(?:"[^"]*"|'[^']*'|[^'">])*>/g;
  tags.lastIndex=m.index;
  let depth=0,end;
  for(let t; (t=tags.exec(body));) {
    depth += t[0].startsWith('</') ? -1 : 1;
    if(depth===0){end=tags.lastIndex;break;}
  }
  if(!end)throw new Error(`Unclosed page ${m[1]}`);
  pages.push({id:m[1],start:m.index,end,html:body.slice(m.index,end)});
}
for(const p of [...pages].reverse()) body=body.slice(0,p.start)+(p===pages[0]?'<!-- PAGE_CONTENT -->':'')+body.slice(p.end);
for(const p of pages) write(`templates/pages/${p.id}.html`,p.html.replace('class="page"','class="page active"'));
write('templates/shell.html',body.trim()+'\n');
write('migration.json',JSON.stringify({source:'../index.html',sha256:crypto.createHash('sha256').update(html).digest('hex'),pages:pages.map(p=>p.id),modules:domains.map(d=>({name:d.name,symbols:d.symbols}))},null,2)+'\n');
console.log(`Migrated ${pages.length} pages, ${domains.length} modules, ${rootNames.length} shared bindings. Original untouched.`);
