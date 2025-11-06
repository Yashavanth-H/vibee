/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Fragment` table. All the data in the column will be lost.
  - The primary key for the `Project` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `updateAt` to the `Fragment` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `projectId` on the `Message` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Project` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_projectId_fkey";

-- AlterTable
ALTER TABLE "public"."Fragment" DROP COLUMN "updatedAt",
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "projectId",
ADD COLUMN     "projectId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."Project" DROP CONSTRAINT "Project_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Project_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Usage" ALTER COLUMN "expire" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
