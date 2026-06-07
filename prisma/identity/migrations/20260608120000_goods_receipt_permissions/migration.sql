INSERT INTO "Permission" ("id", "code", "name", "module", "action", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'goods_receipt.update', 'Update Goods Receipts', 'goods_receipt', 'update', NOW(), NOW()),
  (gen_random_uuid(), 'goods_receipt.receive', 'Receive Goods Receipts', 'goods_receipt', 'receive', NOW(), NOW()),
  (gen_random_uuid(), 'goods_receipt.cancel', 'Cancel Goods Receipts', 'goods_receipt', 'cancel', NOW(), NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "module" = EXCLUDED."module",
    "action" = EXCLUDED."action",
    "updatedAt" = NOW();

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), role_record."id", permission_record."id", NOW()
FROM "Role" role_record
CROSS JOIN "Permission" permission_record
WHERE role_record."code" = 'SUPER_ADMIN'
  AND permission_record."code" IN (
    'goods_receipt.update',
    'goods_receipt.receive',
    'goods_receipt.cancel'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
