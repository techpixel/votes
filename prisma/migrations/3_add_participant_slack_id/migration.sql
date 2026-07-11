-- Teammates are looked up by Slack display name (resolved from slackId via
-- cachet) instead of by email.

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "slackId" TEXT;
