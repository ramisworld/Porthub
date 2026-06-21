-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "designSpec" JSONB,
ALTER COLUMN "code" DROP NOT NULL;
