require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🔄 Starting historical SOW database synchronization...');
  
  // 1. Get all submissions with campaign info
  const submissions = await prisma.submission.findMany({
    include: {
      campaign: true
    }
  });
  
  console.log(`Found ${submissions.length} total submissions in database.`);
  
  // 2. Group submissions by (creator_id, campaign_id)
  const groups = {};
  for (const sub of submissions) {
    const key = `${sub.creator_id}_${sub.campaign_id}`;
    if (!groups[key]) {
      groups[key] = {
        creatorId: sub.creator_id,
        campaignId: sub.campaign_id,
        sowTotal: sub.campaign.sow_total,
        subs: []
      };
    }
    groups[key].subs.push(sub);
  }
  
  // 3. Recalculate and update deliverable records
  let updatedCount = 0;
  for (const key in groups) {
    const group = groups[key];
    const approvedCount = group.subs.filter(s => 
      ['APPROVED', 'POSTED', 'COMPLETED'].includes(s.status)
    ).length;
    
    console.log(`\nGroup: Creator "${group.creatorId}" | Campaign "${group.campaignId}"`);
    console.log(`  Campaign Total SOW: ${group.sowTotal}`);
    console.log(`  Approved Submissions: ${approvedCount}`);
    
    for (const sub of group.subs) {
      await prisma.submissionDeliverable.upsert({
        where: { submission_id: sub.id },
        create: {
          submission_id: sub.id,
          total_sow: group.sowTotal,
          completed_sow: approvedCount,
          remaining_sow: Math.max(0, group.sowTotal - approvedCount)
        },
        update: {
          completed_sow: approvedCount,
          remaining_sow: Math.max(0, group.sowTotal - approvedCount)
        }
      });
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Historical SOW synchronization completed! Updated/Synced ${updatedCount} records.`);
}

main()
  .catch(err => {
    console.error('❌ Error syncing historical SOW:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
