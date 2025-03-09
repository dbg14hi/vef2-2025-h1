import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding database...');

  // ✅ Hash password for default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // ✅ Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@workout.com' },
    update: {},
    create: {
      email: 'admin@workout.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.info('✅ Admin user created');

  // ✅ Create Categories
  const categories = await prisma.$transaction(
    ["Strength", "Cardio", "Endurance", "Flexibility", "Powerlifting"].map(name =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  console.info('✅ Categories added');

  // ✅ Create Exercises
  const exercises = [];
  for (let i = 0; i < 20; i++) {
    const exercise = await prisma.exercise.create({
      data: {
        name: faker.lorem.words(2),
        description: faker.lorem.sentence(),
        imageUrl: faker.image.url(),
        categoryId: faker.helpers.arrayElement(categories).id,
      },
    });
    exercises.push(exercise);
  }

  console.info('✅ Exercises added');

  // ✅ Create Users
  const users = [];
  for (let i = 0; i < 10; i++) {
    const hashedUserPassword = await bcrypt.hash(faker.internet.password(), 10);
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: hashedUserPassword,
        role: faker.helpers.arrayElement(["user", "admin"]),
      },
    });
    users.push(user);
  }

  console.info('✅ Users added');

  // ✅ Create Workouts & WorkoutExercises
  for (const user of users) {
    for (let i = 0; i < 3; i++) {
      const workout = await prisma.workout.create({
        data: {
          userId: user.id,
          date: faker.date.past(),
          exercises: {
            create: [
              {
                exerciseId: faker.helpers.arrayElement(exercises).id,
                sets: faker.number.int({ min: 3, max: 5 }),
                reps: faker.number.int({ min: 8, max: 15 }),
                weight: faker.number.float({ min: 20, max: 100, fractionDigits: 2 }),
              },
            ],
          },
        },
      });

      // ✅ Create Progress Logs
      await prisma.progressLog.create({
        data: {
          userId: user.id,
          exerciseId: faker.helpers.arrayElement(exercises).id,
          workoutId: workout.id,
          date: workout.date,
          sets: faker.number.int({ min: 3, max: 5 }),
          reps: faker.number.int({ min: 8, max: 15 }),
          weight: faker.number.float({ min: 20, max: 100, fractionDigits: 2 }),
        },
      });
    }
  }

  console.info('✅ Workouts & Progress Logs added');
  console.info('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
