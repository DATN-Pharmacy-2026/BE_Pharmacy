# Gateway Service

Main backend entrypoint for frontend clients.

## Run
```bash
npm run start:gateway
```

## Endpoints
- Swagger: `http://localhost:3000/docs`
- Health: `GET http://localhost:3000/api/health`

## Notes
- Uses global prefix `/api`
- Enables CORS for local FE origins
- Uses shared libs: `@app/common`, `@app/config`, `@app/logger`
- Current `modules/*` folders are placeholders for downstream routing/proxy work
