import { Hono } from 'hono';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

export const workoutRoutes = new Hono<{ Variables: { userId: string } }>();

// Get the authenticated user's workouts
workoutRoutes.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const workouts = await prisma.workout.findMany({
    where: { userId },
    include: { exercises: true },
  });

  if (!workouts.length) {
    return c.json({ message: 'No workouts found' }, 404);
  }

  return c.json(workouts);
});

// Get a single workout (only if it belongs to the user)
workoutRoutes.get('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const workoutId = c.req.param('id');

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId, userId },
    include: {
      exercises: {
        include: {
          exercise: true,
        },
      },
    },
  });

  if (!workout) {
    return c.json({ error: 'Workout not found or not authorized' }, 404);
  }

  return c.json(workout);
});

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return (
    !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/)
  );
}

// Get workouts by date
workoutRoutes.get('/date/:date', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const dateParam = c.req.param('date');

  // Validate date format
  if (!isValidDate(dateParam)) {
    return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
  }

  const startOfDay = new Date(dateParam);
  const endOfDay = new Date(dateParam);
  endOfDay.setUTCHours(23, 59, 59, 999);

  try {
    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: { exercises: true },
    });

    if (!workouts.length) {
      return c.json({ error: 'No workouts found for this date' }, 404);
    }

    return c.json(workouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});