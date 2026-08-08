import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ensureInstallationIdentity,
  getInstallationStatePath,
  loadInstallationState,
  saveInstallationState,
} from '../lib/licensing/state.js';

const ORIGINAL_ENV = { ...process.env };
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imobzy-licensing-'));

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function setTempStatePath(fileName = 'state.json') {
  process.env.INSTALLATION_STATE_PATH = path.join(tempDir, fileName);
}

describe('installation state', () => {
  it('usa INSTALLATION_STATE_PATH configurado', () => {
    setTempStatePath('custom.json');
    expect(getInstallationStatePath()).toContain('custom.json');
  });

  it('retorna null quando não existe estado', () => {
    setTempStatePath('missing.json');
    expect(loadInstallationState()).toBeNull();
  });

  it('cria identidade persistente e reutiliza', () => {
    setTempStatePath('identity.json');
    const first = ensureInstallationIdentity();
    expect(first.created).toBe(true);
    expect(first.state.installationId).toBeTruthy();
    expect(first.state.publicKeyPem).toContain('PUBLIC KEY');
    expect(first.state.privateKeyPem).toContain('PRIVATE KEY');
    expect(first.state.serverFingerprint).toBeTruthy();

    const second = ensureInstallationIdentity();
    expect(second.created).toBe(false);
    expect(second.state.installationId).toBe(first.state.installationId);
    expect(second.state.publicKeyPem).toBe(first.state.publicKeyPem);
  });

  it('persiste e recupera campos arbitrários', () => {
    setTempStatePath('custom-field.json');
    ensureInstallationIdentity();
    const state = loadInstallationState();
    state.activatedLicenseKey = 'WOLK1.test';
    saveInstallationState(state);
    const reloaded = loadInstallationState();
    expect(reloaded.activatedLicenseKey).toBe('WOLK1.test');
    expect(reloaded.installationId).toBe(state.installationId);
  });
});
