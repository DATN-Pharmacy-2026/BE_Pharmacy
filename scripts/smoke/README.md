# Smoke Scripts

## Files
- `demo-smoke.sh`: backend + gateway + auth + core domain API smoke.
- `frontend-demo-smoke.sh`: quick FE + gateway reachability smoke.
- `api-smoke.http`: manual request collection for REST client tools.

## Run
```bash
bash scripts/smoke/demo-smoke.sh
bash scripts/smoke/frontend-demo-smoke.sh
```

## Requirements
- Gateway running at `API_BASE_URL` (default `http://localhost:3000`).
- Frontend running at `FRONTEND_BASE_URL` for FE smoke.
- Seeded admin account for full demo smoke.

## Notes
- Smoke scripts do not require real payment provider, SMTP, printer, or websocket.
- Smoke scripts do not require `jq`.
