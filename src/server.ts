import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serve } from "@hono/node-server";
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { workoutRoutes } from './routes/workouts';
import { exerciseRoutes } from './routes/exercises';
import { adminRoutes } from './routes/admin';

const app = new Hono();
const prisma = new PrismaClient();

// Middleware
app.use('*', logger()); // Logs requests
app.use('*', cors()); // Enable CORS

// Default route
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to the Workout Tracker API!',
    routes: {
      auth: '/auth',
      users: '/users',
      workouts: '/workouts',
      exercises: '/exercises',
    },
  });
});

// Register routes
app.route('/auth', authRoutes);
app.route('/users', userRoutes);
app.route('/workouts', workoutRoutes);
app.route('/exercises', exerciseRoutes);
app.route('/admin', adminRoutes);

serve(
    {
      fetch: app.fetch,
      port: 3000,
    },
    (info) => {
      console.info(`Server is running on http://localhost:${info.port}`);
    },
  );
