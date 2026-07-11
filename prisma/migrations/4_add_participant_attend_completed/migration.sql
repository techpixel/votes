-- Attend registration completion ("complete" status), sourced from the roster
-- sync and the sign-in lookup. Participants still in progress cannot vote.

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "attendCompleted" BOOLEAN NOT NULL DEFAULT false;
