ALTER TABLE "trip_assignments" ADD COLUMN "assigned_by_id" INTEGER;
UPDATE "trip_assignments" SET "assigned_by_id" = "driver_id" WHERE "assigned_by_id" IS NULL;
ALTER TABLE "trip_assignments" ALTER COLUMN "assigned_by_id" SET NOT NULL;
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id");
CREATE INDEX "trip_assignments_assigned_by_id_idx" ON "trip_assignments"("assigned_by_id");
