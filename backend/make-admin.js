const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    const user = await prisma.user.update({
      where: { username: 'tmilehin' },
      data: { accountType: 'admin' },
    });
    console.log('✅ Made tmilehin an admin:', user.username, user.accountType);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
