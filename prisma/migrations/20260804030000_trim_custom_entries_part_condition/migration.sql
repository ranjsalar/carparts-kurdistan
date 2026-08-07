-- Trim level, "Other - not listed" free-text fallbacks, and body-panel
-- condition.
--
-- Purely additive and relaxing: one new table, new nullable columns, and four
-- NOT NULL constraints dropped. No existing row changes. Requests created
-- before this all have brandId/carModelId/yearRangeId/partId set, so the
-- relaxation is invisible to them.
--
-- The existing PartRequest foreign keys keep ON DELETE RESTRICT. Prisma would
-- default a newly-optional relation to SET NULL, which would blank the brand
-- out of historical requests when taxonomy is tidied up; the schema overrides
-- that explicitly.


-- CreateEnum
CREATE TYPE "PartCondition" AS ENUM ('ORIGINAL_TAKE_OFF', 'ORIGINAL_USED', 'TAKE_OFF_BLACK_GRADE');

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "conditionApplies" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PartRequest" ADD COLUMN     "partCondition" "PartCondition",
ADD COLUMN     "rawBrandText" TEXT,
ADD COLUMN     "rawModelText" TEXT,
ADD COLUMN     "rawPartText" TEXT,
ADD COLUMN     "rawTrimText" TEXT,
ADD COLUMN     "rawYearText" TEXT,
ADD COLUMN     "trimId" TEXT,
ALTER COLUMN "brandId" DROP NOT NULL,
ALTER COLUMN "carModelId" DROP NOT NULL,
ALTER COLUMN "yearRangeId" DROP NOT NULL,
ALTER COLUMN "partId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Trim" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carModelId" TEXT NOT NULL,

    CONSTRAINT "Trim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trim_carModelId_name_key" ON "Trim"("carModelId", "name");

-- AddForeignKey
ALTER TABLE "Trim" ADD CONSTRAINT "Trim_carModelId_fkey" FOREIGN KEY ("carModelId") REFERENCES "CarModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_trimId_fkey" FOREIGN KEY ("trimId") REFERENCES "Trim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

