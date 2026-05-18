# Event Retry / DLQ Smoke

1. Start RabbitMQ:
```bash
docker compose up rabbitmq
```
2. Start services:
```bash
npm run start:commerce
npm run start:operation
npm run start:reporting
npm run start:gateway
```
3. Publish success event through reporting test endpoint.
4. Confirm `EventInbox` is `PROCESSED` and no `EventFailure` created.
5. Publish payment event missing `transactionId`.
6. Confirm `EventFailure.status` becomes `DLQ` or `POISON` and no infinite loop.
7. Call `GET /api/reporting-events/failures/summary`.
8. Dry-run replay:
```json
{ "mode": "REPLAY_ORIGINAL", "reason": "Smoke dry run", "dryRun": true }
```
9. Real replay:
```json
{ "mode": "REPLAY_ORIGINAL", "reason": "Smoke replay" }
```
10. Confirm `EventReplayAudit` row created and correlation id preserved.
