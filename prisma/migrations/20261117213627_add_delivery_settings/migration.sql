-- AlterEnum
ALTER TYPE "ConsumptionMethod" ADD VALUE 'DELIVERY';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryDistanceKm" DOUBLE PRECISION,
ADD COLUMN     "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "deliveryAddress" TEXT NOT NULL DEFAULT 'Rua Flor de Alecrim, 98, Pindorama, Belo Horizonte - MG, CEP 30865-350',
ADD COLUMN     "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryMaxDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE "DeliveryFeeRange" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "minDistanceKm" DOUBLE PRECISION NOT NULL,
    "maxDistanceKm" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryFeeRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryFeeRange_restaurantId_idx" ON "DeliveryFeeRange"("restaurantId");

-- AddForeignKey
ALTER TABLE "DeliveryFeeRange" ADD CONSTRAINT "DeliveryFeeRange_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
