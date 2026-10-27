import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env.local');
const configPath = path.join(root, '.convex/local/default/config.json');

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

const fileEnv = readEnvFile(envPath);
const deployment = process.env.CONVEX_DEPLOYMENT ?? fileEnv.CONVEX_DEPLOYMENT ?? '';
const isLocal = deployment.startsWith('anonymous:') || deployment.startsWith('local:');

const args = ['convex', 'dev', ...process.argv.slice(2)];

// The CLI checks for the latest backend release before starting. On slow or
// restricted networks that check can time out even though a working backend is
// already installed. Pin the configured local version so dev startup stays
// offline-friendly.
if (isLocal && existsSync(configPath)) {
  try {
    const { backendVersion } = JSON.parse(readFileSync(configPath, 'utf8'));
    if (backendVersion) args.push('--local-backend-version', backendVersion);
  } catch {
    // Fall back to the CLI's normal version resolution.
  }
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(command, args, { stdio: 'inherit' });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
