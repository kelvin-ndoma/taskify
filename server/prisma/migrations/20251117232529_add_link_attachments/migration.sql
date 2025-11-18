/*
  Warnings:

  - You are about to drop the column `linkMetadata` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `linkMetadata` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "linkMetadata";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "linkMetadata";

-- CreateTable
CREATE TABLE "LinkAttachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "siteName" TEXT,
    "favicon" TEXT,
    "contentType" TEXT,
    "taskId" TEXT,
    "commentId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkAttachment_url_taskId_commentId_key" ON "LinkAttachment"("url", "taskId", "commentId");

-- AddForeignKey
ALTER TABLE "LinkAttachment" ADD CONSTRAINT "LinkAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkAttachment" ADD CONSTRAINT "LinkAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkAttachment" ADD CONSTRAINT "LinkAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
