-- AlterTable
ALTER TABLE "PartRequest" ADD COLUMN     "preferredSource" "SourceCountry",
ADD COLUMN     "priceDeliveryUsd" DECIMAL(10,2),
ADD COLUMN     "pricePartUsd" DECIMAL(10,2),
ADD COLUMN     "priceShippingUsd" DECIMAL(10,2),
ADD COLUMN     "priceTaxUsd" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "AdminLoginLog" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLoginLog_createdAt_idx" ON "AdminLoginLog"("createdAt");

-- Data backfill: quotes made before itemization keep their total as the
-- "part price" line item; the other components stay NULL so the customer
-- view doesn't render fabricated $0 shipping/tax rows for historical data.
UPDATE "PartRequest" SET "pricePartUsd" = "priceUsd" WHERE "priceUsd" IS NOT NULL;
