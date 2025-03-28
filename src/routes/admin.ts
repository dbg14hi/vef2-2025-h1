import { Hono } from 'hono';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { workoutSchema } from '../schema/schemas.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME!;
const AWS_REGION = process.env.AWS_REGION!;
const IMGIX_BASE_URL = process.env.IMGIX_BASE_URL!;

// Initialize AWS S3 Client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const adminRoutes = new Hono();

// Exercises routes
// Upload Image for an Exercise (Using S3 & Imgix)
adminRoutes.post('/exercises/:id/image', authMiddleware, adminMiddleware, async (c) => {
  try {
    const exerciseId = c.req.param('id');

    // Check if exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return c.json({ error: 'Exercise not found' }, 404);
    }

    // Parse body using Hono's built-in `parseBody()`
    const body = await c.req.parseBody();
    const image = body["image"] as File;

    if (!image) {
      return c.json({ error: 'No image file provided' }, 400);
    }

    // Generate a unique filename for S3
    const fileExtension = image.name.split(".").pop();
    const fileName = `exercises/${exerciseId}-${nanoid()}.${fileExtension}`;

    // Convert file to Buffer for S3 upload
    const byteArrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(byteArrayBuffer);

    // Upload to S3
    const uploadParams = {
      Bucket: AWS_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: image.type,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    // Generate Imgix URL (Optimized Image)
    const imgixUrl = `${IMGIX_BASE_URL}/${fileName}`;

    // Store Imgix URL in database
    const updatedExercise = await prisma.exercise.update({
      where: { id: exerciseId },
      data: { imageUrl: imgixUrl },
    });

    return c.json({ message: 'Image uploaded successfully', updatedExercise });
  } catch (error) {
    console.error("Error uploading image:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Get all exercises (with pagination)
adminRoutes.get('/exercises', authMiddleware, adminMiddleware, async (c) => {
  const page = Number(c.req.query('page') || 1);
  const pageSize = 10;
  const exercises = await prisma.exercise.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { category: true },
  });
  return c.json(exercises);
});

// Create new exercise
adminRoutes.post('/exercises', authMiddleware, adminMiddleware, async (c) => {
  const { name, description, categoryName } = await c.req.json();

  if (!categoryName) {
    return c.json({ error: "categoryName is required" }, 400);
  }

  // 🔍 Find categoryId based on categoryName
  const category = await prisma.category.findUnique({
    where: { name: categoryName },
  });

  if (!category) {
    return c.json({ error: `Category '${categoryName}' does not exist.` }, 400);
  }

  // 🔍 Check if exercise with the same name already exists
  const existingExercise = await prisma.exercise.findUnique({
    where: { name },
  });

  if (existingExercise) {
    return c.json({ error: `Exercise with name '${name}' already exists.` }, 400);
  }

  // ✅ Create the new exercise using `category.id`
  const newExercise = await prisma.exercise.create({
    data: {
      name,
      description,
      categoryId: category.id, // ✅ Uses categoryId retrieved from categoryName
    },
  });

  return c.json(newExercise, 201);
});

// Update exercise
adminRoutes.put('/exercises/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id');
  const { name, description, categoryName } = await c.req.json();

  if (!categoryName) {
    return c.json({ error: "categoryName is required" }, 400);
  }

  // 🔍 Get categoryId from categoryName
  const category = await prisma.category.findUnique({
    where: { name: categoryName },
  });

  if (!category) {
    return c.json({ error: `Category '${categoryName}' does not exist.` }, 400);
  }

  // Update exercise with the new categoryId
  const updatedExercise = await prisma.exercise.update({
    where: { id },
    data: {
      name,
      description,
      categoryId: category.id, 
    },
  });

  return c.json(updatedExercise);
});

