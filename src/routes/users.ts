import { Hono } from 'hono';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { workoutSchema } from '../schema/schemas';

export const userRoutes = new Hono<{ Variables: { userId: string; userRole: string } }>();

// Admin Dashboard Route
userRoutes.get('/admin-dashboard', authMiddleware, adminMiddleware, async (c) => {
  return c.json({ message: 'Welcome, Admin!' });
});

// Get User Profile
userRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true }, 
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

// Get User Workouts
userRoutes.get('/workouts', authMiddleware, async (c) => {
  const userId = c.get('userId'); // ✅ Ensure user is authenticated
  const page = Number(c.req.query('page') || 1);
  const pageSize = 10;

  // Fetch only the logged-in user's workouts
  const workouts = await prisma.workout.findMany({
    where: { userId },
    include: { exercises: true }, // ✅ Include exercises in response
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { date: 'desc' },
  });

  if (!workouts.length) {
    return c.json({ message: 'No workouts found' }, 404);
  }

  return c.json(workouts);
});

// User Logs a New Workout
userRoutes.post('/workouts', authMiddleware, async (c) => {
  const userId = c.get('userId'); // Ensure user is logged in
  const body = await c.req.json();
  const parsed = workoutSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  // Ensure user is only logging their own workout
  if (parsed.data.userId !== userId) {
    return c.json({ error: 'Unauthorized: You can only log your own workouts' }, 403);
  }

  // Validate that all exercises exist
  const existingExercises = await prisma.exercise.findMany({
    where: {
      id: { in: parsed.data.exercises.map((ex) => ex.exerciseId) },
    },
  });

  const existingExerciseIds = new Set(existingExercises.map((ex: { id: string }) => ex.id));
  const invalidExercises = parsed.data.exercises.filter(
    (ex) => !existingExerciseIds.has(ex.exerciseId)
  );

  if (invalidExercises.length > 0) {
    return c.json(
      {
        error: 'Invalid exercise IDs',
        invalidExercises,
      },
      400
    );
  }

  // Insert the workout with linked exercises
  const newWorkout = await prisma.workout.create({
    data: {
      userId: parsed.data.userId,
      date: new Date(parsed.data.date),
      exercises: {
        create: parsed.data.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
        })),
      },
    },
    include: { exercises: true }, // Ensure exercises appear in the response
  });

  return c.json(newWorkout, 201);
});

// Update a User's Workout
userRoutes.put('/workouts/:id', authMiddleware, async (c) => {
  const userId = c.get('userId'); // Get logged-in user ID
  const workoutId = c.req.param('id'); // Get workout ID from URL
  const body = await c.req.json();
  const parsed = workoutSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  try {
    // Ensure the workout belongs to the logged-in user
    const existingWorkout = await prisma.workout.findUnique({
      where: { id: workoutId, userId },
      include: { exercises: true },
    });

    if (!existingWorkout) {
      return c.json({ error: 'Workout not found or not authorized' }, 403);
    }

    // Validate exercise IDs before updating
    const existingExercises = await prisma.exercise.findMany({
      where: {
        id: { in: parsed.data.exercises.map((ex) => ex.exerciseId) },
      },
    });

    const existingExerciseIds = new Set(existingExercises.map((ex: {id: string}) => ex.id));
    const invalidExercises = parsed.data.exercises.filter(
      (ex) => !existingExerciseIds.has(ex.exerciseId)
    );

    if (invalidExercises.length > 0) {
      return c.json(
        { error: 'Invalid exercise IDs', invalidExercises },
        400
      );
    }

    // Update workout (delete old exercises & insert new ones)
    const updatedWorkout = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        date: new Date(parsed.data.date),
        exercises: {
          deleteMany: {}, // Clears old exercises before inserting new ones
          create: parsed.data.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
          })),
        },
      },
      include: { exercises: true }, // Return updated exercises
    });

    return c.json(updatedWorkout);
  } catch (error) {
    return c.json({ error: 'Workout update failed' }, 400);
  }
});

// Delete a User's Workout
userRoutes.delete('/workouts/:id', authMiddleware, async (c) => {
  const userId = c.get('userId'); // Get logged-in user ID
  const workoutId = c.req.param('id'); // Get workout ID from URL

  try {
    // Ensure the workout belongs to the logged-in user
    const existingWorkout = await prisma.workout.findUnique({
      where: { id: workoutId },
    });
    if (!existingWorkout || existingWorkout.userId !== userId) {

      return c.json({ error: 'Workout not found or not authorized' }, 404);
    }

    // Delete the workout
    await prisma.workout.delete({
      where: { id: workoutId },
    });

    return c.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    return c.json({ error: 'Workout deletion failed' }, 400);
  }
});
