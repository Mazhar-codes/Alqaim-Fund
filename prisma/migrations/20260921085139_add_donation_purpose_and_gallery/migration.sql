-- CreateEnum
CREATE TYPE "DonationPurpose" AS ENUM ('SADQA', 'KHUMS', 'GENERAL_FUND', 'YOUM_E_INHADAM_E_JANNAT_UL_BAQI');

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "purpose" "DonationPurpose" NOT NULL DEFAULT 'GENERAL_FUND';

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);
