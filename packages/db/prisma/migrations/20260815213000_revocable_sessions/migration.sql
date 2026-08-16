-- Revocable server-side sessions for passwordless authentication.
CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "Session" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "Session" FROM authenticated;
  END IF;
END
$$;

-- Financial invariants: database-level defense against sign inversion and
-- invalid negative reservation states. balanceCredits may become negative
-- after a legitimate refund/chargeback and therefore is intentionally not
-- constrained to >= 0.
ALTER TABLE "WalletAccount"
  ADD CONSTRAINT "WalletAccount_reservedCredits_nonnegative" CHECK ("reservedCredits" >= 0),
  ADD CONSTRAINT "WalletAccount_version_nonnegative" CHECK ("version" >= 0);

ALTER TABLE "CreditPack"
  ADD CONSTRAINT "CreditPack_credits_positive" CHECK ("credits" > 0),
  ADD CONSTRAINT "CreditPack_priceCents_positive" CHECK ("priceCents" > 0);

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amountCents_positive" CHECK ("amountCents" > 0),
  ADD CONSTRAINT "Payment_credits_positive" CHECK ("credits" > 0);

ALTER TABLE "CallOrder"
  ADD CONSTRAINT "CallOrder_creditCost_positive" CHECK ("creditCost" > 0),
  ADD CONSTRAINT "CallOrder_reservedCredits_nonnegative" CHECK ("reservedCredits" >= 0);

ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_reservedAfter_nonnegative" CHECK ("reservedAfter" >= 0),
  ADD CONSTRAINT "LedgerEntry_amount_sign_by_type" CHECK (
    ("type" = 'PURCHASE' AND "amountCredits" > 0) OR
    ("type" = 'CALL_RESERVE' AND "amountCredits" < 0) OR
    ("type" = 'CALL_RELEASE' AND "amountCredits" > 0) OR
    ("type" = 'CALL_CAPTURE' AND "amountCredits" = 0) OR
    ("type" = 'ADJUSTMENT' AND "amountCredits" <> 0) OR
    ("type" = 'REFUND' AND "amountCredits" < 0) OR
    ("type" = 'CHARGEBACK' AND "amountCredits" < 0)
  );

ALTER TABLE "Script"
  ADD CONSTRAINT "Script_creditCost_positive" CHECK ("creditCost" > 0),
  ADD CONSTRAINT "Script_durationSeconds_positive" CHECK ("durationSeconds" > 0);
