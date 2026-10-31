import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Publication-only text review. Never enumerate ignored directories, read credential
// files, inspect key stores, print candidate values or invoke transaction tooling.
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const forbidden = /(?:^|\/)(?:\.env[^/]*|\.npmrc|\.netrc|\.pypirc|AGENTS\.md|CODEX_MEMORY\.md|credentials[^/]*|private[^/]*\.json|id_(?:rsa|ed25519|ecdsa|dsa)[^/]*|secrets|keys|keystores?|unsigned|signed|signing|handoffs|prepared-[^/]*\.json|node_modules|dist|\.opencode|\.codex|\.agents)(?:\/|$)|\.(?:key|pem|keystore|p12|pfx|raw|signed|secret)$/i;
const issues = files.filter(file => forbidden.test(file)).map(file => ({ file, kind: 'forbidden published path; content not read' }));
const patterns = [
  ['credential assignment', /(?:private_key|privateKey|secret_key|seed_phrase|mnemonic|client_secret|api_secret)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/],
  ['private-key header', /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/],
  ['GitHub token shape', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
];
for (const file of files) {
  if (forbidden.test(file) || !/\.(?:md|json|[cm]?js|tsx?|css|html|ya?ml)$/.test(file) || !existsSync(file)) continue;
  if (!lstatSync(file).isFile()) { issues.push({ file, kind: 'non-regular publication text; content not read' }); continue; }
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => patterns.forEach(([kind, pattern]) => {
    if (pattern.test(line)) issues.push({ file, line: index + 1, kind }); // Values never logged.
  }));
}
const documents = ['README.md', 'STATUS.md', 'STATUS_HISTORY.md', 'docs/DEPLOYMENT.md', 'docs/PRE_PUSH_AUDIT.md', 'docs/SECURITY_NOTES.md', 'docs/SCALABILITY.md', 'docs/MANUAL_QA.md', 'docs/DISCOVERIES.md', 'docs/PORTFOLIO_DATA.md', 'docs/OFFLINE_SIGNING.md', 'docs/REQUIREMENTS.md', 'docs/LANDING_PROFILE_QUALITY.md'];
const tracked = new Set(files);
let localLinks = 0;
for (const file of documents) {
  if (!existsSync(file)) { issues.push({ file, kind: 'missing release document' }); continue; }
  if (!tracked.has(file)) { issues.push({ file, kind: 'release document not staged/tracked; content not read' }); continue; }
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
    localLinks++;
    const resolved = path.resolve(path.dirname(file), target);
    const relative = path.relative(process.cwd(), resolved).split(path.sep).join('/');
    if (relative.startsWith('../') || path.isAbsolute(relative) || !tracked.has(relative) || !existsSync(resolved)) issues.push({ file, kind: 'local link missing from publication', target });
  }
}
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
if (config.outputDirectory !== 'dist' || config.buildCommand !== 'npm run build') issues.push({ kind: 'unexpected static deployment configuration' });
if (!config.rewrites.some(rule => rule.destination === '/index.html')) issues.push({ kind: 'missing SPA fallback' });
const report = { observedAt: new Date().toISOString(), branch: execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), trackedPaths: files.length, documents: documents.length, localLinks, issues, boundary: 'tracked publication text/path and local-link destination checks only; not anchor verification, ignored files, full Git history, entropy scanning or security certification' };
mkdirSync('.git/lucidkeeper-audit', { recursive: true });
writeFileSync('.git/lucidkeeper-audit/release-publication.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exitCode = 1;
