-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Creator" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "creator_level" INTEGER NOT NULL DEFAULT 0,
    "gmv_total" REAL NOT NULL DEFAULT 0,
    "gmv_monthly" REAL NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_campaigns" INTEGER NOT NULL DEFAULT 0,
    "total_posts" INTEGER NOT NULL DEFAULT 0,
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "live_participation" INTEGER NOT NULL DEFAULT 0,
    "posting_consistency" REAL NOT NULL DEFAULT 0,
    "cm_id" TEXT,
    CONSTRAINT "Creator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreatorProgress" (
    "creator_id" TEXT NOT NULL PRIMARY KEY,
    "current_level" INTEGER NOT NULL,
    "target_level" INTEGER NOT NULL,
    "progress_percentage" REAL NOT NULL DEFAULT 0,
    "gmv_progress" REAL NOT NULL DEFAULT 0,
    "campaign_progress" INTEGER NOT NULL DEFAULT 0,
    "order_progress" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "CreatorProgress_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "min_level" INTEGER NOT NULL DEFAULT 0,
    "brand_id" TEXT NOT NULL,
    "sow_total" INTEGER NOT NULL,
    "reward_type" TEXT NOT NULL,
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CampaignParticipant" (
    "campaign_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("campaign_id", "creator_id"),
    CONSTRAINT "CampaignParticipant_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CampaignParticipant_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "tiktok_url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "qc_notes" TEXT,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" DATETIME,
    "posted_at" DATETIME,
    "completed_at" DATETIME,
    CONSTRAINT "Submission_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Submission_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubmissionDeliverable" (
    "submission_id" TEXT NOT NULL PRIMARY KEY,
    "total_sow" INTEGER NOT NULL,
    "completed_sow" INTEGER NOT NULL DEFAULT 0,
    "remaining_sow" INTEGER NOT NULL,
    CONSTRAINT "SubmissionDeliverable_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreatorOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creator_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "gmv_amount" REAL NOT NULL DEFAULT 0,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorOrder_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CreatorOrder_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read_status" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreatorMonthlyStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creator_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "gmv" REAL NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "campaigns_joined" INTEGER NOT NULL DEFAULT 0,
    "campaigns_completed" INTEGER NOT NULL DEFAULT 0,
    "posts_count" INTEGER NOT NULL DEFAULT 0,
    "completion_rate" REAL NOT NULL DEFAULT 0,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorMonthlyStats_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "total_participants" INTEGER NOT NULL DEFAULT 0,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "approved_submissions" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_gmv" REAL NOT NULL DEFAULT 0,
    "completion_rate" REAL NOT NULL DEFAULT 0,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignAnalytics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "total_creators" INTEGER NOT NULL DEFAULT 0,
    "active_creators" INTEGER NOT NULL DEFAULT 0,
    "total_campaigns" INTEGER NOT NULL DEFAULT 0,
    "active_campaigns" INTEGER NOT NULL DEFAULT 0,
    "total_gmv" REAL NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorMonthlyStats_creator_id_month_key" ON "CreatorMonthlyStats"("creator_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAnalytics_campaign_id_key" ON "CampaignAnalytics"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformMetrics_date_key" ON "PlatformMetrics"("date");
