-- DropForeignKey
ALTER TABLE "OrderProduct" DROP CONSTRAINT "OrderProduct_productId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imagePublicId" TEXT,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "OrderProduct" ADD CONSTRAINT "OrderProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
