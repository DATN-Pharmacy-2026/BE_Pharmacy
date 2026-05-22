# DEMO CHECKLIST

## Pre-demo
- [ ] Backend build passed
- [ ] Frontend build passed
- [ ] Prisma seed passed
- [ ] Gateway running (`:3000`)
- [ ] Identity running (`:3001`)
- [ ] Operation running (`:3003`)
- [ ] Reporting running (`:3004`)
- [ ] Frontend running (`:5173`)

## Functional checks
- [ ] Login with `admin/admin123`
- [ ] Dashboard opens
- [ ] Inventory opens
- [ ] FEFO opens
- [ ] POS opens
- [ ] Notifications page opens
- [ ] Audit logs page opens

## Tests
- [ ] `npm run test:e2e:full-demo` passed
- [ ] Failures (if any) documented
