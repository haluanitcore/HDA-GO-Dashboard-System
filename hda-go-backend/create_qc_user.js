const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { resolve } = require('path');
const bcrypt = require('bcryptjs');

const dbPath = resolve(__dirname, 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash('HdaGo123!', 12);
  const email = 'qc@hdago.com';

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    console.log('QC User already exists in database!');
  } else {
    const qcUser = await prisma.user.create({
      data: {
        name: 'QC Operator',
        email: email,
        password: password,
        role: 'QC'
      }
    });
    console.log('Successfully created dedicated QC Operator user:', JSON.stringify(qcUser, null, 2));
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
