import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serve } from "@hono/node-server";
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { workoutRoutes } from './routes/workouts.js';
import { exerciseRoutes } from './routes/exercises.js';
import { adminRoutes } from './routes/admin.js';

export const app = new Hono();
const prisma = new PrismaClient();

// Middleware
app.use('*', logger()); // Logs requests
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000'], 
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Default route
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to the Workout Tracker API!',
    endpoints: {
      auth: {
        login: { method: 'POST', path: '/auth/login' },
        register: { method: 'POST', path: '/auth/register' },
      },
      users: {
        profile: { method: 'GET', path: '/users/me' },
        myWorkouts: {
          list: { method: 'GET', path: '/users/workouts' },
          create: { method: 'POST', path: '/users/workouts' },
          update: { method: 'PUT', path: '/users/workouts/:id' },
          delete: { method: 'DELETE', path: '/users/workouts/:id' },
        },
        progressLogs: {
          list: { method: 'GET', path: '/users/progress' },
          log: { method: 'POST', path: '/users/progress' },
        },
      },
      workouts: {
        getByDate: { method: 'GET', path: '/workouts/date/:date' },
        getById: { method: 'GET', path: '/workouts/:id' },
      },
      exercises: {
        list: { method: 'GET', path: '/exercises' },
        getById: { method: 'GET', path: '/exercises/:id' },
        getByName: { method: 'GET', path: '/exercises/name/:name' },
        getByCategory: { method: 'GET', path: '/exercises/category/:categoryName' },
      },
      admin: {
        exercises: {
          list: { method: 'GET', path: '/admin/exercises' },
          create: { method: 'POST', path: '/admin/exercises' },
          update: { method: 'PUT', path: '/admin/exercises/:id' },
          delete: { method: 'DELETE', path: '/admin/exercises/:id' },
          uploadImage: { method: 'POST', path: '/admin/exercises/:id/image' },
        },
        workouts: {
          list: { method: 'GET', path: '/admin/workouts' },
          create: { method: 'POST', path: '/admin/workouts' },
          update: { method: 'PUT', path: '/admin/workouts/:id' },
          delete: { method: 'DELETE', path: '/admin/workouts/:id' },
        },
        progressLogs: {
          list: { method: 'GET', path: '/admin/progress' },
          create: { method: 'POST', path: '/admin/progress' },
          delete: { method: 'DELETE', path: '/admin/progress/:id' },
        },
      },
    },
  });
});

// Register routes
app.route('/auth', authRoutes);
app.route('/users', userRoutes);
app.route('/workouts', workoutRoutes);
app.route('/exercises', exerciseRoutes);
app.route('/admin', adminRoutes);

// Move `serve(...)` into a separate file
if (process.env.NODE_ENV !== 'test') {
  serve(
    {
      fetch: app.fetch,
      port: 8000,
    },
    (info) => {
      console.info(`Server is running on http://localhost:${info.port}`);
    }
  );
}
