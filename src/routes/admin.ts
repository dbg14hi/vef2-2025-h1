import { Hono } from 'hono';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { exerciseSchema, workoutSchema } from '../schema/schemas';
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
  });
  return c.json(exercises);
});

// Create new exercise
adminRoutes.post('/exercises', authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json();

  // Validate input (ensure name, category, and description exist)
  if (!body.name || !body.category) {
    return c.json({ error: 'Name and category are required' }, 400);
  }

  const newExercise = await prisma.exercise.create({
    data: {
      name: body.name,
      category: body.category,
      description: body.description || null, // Optional description
    },
  });

  return c.json(newExercise, 201);
});

// Update exercise
adminRoutes.put('/exercises/:id', authMiddleware, adminMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = exerciseSchema.safeParse(body);
  
    if (!parsed.success) {
      return c.json({ error: parsed.error.format() }, 400);
    }
  
    try {
      const updatedExercise = await prisma.exercise.update({
        where: { id },
        data: parsed.data,
      });
  
      return c.json(updatedExercise);
    } catch (error) {
      return c.json({ error: 'Exercise not found or invalid ID' }, 400);
    }
  });

// Delete exercise
adminRoutes.delete('/exercises/:id', authMiddleware, adminMiddleware, async (c) => {
    const id = c.req.param('id');
  
    try {
      const deleted = await prisma.exercise.delete({
        where: { id },
      });
      return c.json({ message: 'Exercise deleted', deleted });
    } catch (error) {
      return c.json({ error: 'Exercise not found or invalid ID' }, 400);
    }
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
      include: {
        exercises: true, // This ensures exercises appear in the response
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
