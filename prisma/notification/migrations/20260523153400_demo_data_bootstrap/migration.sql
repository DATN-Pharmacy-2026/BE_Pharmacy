-- Demo data bootstrap for notification service

INSERT INTO "NotificationTemplate" (
  "id","code","name","channel","subjectTemplate","bodyTemplate","isActive","createdAt","updatedAt"
)
VALUES
  ('a9100000-0000-0000-0000-000000000001','WELCOME_EMAIL','Welcome Email','EMAIL','Welcome to Pharmacy Platform','Hello {{fullName}}, welcome to Pharmacy Platform.',true,NOW(),NOW()),
  ('a9100000-0000-0000-0000-000000000002','ORDER_CONFIRMATION','Order Confirmation','EMAIL','Order {{orderNo}} Confirmed','Your order {{orderNo}} has been confirmed.',true,NOW(),NOW()),
  ('a9100000-0000-0000-0000-000000000003','LOW_INVENTORY_ALERT','Low Inventory Alert','WEBSOCKET',NULL,'Product {{productName}} is below threshold at warehouse {{warehouseName}}.',true,NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "channel" = EXCLUDED."channel",
    "subjectTemplate" = EXCLUDED."subjectTemplate",
    "bodyTemplate" = EXCLUDED."bodyTemplate",
    "isActive" = true,
    "updatedAt" = NOW();
