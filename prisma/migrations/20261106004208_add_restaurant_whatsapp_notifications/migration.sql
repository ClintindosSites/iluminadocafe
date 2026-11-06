-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "whatsappNotificationError" TEXT,
ADD COLUMN     "whatsappNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "whatsappPhone" TEXT;
