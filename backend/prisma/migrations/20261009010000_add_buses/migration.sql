CREATE TABLE "buses" (
  "id" SERIAL NOT NULL,
  "placa" VARCHAR(16) NOT NULL,
  "kilometraje" INTEGER NOT NULL,
  "modelo" VARCHAR(80) NOT NULL,
  "marca" VARCHAR(80) NOT NULL,
  "url_image" VARCHAR(2048),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "buses" ADD CONSTRAINT "buses_kilometraje_nonnegative" CHECK ("kilometraje" >= 0);
CREATE UNIQUE INDEX "buses_placa_key" ON "buses"("placa");