// Delete exercise
adminRoutes.delete('/exercises', authMiddleware, adminMiddleware, async (c) => {
  const { id, name } = await c.req.json(); // Read id or name from request body

  try {
    if (id) {
      // ✅ Delete by ID
      await prisma.workoutExercise.deleteMany({
        where: { exerciseId: id },
      });

      const deletedExercise = await prisma.exercise.delete({ where: { id } });

      return c.json({ message: 'Exercise deleted', deletedExercise });
    } else if (name) {
      // ✅ Delete by name (case-insensitive match)
      const deletedExercises = await prisma.exercise.deleteMany({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (deletedExercises.count === 0) {
        return c.json({ error: `No exercise found with name '${name}'` }, 404);
      }

      return c.json({ message: 'Exercises deleted', deletedCount: deletedExercises.count });
    }

    return c.json({ error: 'Provide either an id or name to delete' }, 400);
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return c.json({ error: 'Exercise not found or cannot be deleted' }, 400);
  }
});

// Progress routes
// Get all progress logs 
adminRoutes.get('/progress', authMiddleware, adminMiddleware, async (c) => {
  const progressLogs = await prisma.progressLog.findMany({
    include: {
      user: { select: { email: true } }, 
      exercise: { select: { name: true } },
      workout: { select: { date: true } },
    },
    orderBy: { date: 'desc' },
  });

  return c.json(progressLogs);
});

// Delete progress log
adminRoutes.delete('/progress/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id');

  try {
    await prisma.progressLog.delete({ where: { id } });
    return c.json({ message: 'Progress log deleted' });
  } catch (error) {
    return c.json({ error: 'Progress log not found' }, 400);
  }
});

// Log progress for a user (admin only)
adminRoutes.post('/progress', authMiddleware, adminMiddleware, async (c) => {
  const { userId, exerciseId, workoutId, sets, reps, weight } = await c.req.json();

  const progressLog = await prisma.progressLog.create({
    data: {
      userId,
      exerciseId,
      workoutId,
      sets,
      reps,
      weight,
    },
  });

  return c.json({ message: 'Progress logged!', progressLog });
});

// Get all workouts (with pagination)
adminRoutes.get('/workouts', authMiddleware, adminMiddleware, async (c) => {
  const page = Number(c.req.query('page') || 1);
  const pageSize = 10;
  const workouts = await prisma.workout.findMany({
    include: { exercises: true },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return c.json(workouts);
});

// Create new workout
adminRoutes.post('/workouts', authMiddleware, adminMiddleware, async (c) => {
    const body = await c.req.json();
    
    // Ensure userId is provided
    if (!body.userId) {
      return c.json({ error: "userId is required for creating a workout" }, 400);
    }

    const parsed = workoutSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.format() }, 400);
    }
  
    // Check if all exercises exist before inserting
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
  
    // Insert the workout and include exercises in response
    const newWorkout = await prisma.workout.create({
      data: {
        userId: body.userId,
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
      include: {
        exercises: true, 
      },
    });
  
    return c.json(newWorkout, 201);
  });

// Update workout
adminRoutes.put('/workouts/:id', authMiddleware, adminMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = workoutSchema.safeParse(body);
  
    if (!parsed.success) {
      return c.json({ error: parsed.error.format() }, 400);
    }
  
    try {
      const updatedWorkout = await prisma.workout.update({
        where: { id },
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
        include: { exercises: true }, // 
      });
  
      return c.json(updatedWorkout);
    } catch (error) {
      return c.json({ error: 'Workout not found or invalid ID' }, 400);
    }
  });
  
// Delete workout
adminRoutes.delete('/workouts/:id', authMiddleware, adminMiddleware, async (c) => {
    const id = c.req.param('id');
  
    try {
      // Now delete the workout 
      const deletedWorkout = await prisma.workout.delete({
        where: { id },
      });
  
      return c.json({ message: 'Workout deleted', deletedWorkout });
    } catch (error) {
      console.error('❌ Error deleting workout:', error);
      return c.json({ error: 'Workout not found or invalid ID' }, 400);
    }
  });
