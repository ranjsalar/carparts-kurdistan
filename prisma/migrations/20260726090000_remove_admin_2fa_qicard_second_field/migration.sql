-- Qi Card is identified by both a card number and a registered phone, and the
-- customer needs both to send money. Stored as a second optional field so the
-- two values can be displayed as separate labelled rows rather than one string.
ALTER TABLE "PaymentReceivingAccount" ADD COLUMN     "accountNumberOrPhone2" TEXT;

-- Admin two-factor authentication removed: admin login is email + password,
-- still protected by rate limiting, account lockout and the login audit trail.
ALTER TABLE "User" DROP COLUMN "totpEnabled",
DROP COLUMN "totpSecret";
