CREATE TYPE "BusOperationalStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'MAINTENANCE', 'OUT_OF_ROUTE', 'STOPPED', 'REFUELING', 'INCIDENT');
ALTER TABLE "buses" ADD COLUMN "manual_status" "BusOperationalStatus";
ALTER TABLE "buses" ADD COLUMN "manual_status_updated_at" TIMESTAMP(3);
ALTER TABLE "buses" ADD COLUMN "manual_status_updated_by_id" INTEGER;
ALTER TABLE "buses" ADD CONSTRAINT "buses_manual_status_updated_by_id_fkey" FOREIGN KEY ("manual_status_updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "buses_manual_status_idx" ON "buses"("manual_status");
