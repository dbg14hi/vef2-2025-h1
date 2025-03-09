import { Hono } from 'hono';
import { prisma } from '../utils/prisma';

export const exerciseRoutes = new Hono();

// Get all exercises 
exerciseRoutes.get('/', async (c) => {
  const exercises = await prisma.exercise.findMany();
  return c.json(exercises);
});

// Get a single exercise by ID (Everyone can access)
exerciseRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const exercise = await prisma.exercise.findUnique({
    where: { id },
  });

  if (!exercise) {
    return c.json({ error: 'Exercise not found' }, 404);
  }

  return c.json(exercise);
});

// Get a single exercise by name
exerciseRoutes.get('/name/:name', async (c) => {
  const rawName = c.req.param('name');

  const exercise = await prisma.exercise.findFirst({
    where: { name: { equals: rawName, mode: 'insensitive' } }, // Case-insensitive search
  });

  if (!exercise) {
    return c.json({ error: 'Exercise not found' }, 404);
  }

  return c.json(exercise);
});

// Get exercises by category name
exerciseRoutes.get('/category/:categoryName', async (c) => {
  const categoryName = c.req.param('categoryName');

  // Find category ID by name
  const category = await prisma.category.findUnique({
    where: { name: categoryName },
    include: { exercises: true }, // Get all exercises within that category
  });

  if (!category) {
    return c.json({ error: 'Category not found' }, 404);
  }

  return c.json(category.exercises);
});