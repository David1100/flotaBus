CREATE TYPE "Role" AS ENUM ('ADMINISTRADOR', 'CHOFER');
CREATE TABLE "users" (
  "id" SERIAL NOT NULL,
  "username" VARCHAR(32) NOT NULL,
  "nombres" VARCHAR(120) NOT NULL,
  "telefono" VARCHAR(24) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "rol" "Role" NOT NULL DEFAULT 'CHOFER',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_rol_is_active_idx" ON "users"("rol", "is_active");
