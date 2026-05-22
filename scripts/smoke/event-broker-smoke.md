# Event Broker Smoke

1. Start infra:
```bash
docker compose up -d rabbitmq
```

2. Start services:
```bash
npm run start:identity
npm run start:commerce
npm run start:operation
npm run start:reporting
npm run start:gateway
```

3. Verify gateway + service health.

4. Trigger payment gateway flow in commerce until a callback updates transaction status.

5. Verify commerce outbox:
- check `EventOutbox` rows in `pharmacy_commerce`.

6. Publish outbox manually in reporting debug (foundation endpoint):
```bash
curl -X GET http://localhost:3004/api/events/outbox
```

7. Verify reporting inbox idempotency:
- same eventId should not be processed twice.

8. Verify correlation propagation:
- send `x-correlation-id` on gateway request and confirm same value in outbox row payload.

9. Duplicate event test:
- call event processing path with same eventId; verify inbox `PROCESSED` once and duplicate skipped.

10. Build check:
```bash
npm run build:all
```
