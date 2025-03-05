import { Hono } from 'hono';
import { prisma } from '../utils/prisma';

export const exerciseRoutes = new Hono();

exerciseRoutes.get('/', async (c) => {
  const exercises = await prisma.exercise.findMany();
  return c.json(exercises);
});
