# Identity Service

Owns authentication identity and RBAC data model.

## Run
```bash
npm run start:identity
```

## Health
- `GET /health`

## Prisma Schema
- `prisma/identity/schema.prisma`

## Ownership
- Users, roles, permissions
- User branch access
- User warehouse access
- Sessions and token tables
