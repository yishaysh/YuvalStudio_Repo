import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('❌ Bundle audit failed: dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const TARGET_EXTENSIONS = new Set(['.js', '.mjs', '.css', '.html', '.map', '.json']);

const FORBIDDEN_PATTERNS = [
  { name: 'Literal client password comparison (2007)', regex: /['"`]2007['"`]/ },
  { name: 'Admin password variable/comparison', regex: /(?:ADMIN_PASSWORD|adminPassword|password\s*===?\s*['"`])/i },
  { name: 'Neon database hostname', regex: /neon\.tech/i },
  { name: 'PostgreSQL connection URI', regex: /postgres(?:ql)?:\/\//i },
  { name: 'Exposed VITE_NEON env reference', regex: /VITE_NEON/ },
  { name: 'Exposed GEMINI API key var', regex: /(?:VITE_)?GEMINI_API_KEY/ },
  { name: 'Exposed Telegram Bot Token var', regex: /TELEGRAM_BOT_TOKEN/ },
  { name: 'Live Telegram Bot Token literal', regex: /\b\d{8,12}:AA[A-Za-z0-9_-]{30,}\b/ },
  { name: 'Exposed Email SMTP password var', regex: /EMAIL_PASS/ },
  { name: 'Legacy leaked token/password fragment', regex: /feYh79/ },
  { name: 'SESSION_SECRET reference in client bundle', regex: /SESSION_SECRET/ },
];

function collectFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (TARGET_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = collectFiles(distDir);
const findings = [];

for (const file of files) {
  const rel = path.relative(rootDir, file);
  const content = fs.readFileSync(file, 'utf8');
  for (const rule of FORBIDDEN_PATTERNS) {
    const match = content.match(rule.regex);
    if (match) {
      findings.push({
        file: rel,
        rule: rule.name,
        sample: match[0],
      });
    }
  }
}

console.log(`Scanned ${files.length} build artifact files in dist/.`);

if (findings.length > 0) {
  console.error('❌ Bundle secret audit FAILED:');
  for (const f of findings) {
    console.error(`  - [${f.file}] ${f.rule} (matched: ${f.sample})`);
  }
  process.exit(1);
}

console.log('✅ Bundle secret audit PASSED: zero client passwords, DB URIs, or server secrets found in dist/.');
