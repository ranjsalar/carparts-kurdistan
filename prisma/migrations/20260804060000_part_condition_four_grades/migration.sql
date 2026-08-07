-- Part condition: correct the third grade and add a fourth.
--
-- TAKE_OFF_BLACK_GRADE was mislabelled. It never meant a salvaged part — it is
-- a brand-new factory panel supplied in raw black primer, which the customer
-- has painted locally. Renaming rather than recreating the type, for two
-- reasons:
--
--   * Prisma's default for an enum change is CREATE TYPE _new + ALTER COLUMN
--     ... USING (value::text::new_type) + DROP TYPE. That cast throws on any
--     row still holding the old value, so the migration would fail on a
--     production database that had taken even one such request. There are
--     none right now, but the window between writing this and deploying is
--     exactly when one could arrive.
--   * RENAME VALUE carries existing rows across intact, and the mapping is
--     semantically right: those rows always meant "new, unpainted", the label
--     was simply wrong.
--
-- ALTER TYPE ... ADD VALUE is allowed inside a transaction on PostgreSQL 12+
-- as long as the new value is not used in the same transaction, which it is
-- not here.

ALTER TYPE "PartCondition" RENAME VALUE 'TAKE_OFF_BLACK_GRADE' TO 'NEW_UNPAINTED';

ALTER TYPE "PartCondition" ADD VALUE 'COPY_REPLICA';
