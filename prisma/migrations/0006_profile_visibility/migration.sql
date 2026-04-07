CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

ALTER TABLE "User"
ADD COLUMN "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC';
