// @vitest-environment node
import { describe, it, expect } from 'vitest';

describe('CRM helpers - normalizePhone', () => {
  async function getNormalizePhone() {
    const mod = await import('../../server/api/crm/helpers.js');
    return mod.normalizePhone;
  }

  it('should normalize 11-digit phone to 55+phone', async () => {
    const normalizePhone = await getNormalizePhone();
    expect(normalizePhone('11999998888')).toBe('5511999998888');
  });

  it('should normalize 10-digit phone to 55+phone', async () => {
    const normalizePhone = await getNormalizePhone();
    expect(normalizePhone('1199999888')).toBe('551199999888');
  });

  it('should strip leading zeros', async () => {
    const normalizePhone = await getNormalizePhone();
    expect(normalizePhone('011999998888')).toBe('5511999998888');
  });

  it('should handle already-prefixed phone', async () => {
    const normalizePhone = await getNormalizePhone();
    expect(normalizePhone('5511999998888')).toBe('5511999998888');
  });
});

describe('CRM helpers - isValidBRPhone', () => {
  async function getIsValidBRPhone() {
    const mod = await import('../../server/api/crm/helpers.js');
    return mod.isValidBRPhone;
  }

  it('should return true for valid 13-digit BR phone', async () => {
    const isValidBRPhone = await getIsValidBRPhone();
    expect(isValidBRPhone('11999998888')).toBe(true);
  });

  it('should return true for valid 12-digit BR phone', async () => {
    const isValidBRPhone = await getIsValidBRPhone();
    expect(isValidBRPhone('1199999888')).toBe(true);
  });

  it('should return false for too short phone', async () => {
    const isValidBRPhone = await getIsValidBRPhone();
    expect(isValidBRPhone('1234')).toBe(false);
  });
});

describe('CRM helpers - isPlaceholderLeadName', () => {
  async function getIsPlaceholder() {
    const mod = await import('../../server/api/crm/helpers.js');
    return mod.isPlaceholderLeadName;
  }

  it('should detect placeholder names', async () => {
    const isPlaceholder = await getIsPlaceholder();
    expect(isPlaceholder('')).toBe(true);
    expect(isPlaceholder('~')).toBe(true);
    expect(isPlaceholder('me')).toBe(true);
    expect(isPlaceholder('contato sem telefone')).toBe(true);
    expect(isPlaceholder('5511999998888')).toBe(true);
  });

  it('should not flag real names', async () => {
    const isPlaceholder = await getIsPlaceholder();
    expect(isPlaceholder('Joao Silva')).toBe(false);
    expect(isPlaceholder('Maria')).toBe(false);
  });
});

describe('CRM helpers - isGroupChatJid', () => {
  async function getIsGroup() {
    const mod = await import('../../server/api/crm/helpers.js');
    return mod.isGroupChatJid;
  }

  it('should detect group JIDs', async () => {
    const isGroup = await getIsGroup();
    expect(isGroup('120363001@g.us')).toBe(true);
  });

  it('should not flag individual JIDs', async () => {
    const isGroup = await getIsGroup();
    expect(isGroup('5511999998888@s.whatsapp.net')).toBe(false);
  });
});

describe('CRM helpers - resolveLeadName', () => {
  async function getResolve() {
    const mod = await import('../../server/api/crm/helpers.js');
    return mod.resolveLeadName;
  }

  it('should return first valid name', async () => {
    const resolve = await getResolve();
    expect(resolve('Joao', 'Maria')).toBe('Joao');
  });

  it('should skip placeholders and return next valid name', async () => {
    const resolve = await getResolve();
    expect(resolve('', '~', 'Pedro')).toBe('Pedro');
  });

  it('should fallback to phone if all are placeholders', async () => {
    const resolve = await getResolve();
    expect(resolve('', '~', '5511999998888')).toBe('5511999998888');
  });

  it('should return default if no args', async () => {
    const resolve = await getResolve();
    expect(resolve()).toBe('Lead WhatsApp');
  });
});
