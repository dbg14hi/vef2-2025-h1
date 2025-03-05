import { Hono } from 'hono';
import { prisma } from '../utils/prisma';

export const workoutRoutes = new Hono();

workoutRoutes.get('/', async (c) => {
  const workouts = await prisma.workout.findMany();
  return c.json(workouts);
});
