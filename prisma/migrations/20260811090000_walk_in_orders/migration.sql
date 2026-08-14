-- Walk-in orders: taken at the counter by an admin, for someone physically
-- present who never registers an account.
--
-- Additive and relaxing only. Every existing row is a web order and picks up
-- channel = 'WEB' from the default, so nothing needs backfilling. customerId
-- loses NOT NULL because a walk-in order has no User behind it; the schema
-- keeps ON DELETE RESTRICT on that relation rather than letting Prisma switch
-- a newly-optional relation to SET NULL, which would blank the customer out of
-- historical orders the first time an account was removed.

-- CreateEnum
CREATE TYPE "RequestChannel" AS ENUM ('WEB', 'WALK_IN');

-- AlterTable
ALTER TABLE "PartRequest" ADD COLUMN     "channel" "RequestChannel" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "walkInEmail" TEXT,
ADD COLUMN     "walkInName" TEXT,
ADD COLUMN     "walkInPhone" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;
