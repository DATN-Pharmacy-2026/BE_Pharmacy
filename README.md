# PharmacyPlus Backend

Monorepo backend cho hệ thống quản lý nhà thuốc đa chi nhánh, gồm API Gateway và nhiều dịch vụ nội bộ.

## Tổng quan
Hệ thống backend triển khai bằng NestJS với các service chính:
- API Gateway
- Identity Service
- Commerce Service
- Operation Service
- Reporting/Setting Service
- Notification Service
- Chatbot Service

## Công nghệ chính
- NestJS v11
- TypeScript
- Prisma v6
- PostgreSQL
- RabbitMQ
- Qdrant
- Swagger
- Jest

## Yêu cầu
- Node.js 20+
- npm
- Docker và Docker Compose (để chạy PostgreSQL, RabbitMQ, Qdrant)

## Cài đặt nhanh
1. Cài đặt phụ thuộc:
   ```bash
   npm install
   ```

2. Sao chép cấu hình môi trường:
   ```bash
   cp .env.example .env
   ```

3. Chỉnh sửa `.env` cục bộ theo môi trường của bạn.

> Không lưu trữ khóa bí mật hoặc thông tin nhạy cảm trong kho mã.

## Khởi động với Docker
- Khởi động dịch vụ cần thiết:
  ```bash
  npm run docker:up
  ```

- Dừng dịch vụ:
  ```bash
  npm run docker:down
  ```

- Xem log:
  ```bash
  npm run docker:logs
  ```

## Chạy backend cục bộ
- Chạy gateway:
  ```bash
  npm run start:gateway
  ```

- Chạy service riêng lẻ:
  ```bash
  npm run dev:identity
  npm run dev:commerce
  npm run dev:operation
  npm run dev:reporting
  npm run dev:notification
  npm run dev:chatbot
  ```

- Chạy tất cả service trong chế độ dev:
  ```bash
  npm run start:dev:all
  ```

## Prisma
- Generate Prisma client:
  ```bash
  npm run prisma:generate:all
  ```

- Migrate từng schema:
  ```bash
  npm run prisma:migrate:identity
  npm run prisma:migrate:commerce
  npm run prisma:migrate:operation
  npm run prisma:migrate:reporting
  npm run prisma:migrate:notification
  ```

- Migrate toàn bộ:
  ```bash
  npm run prisma:migrate:all
  ```

- Seed dữ liệu demo:
  ```bash
  npm run prisma:seed:all
  ```

## Cấu trúc chính
- `apps/` — các dịch vụ NestJS
- `libs/` — mã dùng chung
- `prisma/` — schema Prisma
- `docker/` — cấu hình Docker
- `scripts/` — script hỗ trợ seed, import, demo, kiểm thử

## Cấu hình môi trường
Các giá trị cấu hình chính:
- `GATEWAY_PORT`, `IDENTITY_SERVICE_PORT`, `COMMERCE_SERVICE_PORT`, `OPERATION_SERVICE_PORT`, `REPORTING_SETTING_SERVICE_PORT`, `NOTIFICATION_SERVICE_PORT`, `CHATBOT_SERVICE_PORT`
- `IDENTITY_DATABASE_URL`, `COMMERCE_DATABASE_URL`, `OPERATION_DATABASE_URL`, `REPORTING_DATABASE_URL`, `NOTIFICATION_DATABASE_URL`
- `BROKER_TYPE`, `RABBITMQ_URL`, `EVENT_BROKER_ENABLED`
- `CORS_ORIGINS`, `FRONTEND_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `AI_PROVIDER`, `LLM_PROVIDER`, `EMBEDDING_PROVIDER`, `QDRANT_URL`

## Demo và tiện ích
- Seed demo toàn bộ:
  ```bash
  npm run demo:seed
  ```

- Reset demo:
  ```bash
  npm run demo:reset
  ```

- Chuẩn bị demo:
  ```bash
  npm run demo:setup
  ```

- Thiết lập full demo:
  ```bash
  npm run demo:full:setup
  ```

## Kiểm thử
- Chạy Jest:
  ```bash
  npm run test
  ```

- Chạy smoke test:
  ```bash
  npm run test:smoke
  ```

- Chạy kiểm thử E2E frontend (từ backend repository):
  ```bash
  npm run test:e2e
  ```

## Ghi chú
- `.env.example` chứa mẫu cấu hình, không phải dữ liệu thực tế.
- Không commit `.env` hoặc bất kỳ khóa bí mật nào.
- Frontend nên gọi qua API Gateway `http://localhost:3000/api`.
- Các service nội bộ không nên được gọi trực tiếp từ client.
- Đảm bảo PostgreSQL, RabbitMQ và Qdrant đã chạy trước khi khởi động backend.
