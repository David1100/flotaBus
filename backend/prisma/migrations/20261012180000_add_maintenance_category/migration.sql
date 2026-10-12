-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('MANTENIMIENTO', 'COMBUSTIBLE', 'PINCHAZO', 'OTRO');

-- AlterTable
ALTER TABLE "maintenance_records" ADD COLUMN "category" "MaintenanceCategory" NOT NULL DEFAULT 'MANTENIMIENTO';
ALTER TABLE "maintenance_records" ALTER COLUMN "area" DROP NOT NULL;

-- DropIndex
DROP INDEX "maintenance_records_bus_id_area_recorded_at_idx";

-- CreateIndex
CREATE INDEX "maintenance_records_bus_id_category_recorded_at_idx" ON "maintenance_records"("bus_id", "category", "recorded_at");
CREATE INDEX "maintenance_records_bus_id_area_recorded_at_idx" ON "maintenance_records"("bus_id", "area", "recorded_at");