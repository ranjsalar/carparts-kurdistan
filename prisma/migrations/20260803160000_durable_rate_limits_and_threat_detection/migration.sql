-- Durable rate-limit counters + detected attack patterns.
-- Purely additive: two new tables, no changes to existing data.

-- CreateTable
CREATE TABLE "RateCounter" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCounter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "observed" INTEGER NOT NULL,
    "detail" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateCounter_resetAt_idx" ON "RateCounter"("resetAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_acknowledgedAt_createdAt_idx" ON "SecurityEvent"("acknowledgedAt", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_kind_ip_acknowledgedAt_idx" ON "SecurityEvent"("kind", "ip", "acknowledgedAt");
