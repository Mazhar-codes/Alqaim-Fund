-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
