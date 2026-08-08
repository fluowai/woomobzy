export type WhiteLabelStatus = 'active' | 'suspended' | 'pending';

export interface WhiteLabel {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: WhiteLabelStatus;
  branding: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    emailSenderName?: string;
    supportEmail?: string;
    footerText?: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreditPackage {
  id: string;
  whiteLabelId: string;
  name: string;
  description?: string;
  creditAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
  validityDays?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  whiteLabelId: string;
  organizationId: string;
  teamId?: string;
  userId?: string;
  balance: number;
  reservedBalance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  walletId: string;
  type:
    | 'purchase'
    | 'credit'
    | 'reservation'
    | 'consumption'
    | 'release'
    | 'refund'
    | 'transfer'
    | 'expiration'
    | 'bonus'
    | 'adjustment'
    | 'chargeback';
  amount: number;
  currency: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  sourceWalletId?: string;
  targetWalletId?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface DocumensoEnvelope {
  id: string;
  secondaryId: string;
  externalId?: string;
  title: string;
  status: string;
  type: string;
  createdAt: string;
  completedAt?: string;
  recipients: DocumensoRecipient[];
  fields: DocumensoField[];
}

export interface DocumensoRecipient {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  signedAt?: string;
}

export interface DocumensoField {
  id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  recipientId?: string;
}

export interface DocumensoWebhookPayload {
  event: string;
  envelopeId: string;
  recipientId?: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface CreateEnvelopeInput {
  whiteLabelId: string;
  organizationId: string;
  teamId?: string;
  userId?: string;
  title: string;
  pdfUrl?: string;
  templateId?: string;
  recipients: Array<{
    email: string;
    name: string;
    role?: string;
    signingOrder?: number;
  }>;
  fields?: Array<{
    type: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    recipientEmail?: string;
    required?: boolean;
  }>;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface CreditReservation {
  id: string;
  walletId: string;
  envelopeId: string;
  amount: number;
  status: 'reserved' | 'confirmed' | 'released' | 'expired';
  expiresAt: string;
  createdAt: string;
}
