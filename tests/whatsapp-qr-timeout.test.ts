import { describe, expect, it } from 'vitest';

import {
  didQRCodeWaitTimeout,
  QR_CODE_WAIT_TIMEOUT_MS,
} from '../views/WhatsApp/QRCodeModal';

describe('WhatsApp QR wait timeout', () => {
  it('keeps waiting before the WhatsMeow startup deadline', () => {
    expect(
      didQRCodeWaitTimeout(1_000, 1_000 + QR_CODE_WAIT_TIMEOUT_MS - 1)
    ).toBe(false);
  });

  it('stops the spinner when WhatsMeow reaches the startup deadline', () => {
    expect(didQRCodeWaitTimeout(1_000, 1_000 + QR_CODE_WAIT_TIMEOUT_MS)).toBe(
      true
    );
  });
});
