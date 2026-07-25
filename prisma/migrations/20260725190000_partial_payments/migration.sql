-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED');

-- Drop legacy single-payment columns. The old lump paymentMethod/paymentProofUrl
-- flow is replaced by the Payment table (a request can now be settled across
-- multiple payments). These were nulled before this migration ran.
ALTER TABLE "PartRequest" DROP COLUMN "paymentMethod",
DROP COLUMN "paymentProofUrl";

-- Replace the PaymentMethod enum. After the column drops above nothing
-- references the old type, so it is recreated outright with the new values.
DROP TYPE "PaymentMethod";
CREATE TYPE "PaymentMethod" AS ENUM ('FIB', 'FASTPAY', 'QICARD', 'CASH_ON_DELIVERY');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "senderAccountName" TEXT,
    "senderPhone" TEXT,
    "proofUrl" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "adminNote" TEXT,
    "confirmedByAdminId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceivingAccount" (
    "method" "PaymentMethod" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumberOrPhone" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReceivingAccount_pkey" PRIMARY KEY ("method")
);

-- CreateIndex
CREATE INDEX "Payment_requestId_idx" ON "Payment"("requestId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_confirmedByAdminId_fkey" FOREIGN KEY ("confirmedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
