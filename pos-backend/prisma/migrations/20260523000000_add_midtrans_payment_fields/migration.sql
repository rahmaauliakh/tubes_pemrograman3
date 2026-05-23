-- AlterTable
ALTER TABLE `Transaction`
    ADD COLUMN `paymentStatus` ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
    ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
    ADD COLUMN `midtransTransactionId` VARCHAR(191) NULL,
    ADD COLUMN `midtransOrderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Transaction_midtransTransactionId_key` ON `Transaction`(`midtransTransactionId`);

-- CreateIndex
CREATE UNIQUE INDEX `Transaction_midtransOrderId_key` ON `Transaction`(`midtransOrderId`);
