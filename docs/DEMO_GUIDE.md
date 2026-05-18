# DEMO GUIDE

## 1) Prerequisites
- Node.js + npm
- PostgreSQL local (DBs from `.env`)
- Frontend at `UI-PHARMACY`

## 2) Install
```bash
cd backend
npm install
cd ../UI-PHARMACY
npm install
```

## 3) Env
- Use `backend/.env.example` -> `backend/.env`
- Use `UI-PHARMACY/.env.example` -> `UI-PHARMACY/.env`
- Important:
  - `VITE_API_BASE_URL=http://localhost:3000/api`
  - Gateway CORS must allow `http://localhost:4008`

## 4) Build
```bash
cd backend
npm run build:all
cd ../UI-PHARMACY
npm run build
```

## 5) Prisma Generate + Seed
```bash
cd backend
npm run prisma:generate:identity
npm run prisma:generate:commerce
npm run prisma:generate:operation
npm run prisma:generate:reporting
npm run prisma:seed:all
```

## 6) Start services
```bash
cd backend
npm run start:identity
npm run start:operation
npm run start:reporting
npm run start:gateway
# commerce currently has DI startup error (see troubleshooting)

cd ../UI-PHARMACY
npm run dev -- --host 0.0.0.0 --port 5173
```

## 7) Health checks
- `GET http://localhost:3000/api/health`
- `GET http://localhost:3001/api/health`
- `GET http://localhost:3003/health`
- `GET http://localhost:3004/health`

## 8) E2E
```bash
cd UI-PHARMACY
npm run test:e2e
npm run test:e2e:commerce
npm run test:e2e:operation
npm run test:e2e:reporting
npm run test:e2e:full-demo
```

## 9) Demo account
- Username: `admin`
- Password: `admin123`
