import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { generateKeyPair, sha256Hex } from './crypto.js';

/**
 * Estado persistente da instalação.
 * Guarda a identidade da instalação (id + par de chaves Ed25519 local),
 * fingerprint de servidor, chave de licença ativada e cache offline assinado.
 *
 * O caminho é configurável via INSTALLATION_STATE_PATH. Em produção o estado
 * deve viver em um volume persistente (nunca dentro da imagem).
 */

export function getInstallationStatePath() {
  if (process.env.INSTALLATION_STATE_PATH) {
    return process.env.INSTALLATION_STATE_PATH;
  }
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? '/var/lib/imobzy/state.json' : '.licensing/state.json';
}

export function loadInstallationState() {
  try {
    const raw = fs.readFileSync(getInstallationStatePath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveInstallationState(state) {
  const filePath = getInstallationStatePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Garante que a instalação possua identidade persistida:
 * installationId (UUID v4) + par de chaves Ed25519 + fingerprint de servidor.
 */
export function ensureInstallationIdentity(state) {
  const current = state || loadInstallationState() || {};
  if (
    current.installationId &&
    current.publicKeyPem &&
    current.privateKeyPem &&
    current.serverFingerprint
  ) {
    return { state: current, created: false };
  }

  const keyPair = generateKeyPair();
  const serverFingerprint = sha256Hex(
    `${process.env.HOSTNAME || ''}:${process.env.INSTALLATION_STATE_PATH || 'default'}`
  ).slice(0, 24);

  const next = {
    ...current,
    installationId: current.installationId || randomUUID(),
    publicKeyPem: current.publicKeyPem || keyPair.publicKeyPem,
    privateKeyPem: current.privateKeyPem || keyPair.privateKeyPem,
    serverFingerprint: current.serverFingerprint || serverFingerprint,
    createdAt: current.createdAt || new Date().toISOString(),
  };

  saveInstallationState(next);
  return { state: next, created: !current.installationId };
}
