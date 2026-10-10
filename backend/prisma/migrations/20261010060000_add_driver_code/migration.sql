ALTER TABLE "users" ADD COLUMN "codigo" VARCHAR(20);

UPDATE "users"
SET "codigo" = 'COND-' || LPAD("id"::text, 6, '0')
WHERE "rol" = 'CHOFER' AND "codigo" IS NULL;

CREATE UNIQUE INDEX "users_codigo_key" ON "users"("codigo");
