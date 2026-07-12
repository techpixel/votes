-- Slack display names are cached on the participant so the gallery doesn't
-- hit the Slack API on every load; syncedAt drives the refresh TTL.

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "slackDisplayName" TEXT;
ALTER TABLE "Participant" ADD COLUMN "slackDisplayNameSyncedAt" TIMESTAMP(3);
