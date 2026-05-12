-- CreateTable
CREATE TABLE "BrandBDAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bd_user_id" TEXT NOT NULL,
    "brand_user_id" TEXT NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CampaignEditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "editor_role" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignEditLog_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "min_level" INTEGER NOT NULL DEFAULT 0,
    "brand_id" TEXT NOT NULL,
    "sow_total" INTEGER NOT NULL,
    "reward_type" TEXT NOT NULL,
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "budget" REAL NOT NULL DEFAULT 0,
    "brief_url" TEXT,
    "bd_reviewer_id" TEXT,
    "bd_reviewed_at" DATETIME,
    "bd_notes" TEXT,
    "bd_approved_at" DATETIME,
    "slot" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Campaign" ("brand_id", "category", "created_at", "deadline", "id", "min_level", "reward_type", "slot", "sow_total", "status", "title") SELECT "brand_id", "category", "created_at", "deadline", "id", "min_level", "reward_type", "slot", "sow_total", "status", "title" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BrandBDAssignment_bd_user_id_brand_user_id_key" ON "BrandBDAssignment"("bd_user_id", "brand_user_id");
