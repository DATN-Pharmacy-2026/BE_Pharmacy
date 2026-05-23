-- Add indication field for product use-case filtering
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "indication" TEXT;

CREATE INDEX IF NOT EXISTS "Product_indication_idx" ON "Product"("indication");

UPDATE "Product"
SET "indication" = CASE
  WHEN "sku" = 'PARA-500MG-TAB-01' THEN 'Cam sot, dau dau, dau nhuc co xuong khop'
  WHEN "sku" = 'AMOX-500MG-CAP-01' THEN 'Nhiem khuan duong ho hap, nhiem khuan tai mui hong'
  WHEN "sku" = 'VITC-1000MG-EFF-01' THEN 'Tang cuong de khang, ho tro hoi phuc sau om'
  WHEN "sku" = 'SALINE-NASAL-01' THEN 'Ve sinh mui, giam kho mui, ho tro cam lanh'
  WHEN "sku" = 'BPM-DEVICE-ARM-01' THEN 'Theo doi huyet ap tai nha'
  ELSE "indication"
END;
