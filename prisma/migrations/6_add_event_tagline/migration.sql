-- Per-event tagline: the short caption shown on the event picker cards.
-- Null renders no caption.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "tagline" TEXT;
