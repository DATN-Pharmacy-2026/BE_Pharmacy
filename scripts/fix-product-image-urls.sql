BEGIN;

UPDATE "ProductImage"
SET "url" = regexp_replace("url", '^https?://[^/]+', '')
WHERE "url" ~ '^https?://[^/]+/api/uploads/';

UPDATE "ProductImage"
SET "url" = regexp_replace(
  regexp_replace("url", '^https?://[^/]+', ''),
  '^/uploads/',
  '/api/uploads/'
)
WHERE "url" ~ '^https?://[^/]+/uploads/';

COMMIT;
