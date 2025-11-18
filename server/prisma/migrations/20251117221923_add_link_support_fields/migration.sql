-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "containsLinks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkMetadata" JSONB;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "containsLinks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkMetadata" JSONB;
