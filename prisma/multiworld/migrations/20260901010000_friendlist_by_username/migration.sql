-- AlterTable
-- See the singleworld migration of the same name for details.
DROP TABLE `friendlist`;

CREATE TABLE `friendlist` (
    `account_id` INTEGER NOT NULL,
    `friend_username` VARCHAR(191) NOT NULL,
    `profile` VARCHAR(191) NOT NULL DEFAULT 'main',
    `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`profile`, `account_id`, `friend_username`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
