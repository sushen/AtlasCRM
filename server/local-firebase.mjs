import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { rmSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { IntegrationError } from './config.mjs';

export async function prepareLocalFirebase(projectId, env = process.env) {
  let directory, credentialPath;
  const cleanup = () => {
    if (credentialPath) { try { rmSync(credentialPath, { force: true }); } catch {} }
    if (directory) { try { rmdirSync(directory); } catch {} }
  };
  try {
    if (!env.GOOGLE_APPLICATION_CREDENTIALS) {
      if (process.platform !== 'win32' || !env.APPDATA || !env.LOCALAPPDATA) {
        throw new IntegrationError('firebase_cli_login_unavailable');
      }
      let account, api;
      try {
        const require = createRequire(import.meta.url);
        const cliRoot = join(env.APPDATA, 'npm/node_modules/firebase-tools/lib');
        const { configstore } = require(join(cliRoot, 'configstore.js'));
        api = require(join(cliRoot, 'api.js'));
        const selected = configstore.get('activeAccounts')?.[process.cwd()];
        const accounts = [{ user: configstore.get('user'), tokens: configstore.get('tokens') }, ...(configstore.get('additionalAccounts') || [])];
        account = selected ? accounts.find(item => item.user?.email === selected) : accounts[0];
      } catch { throw new IntegrationError('firebase_cli_login_unavailable'); }
      if (!account?.tokens?.refresh_token) throw new IntegrationError('firebase_cli_login_unavailable');
      try {
        directory = join(env.LOCALAPPDATA, 'AtlasCRM/runtime', randomUUID());
        await mkdir(directory, { recursive: true });
        execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
          fileURLToPath(new URL('../scripts/private-runtime.ps1', import.meta.url)), '-Directory', directory],
        { stdio: 'pipe', windowsHide: true });
        credentialPath = join(directory, 'adc.json');
        await writeFile(credentialPath, JSON.stringify({ type: 'authorized_user', client_id: api.clientId(),
          client_secret: api.clientSecret(), refresh_token: account.tokens.refresh_token, quota_project_id: projectId }), { mode: 0o600 });
        env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
      } catch { throw new IntegrationError('firebase_credential_initialization_failed'); }
    }
    if (!env.GOOGLE_CLOUD_PROJECT) env.GOOGLE_CLOUD_PROJECT = projectId;
    if (!env.GOOGLE_CLOUD_QUOTA_PROJECT) env.GOOGLE_CLOUD_QUOTA_PROJECT = projectId;
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}
