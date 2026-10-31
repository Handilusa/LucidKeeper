import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

// Audit metadata only. No credentials/environment files or forced upgrades.
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const directory = new URL(`../.git/lucidkeeper-audit/dependencies-${stamp}/`, import.meta.url);
await mkdir(directory, { recursive: true });
const reports = {};
for (const [name, args] of [['all', ['audit', '--json']], ['runtime', ['audit', '--omit=dev', '--json']]]) {
  const run = process.platform === 'win32'
    ? spawnSync(`npm ${args.join(' ')}`, { shell: true, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 })
    : spawnSync('npm', args, { encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  if (run.error || ![0, 1].includes(run.status)) throw new Error(`Audit ${name} could not complete`);
  const report = JSON.parse(run.stdout);
  if (!report.vulnerabilities || report.error) throw new Error(`Audit ${name} returned no usable advisory report`);
  reports[name] = report;
  await writeFile(new URL(`${name}.json`, directory), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
const runtimeNames = Object.keys(reports.runtime.vulnerabilities).sort();
const devOnly = Object.keys(reports.all.vulnerabilities).filter(name => !runtimeNames.includes(name)).sort();
const advisories = [...new Set(Object.values(reports.all.vulnerabilities).flatMap(v => v.via.filter(x => typeof x === 'object').map(x => x.url)))];
const summary = { observedAt: new Date().toISOString(), directory: directory.pathname, all: reports.all.metadata.vulnerabilities, runtime: reports.runtime.metadata.vulnerabilities, runtimeNames, devOnly, advisories };
await writeFile(new URL('summary.json', directory), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(summary, null, 2));
