import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding database...');

  // Hash password for default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@workout.com' },
    update: {},
    create: {
      email: 'admin@workout.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  // Create Sample Exercises
  const exercises = await prisma.exercise.createMany({
    data: [
      { name: 'Bench Press', category: 'Strength' },
      { name: 'Squat', category: 'Strength' },
      { name: 'Deadlift', category: 'Strength' },
      { name: 'Running', category: 'Cardio' },
      { name: 'Jump Rope', category: 'Cardio' },
    ],
    skipDuplicates: true, // Avoid duplicate entries
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
