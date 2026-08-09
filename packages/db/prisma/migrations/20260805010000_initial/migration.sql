-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "CallStatus" AS ENUM ('VALIDATING', 'CREDIT_RESERVED', 'QUEUED', 'DIALING', 'RINGING', 'ANSWERED', 'RECORDING_PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED', 'REFUNDED', 'EXPIRED');
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MERCADOPAGO', 'MANUAL');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'REFUNDED', 'CHARGEBACK');
CREATE TYPE "LedgerType" AS ENUM ('PURCHASE', 'CALL_RESERVE', 'CALL_RELEASE', 'CALL_CAPTURE', 'ADJUSTMENT', 'REFUND', 'CHARGEBACK');
CREATE TYPE "WebhookProvider" AS ENUM ('STRIPE', 'MERCADOPAGO', 'TWILIO', 'VONAGE');

-- CreateTable
CREATE TABLE "AuthCode" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Consent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balanceCredits" INTEGER NOT NULL DEFAULT 0,
  "reservedCredits" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" "LedgerType" NOT NULL,
  "amountCredits" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reservedAfter" INTEGER NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Script" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "voiceLocale" TEXT NOT NULL DEFAULT 'pt-BR',
  "voiceName" TEXT,
  "creditCost" INTEGER NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "accent" TEXT NOT NULL DEFAULT 'violet',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditPack" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "stripePriceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "creditPackId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "credits" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "providerCheckoutId" TEXT,
  "rawStatus" TEXT,
  "metadata" JSONB,
  "approvedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallOrder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scriptId" TEXT NOT NULL,
  "status" "CallStatus" NOT NULL DEFAULT 'VALIDATING',
  "recipientPhoneEncrypted" TEXT NOT NULL,
  "recipientPhoneHash" TEXT NOT NULL,
  "recipientLabel" TEXT,
  "consentConfirmedAt" TIMESTAMP(3) NOT NULL,
  "recordingConsentAt" TIMESTAMP(3),
  "creditCost" INTEGER NOT NULL,
  "reservedCredits" INTEGER NOT NULL DEFAULT 0,
  "telephonyProvider" TEXT NOT NULL,
  "providerCallId" TEXT,
  "providerConversationId" TEXT,
  "voiceAssetUrl" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "answeredAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CallOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallEvent" (
  "id" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "providerEventId" TEXT,
  "status" "CallStatus" NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CallEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Recording" (
  "id" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerRecordingId" TEXT,
  "providerDownloadUrlEncrypted" TEXT,
  "storageKey" TEXT,
  "durationSeconds" INTEGER,
  "contentType" TEXT,
  "sha256" TEXT,
  "expiresAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Suppression" (
  "id" TEXT NOT NULL,
  "recipientPhoneHash" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Suppression_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "WebhookProvider" NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "signatureValid" BOOLEAN NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "userId" TEXT,
  "requestHash" TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitEvent" (
  "id" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "subjectHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "actorType" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "ipHash" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "WalletAccount_userId_key" ON "WalletAccount"("userId");
CREATE UNIQUE INDEX "LedgerEntry_type_referenceType_referenceId_key" ON "LedgerEntry"("type", "referenceType", "referenceId");
CREATE UNIQUE INDEX "Script_slug_key" ON "Script"("slug");
CREATE UNIQUE INDEX "CreditPack_code_key" ON "CreditPack"("code");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE UNIQUE INDEX "Payment_providerCheckoutId_key" ON "Payment"("providerCheckoutId");
CREATE UNIQUE INDEX "CallOrder_providerCallId_key" ON "CallOrder"("providerCallId");
CREATE UNIQUE INDEX "CallOrder_providerConversationId_key" ON "CallOrder"("providerConversationId");
CREATE UNIQUE INDEX "CallOrder_idempotencyKey_key" ON "CallOrder"("idempotencyKey");
CREATE UNIQUE INDEX "CallEvent_callId_providerEventId_key" ON "CallEvent"("callId", "providerEventId");
CREATE UNIQUE INDEX "Recording_callId_key" ON "Recording"("callId");
CREATE UNIQUE INDEX "Recording_providerRecordingId_key" ON "Recording"("providerRecordingId");
CREATE UNIQUE INDEX "Suppression_recipientPhoneHash_key" ON "Suppression"("recipientPhoneHash");
CREATE UNIQUE INDEX "WebhookEvent_provider_externalEventId_key" ON "WebhookEvent"("provider", "externalEventId");
CREATE UNIQUE INDEX "IdempotencyRecord_scope_key_key" ON "IdempotencyRecord"("scope", "key");

-- Secondary indexes
CREATE INDEX "AuthCode_email_createdAt_idx" ON "AuthCode"("email", "createdAt");
CREATE INDEX "AuthCode_expiresAt_idx" ON "AuthCode"("expiresAt");
CREATE INDEX "Consent_userId_type_idx" ON "Consent"("userId", "type");
CREATE INDEX "LedgerEntry_walletId_createdAt_idx" ON "LedgerEntry"("walletId", "createdAt");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "CallOrder_userId_createdAt_idx" ON "CallOrder"("userId", "createdAt");
CREATE INDEX "CallOrder_recipientPhoneHash_createdAt_idx" ON "CallOrder"("recipientPhoneHash", "createdAt");
CREATE INDEX "CallOrder_status_createdAt_idx" ON "CallOrder"("status", "createdAt");
CREATE INDEX "CallEvent_callId_createdAt_idx" ON "CallEvent"("callId", "createdAt");
CREATE INDEX "WebhookEvent_provider_processedAt_idx" ON "WebhookEvent"("provider", "processedAt");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");
CREATE INDEX "RateLimitEvent_bucket_subjectHash_createdAt_idx" ON "RateLimitEvent"("bucket", "subjectHash", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- Foreign keys
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "WalletAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_creditPackId_fkey" FOREIGN KEY ("creditPackId") REFERENCES "CreditPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CallOrder" ADD CONSTRAINT "CallOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CallOrder" ADD CONSTRAINT "CallOrder_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CallEvent" ADD CONSTRAINT "CallEvent_callId_fkey" FOREIGN KEY ("callId") REFERENCES "CallOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_callId_fkey" FOREIGN KEY ("callId") REFERENCES "CallOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Defense in depth for Supabase Data API: backend access remains through the database owner/service connection.
ALTER TABLE "AuthCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Script" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditPack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recording" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suppression" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
  END IF;
END
$$;
