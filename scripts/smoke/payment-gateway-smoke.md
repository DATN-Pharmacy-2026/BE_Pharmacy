# Payment Gateway Smoke (Sandbox)

1. Start services:
- `npm run start:commerce`
- `npm run start:gateway`

2. Check providers:
- `curl http://localhost:3000/api/payment-gateways/providers`

3. Create order via existing checkout flow, then get pending payment id.

4. Initiate transaction:
```bash
curl -X POST http://localhost:3000/api/payment-gateways/initiate \
  -H "Content-Type: application/json" \
  -d '{"provider":"VNPAY","paymentId":"<payment-id>","idempotencyKey":"smoke-1"}'
```

5. Verify transaction list:
- `curl http://localhost:3000/api/payment-gateways/transactions`

6. Verify return endpoint does not mark paid blindly:
- `curl "http://localhost:3000/api/payment-gateways/vnpay/return?vnp_TxnRef=<providerOrderId>"`

7. Simulate callback with valid signed payload in sandbox and confirm transaction/payment status updates.

8. Replay callback and verify idempotent result.

9. Send invalid signature payload and verify clean rejection with no PAID update.

10. Confirm COD/MOCK checkout still works.
