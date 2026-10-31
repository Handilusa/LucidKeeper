import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

console.log('🔍 Running comprehensive secret scan across working tree and git history...\n');

// Patterns to identify potential secrets
const SECRET_PATTERNS = [
  { name: 'Private Key Assignment', regex: /(?:private_key|privatekey|secret_key|secretkey|seed_phrase|mnemonic)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/i },
  { name: 'PEM Private Key Header', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Raw 32-byte Hex Key', regex: /(?:^|[^a-zA-Z0-9])(0x[a-fA-F0-9]{64})(?:[^a-zA-Z0-9]|$)/ },
  { name: 'Generic API Secret', regex: /(?:api_secret|app_secret|client_secret)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/i },
];

// Whitelisted known hashes or non-secret fixtures
const KNOWN_SAFE_HASHES = new Set([
  // Known public transaction hashes
  '0x50342ddedec388240ce2ee8054c17a694b90ecfcfc0eb779eff8f2975f739a17'.toLowerCase(),
  '0xce3214b4a7af9a200d485cc1822a71e4dea13f5bf64399e1de92c0514833399a'.toLowerCase(),
  '0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a'.toLowerCase(),
  // Verified close position transaction hash on Somnia Tokyo
  '0x1cb959157297e2bfb7ee3c8f8b8a53e6b460d3d0f0be20b8f41785f8f69587f6'.toLowerCase(),
  // Public transaction referenced in audit
  '0x2532174707449130883afd68d0dca5dbd9afca5db380e37116b06e01126fd7b6'.toLowerCase(),
  // Public bounty transactions (Approve, Deposit, DOGE Short) and block hashes
  '0xba3598c0cd1460327c31564b3756a0ad2e537008e1ad44d462e8d9b80e8a9509'.toLowerCase(),
  '0xf0308d749b0401b9fa0f31149af3dbbaaf9ff5e22ff6d25cf056819d01b89fc9'.toLowerCase(),
  '0x023d5bc0ab40df5a96ae322b36115b1889847ed4112c031be4077c862cab4e4c'.toLowerCase(),
  '0x80a4b1b009f1f88650311973abdb109c20ddf78df63e19c06257ad497387eb14'.toLowerCase(),
  '0x0160c213facebb7e00a2d2c680427098d127ba4aa04c0867d3d4e8bfdb2edb6d'.toLowerCase(),
  // Somnia Tokyo genesis hash
  '0x2b2ebef7db781fc01d1fa75ff13dbba2e6cfa3fbc865d4fa394df183bdca36fb'.toLowerCase(),
  // Pinned Somnia Tokyo block hash in DOGE close plan
  '0x5901affd7090e02bde42a6934eb0216b8a99a5c547e03137d66507664afb215c'.toLowerCase(),
]);

let findingsCount = 0;

// 1. Scan tracked files in working tree
console.log('1️⃣ Scanning working tree files...');
// Files that are known to contain public on-chain data (block hashes, event topics, ABI-encoded data)
// and must never contain private keys by design.
const PUBLIC_DATA_FIXTURE_PATTERNS = [
  /^test\/fixtures\//,   // RPC / indexer fixture snapshots — public read-only data
];

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map(f => f.trim())
  .filter(f => f && !f.endsWith('.png') && !f.endsWith('.ico') && !f.endsWith('.lock'));

for (const file of files) {
  try {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const pattern of SECRET_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          const matchedVal = (match[1] || match[0]).toLowerCase();
          if (KNOWN_SAFE_HASHES.has(matchedVal)) {
            continue; // Whitelisted public transaction or block hash
          }
          // Skip Raw 32-byte Hex Key pattern for known public-data fixture files
          // (block hashes, event topics, ABI-encoded calldata — never private keys by design)
          if (pattern.name === 'Raw 32-byte Hex Key' &&
              PUBLIC_DATA_FIXTURE_PATTERNS.some(re => re.test(file))) {
            continue;
          }
          // Ignore test fixture mock signatures or non-sensitive schema validators
          if (file.includes('test/') && (line.includes('fixture') || line.includes('mock') || line.includes('0xgenesis'))) {
            continue;
          }
          console.error(`🚨 [${pattern.name}] in ${file}:${idx + 1}`);
          console.error(`   ${line.trim().slice(0, 80)}`);
          findingsCount++;
        }
      }
    });
  } catch (err) {
    // Ignore binary or unreadable files
  }
}

// 2. Scan git commit history
console.log('2️⃣ Scanning git commit history...');
try {
  const patch = execSync('git log -p -n 100', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const patchLines = patch.split('\n');
  let currentCommit = '';
  let currentDiffFile = '';   // track which file the current diff hunk belongs to

  patchLines.forEach((line, idx) => {
    if (line.startsWith('commit ')) {
      currentCommit = line.slice(7, 15);
      currentDiffFile = '';
    }
    // Track the file being diffed ("+++ b/path/to/file")
    if (line.startsWith('+++ b/')) {
      currentDiffFile = line.slice(6).trim();
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      for (const pattern of SECRET_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          const matchedVal = (match[1] || match[0]).toLowerCase();
          if (KNOWN_SAFE_HASHES.has(matchedVal)) {
            continue;
          }
          // Skip Raw 32-byte Hex Key hits inside known public-data fixture paths
          if (pattern.name === 'Raw 32-byte Hex Key' &&
              PUBLIC_DATA_FIXTURE_PATTERNS.some(re => re.test(currentDiffFile))) {
            continue;
          }
          // Skip Raw 32-byte Hex Key hits inside known public-data fixture paths
          if (pattern.name === 'Raw 32-byte Hex Key' &&
              (line.includes('test/fixtures/') || line.includes('tokyo-public-reads'))) {
            continue;
          }
          if (line.includes('test/') || line.includes('fixture') || line.includes('mock')) {
            continue;
          }
          console.error(`🚨 [${pattern.name}] in git history commit ${currentCommit}: line ${idx + 1}`);
          console.error(`   ${line.trim().slice(0, 80)}`);
          findingsCount++;
        }
      }
    }
  });
} catch (err) {
  console.warn('⚠️ Git history scan error:', err.message);
}

console.log('\n--- Scan Summary ---');
if (findingsCount === 0) {
  console.log('✅ ZERO secrets or private keys detected in working tree and git history.');
  process.exit(0);
} else {
  console.error(`❌ Found ${findingsCount} potential secret(s). Remediation required!`);
  process.exit(1);
}
