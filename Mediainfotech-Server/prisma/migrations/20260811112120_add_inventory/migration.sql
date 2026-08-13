-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'DEFECTIVE');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('IN_STOCK', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED');

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "modelNumber" TEXT,
    "barcode" TEXT NOT NULL,
    "category" TEXT,
    "condition" "InventoryCondition" NOT NULL DEFAULT 'NEW',
    "status" "InventoryStatus" NOT NULL DEFAULT 'IN_STOCK',
    "buyDate" DATE,
    "stockAmount" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketInventoryItem" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_barcode_key" ON "InventoryItem"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "TicketInventoryItem_ticketId_inventoryItemId_key" ON "TicketInventoryItem"("ticketId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "TicketInventoryItem" ADD CONSTRAINT "TicketInventoryItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketInventoryItem" ADD CONSTRAINT "TicketInventoryItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
