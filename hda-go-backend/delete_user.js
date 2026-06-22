require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Searching for non-creator.com creators in DB...');
  const users = await prisma.user.findMany({
    where: {
      role: 'CREATOR',
      NOT: {
        email: {
          endsWith: '@creator.com'
        }
      }
    },
    include: { creator: true }
  });
  
  console.log(`Found ${users.length} non-creator.com users to delete.`);
  for (const user of users) {
    console.log(`Deleting user: ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
    try {
      // Delete child records first
      await prisma.creatorProgress.deleteMany({ where: { creator_id: user.id } });
      await prisma.campaignParticipant.deleteMany({ where: { creator_id: user.id } });
      await prisma.submission.deleteMany({ where: { creator_id: user.id } });
      await prisma.creatorOrder.deleteMany({ where: { creator_id: user.id } });
      await prisma.creatorReward.deleteMany({ where: { creator_id: user.id } });
      await prisma.creatorMilestoneClaim.deleteMany({ where: { creator_id: user.id } });
      await prisma.creatorMonthlyStats.deleteMany({ where: { creator_id: user.id } });
      await prisma.creatorWeeklyStats.deleteMany({ where: { creator_id: user.id } });
      await prisma.hotelVisit.deleteMany({ where: { creator_id: user.id } });
      await prisma.notification.deleteMany({ where: { user_id: user.id } });
      await prisma.userPreferences.deleteMany({ where: { user_id: user.id } });
      await prisma.refreshToken.deleteMany({ where: { user_id: user.id } });
      await prisma.userActivityLog.deleteMany({ where: { user_id: user.id } });
      await prisma.userDailyStat.deleteMany({ where: { user_id: user.id } });
      
      // Delete main tables
      await prisma.creator.deleteMany({ where: { user_id: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      
      console.log(`Deletion of ${user.email} successful!`);
    } catch (err) {
      console.error(`Deletion of ${user.email} failed with error:`, err);
    }
  }
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
