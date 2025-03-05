import { z } from 'zod';
import xss from 'xss';

// Validation Schemas
export const exerciseSchema = z.object({
    name: z
      .string()
      .min(2, 'Exercise name must be at least 2 characters')
      .transform((val) => xss(val)),
    category: z.enum(['Strength', 'Cardio', 'Flexibility', 'Endurance']),
  });

export const workoutSchema = z.object({
    userId: z.string().uuid(),
    date: z.string().datetime(),
    exercises: z.array(
      z.object({
        exerciseId: z.string().uuid(),
        sets: z.number().min(1),
        reps: z.number().min(1),
        weight: z.number().min(0),
      })
    ),
});