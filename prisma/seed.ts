import { PrismaClient, Role } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcryptjs.hash('SuperAdmin@123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@doctorhub.com' },
    update: {},
    create: {
      email: 'superadmin@doctorhub.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Super Admin created/updated:', superAdmin.email);
  console.log('📧 Email: superadmin@doctorhub.com');
  console.log('🔑 Password: SuperAdmin@123');
  console.log('⚠️  Please change this password after first login!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✨ Seeding completed successfully!');
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
