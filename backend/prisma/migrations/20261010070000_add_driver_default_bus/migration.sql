ALTER TABLE "users" ADD COLUMN "default_bus_id" INTEGER;

CREATE INDEX "users_default_bus_id_idx" ON "users"("default_bus_id");

ALTER TABLE "users" ADD CONSTRAINT "users_default_bus_id_fkey"
  FOREIGN KEY ("default_bus_id") REFERENCES "buses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
