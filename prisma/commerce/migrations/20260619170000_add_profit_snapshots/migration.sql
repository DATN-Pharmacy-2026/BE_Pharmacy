ALTER TABLE "OnlineOrderItem"
ADD COLUMN "unitCost" DECIMAL(18,2),
ADD COLUMN "totalCost" DECIMAL(18,2),
ADD COLUMN "grossProfit" DECIMAL(18,2),
ADD COLUMN "profitMargin" DECIMAL(7,2);
