-- CreateTable
CREATE TABLE "notification_views" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "ref_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_views_actor_id_kind_ref_id_key" ON "notification_views"("actor_id", "kind", "ref_id");

-- CreateIndex
CREATE INDEX "notification_views_actor_id_kind_idx" ON "notification_views"("actor_id", "kind");

-- AddForeignKey
ALTER TABLE "notification_views" ADD CONSTRAINT "notification_views_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;