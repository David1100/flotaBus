-- AlterEnum
-- Canonical driver actions reported from the app: resume a stopped/paused trip
-- and finish an arrived trip. Existing rows keep their current values.
ALTER TYPE "OperationEventType" ADD VALUE IF NOT EXISTS 'RESUME';
ALTER TYPE "OperationEventType" ADD VALUE IF NOT EXISTS 'FINISH';
