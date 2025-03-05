-- DropForeignKey
ALTER TABLE "workoutexercise" DROP CONSTRAINT "workoutexercise_workoutId_fkey";

-- AddForeignKey
ALTER TABLE "workoutexercise" ADD CONSTRAINT "workoutexercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
