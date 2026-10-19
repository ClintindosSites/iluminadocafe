/*
  Warnings:

  - A unique constraint covering the columns `[mercadoPagoPreferenceId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mercadoPagoPaymentId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('PIX', 'CARD', 'CASH_ON_DELIVERY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "mercadoPagoPaymentId" TEXT,
ADD COLUMN     "mercadoPagoPreferenceId" TEXT,
ADD COLUMN     "paymentMethod" "OrderPaymentMethod";

-- CreateIndex
CREATE UNIQUE INDEX "Order_mercadoPagoPreferenceId_key" ON "Order"("mercadoPagoPreferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_mercadoPagoPaymentId_key" ON "Order"("mercadoPagoPaymentId");
