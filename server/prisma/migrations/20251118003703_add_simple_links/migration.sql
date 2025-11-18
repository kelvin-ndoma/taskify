/*
  Warnings:

  - You are about to drop the column `containsLinks` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `containsLinks` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `LinkAttachment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."LinkAttachment" DROP CONSTRAINT "LinkAttachment_commentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LinkAttachment" DROP CONSTRAINT "LinkAttachment_taskId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LinkAttachment" DROP CONSTRAINT "LinkAttachment_userId_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "containsLinks";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "containsLinks",
ALTER COLUMN "due_date" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."LinkAttachment";

-- CreateTable
CREATE TABLE "TaskLink" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentLink" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskLink_url_taskId_key" ON "TaskLink"("url", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentLink_url_commentId_key" ON "CommentLink"("url", "commentId");

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLink" ADD CONSTRAINT "CommentLink_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLink" ADD CONSTRAINT "CommentLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
