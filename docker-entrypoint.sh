#!/bin/sh

echo "Starting container for $APP_NAME..."

case "$APP_NAME" in
  identity-service)
    echo "Pushing database schema for identity-service..."
    npx prisma db push --schema=prisma/identity/schema.prisma --accept-data-loss
    ;;
  commerce-service)
    echo "Pushing database schema for commerce-service..."
    npx prisma db push --schema=prisma/commerce/schema.prisma --accept-data-loss
    ;;
  operation-service)
    echo "Pushing database schema for operation-service..."
    npx prisma db push --schema=prisma/operation/schema.prisma --accept-data-loss
    ;;
  reporting-setting-service)
    echo "Pushing database schema for reporting-setting-service..."
    npx prisma db push --schema=prisma/reporting/schema.prisma --accept-data-loss
    ;;
  notification-service)
    echo "Pushing database schema for notification-service..."
    npx prisma db push --schema=prisma/notification/schema.prisma --accept-data-loss
    ;;
  *)
    echo "No Prisma schema push required for $APP_NAME."
    ;;
esac

echo "Starting Node.js application..."
exec node "dist/apps/${APP_NAME}/main.js"
