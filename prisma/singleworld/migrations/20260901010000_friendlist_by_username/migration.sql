-- AlterTable
-- friendlist no longer requires the target to already have an account row - it now stores the
-- target's username directly (the same way ignorelist.value already did), matching real RS2006
-- behavior where you can add any name and it just shows offline until/unless that name logs in.
-- The table had no rows at the time this was written, so this is a straight drop + recreate.
DROP TABLE "friendlist";

CREATE TABLE "friendlist" (
    "account_id" INTEGER NOT NULL,
    "friend_username" TEXT NOT NULL,
    "profile" TEXT NOT NULL DEFAULT 'main',
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("profile", "account_id", "friend_username")
);
