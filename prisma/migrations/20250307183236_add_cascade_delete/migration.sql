-- DropForeignKey
ALTER TABLE "workoutexercise" DROP CONSTRAINT "workoutexercise_exerciseId_fkey";

-- AddForeignKey
ALTER TABLE "workoutexercise" ADD CONSTRAINT "workoutexercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
