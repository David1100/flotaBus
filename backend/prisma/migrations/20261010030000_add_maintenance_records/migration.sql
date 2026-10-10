CREATE TYPE "MaintenanceArea" AS ENUM ('CAJA', 'TRANSMISION', 'RETARDADOR', 'LLANTAS', 'AIRE_ACONDICIONADO', 'MOTOR');

CREATE TABLE "maintenance_records" (
  "id" SERIAL NOT NULL,
  "bus_id" INTEGER NOT NULL,
  "area" "MaintenanceArea" NOT NULL,
  "cost" DECIMAL(14,2) NOT NULL,
  "detail" VARCHAR(2000) NOT NULL,
  "photo_url" VARCHAR(500),
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_records_bus_id_area_recorded_at_idx" ON "maintenance_records"("bus_id", "area", "recorded_at");
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
