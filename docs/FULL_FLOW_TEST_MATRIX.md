# Full Flow Test Matrix

## Muc tieu
Test day du tu web ban hang online den admin theo dung danh sach man hinh.

## Dieu kien truoc khi test
1. Chay setup data:
```powershell
cd BE
npm run demo:full:setup
```
2. Start backend:
```powershell
cd BE
npm run start:dev:all
```
3. Start frontend:
```powershell
cd FE
npm install
npm run dev
```
4. Mo web:
- FE: `http://localhost:4000` (hoac port Vite dang hien)
- API Gateway: `http://localhost:3000/api`

## Tai khoan test
- Admin: `admin / admin123`
- Company Admin: `companyadmin / 123456`
- Branch Manager: `manager.branch1 / 123456`
- Cashier: `cashier.branch1 / 123456`
- Pharmacist: `pharmacist.branch1 / 123456`
- Inventory: `inventory.branch1 / 123456`
- Customer Service: `cs.branch1 / 123456`
- Customer: `customer1 / 123456`, `customer2 / 123456`

## Luong web ban hang online (Customer)
1. Dang nhap `customer1`.
2. Vao danh sach san pham, xem chi tiet.
3. Them gio hang.
4. Checkout.
5. Vao don hang cua toi, xem lich su.

## Luong admin day du (Admin)
Test lan luot cac man:
1. Tong quan
2. Nguoi dung
3. Vai tro
4. San pham
5. Danh muc
6. Thuong hieu
7. Don hang
8. Thanh toan
9. Chi nhanh
10. Kho
11. Ton kho
12. Lo hang
13. Phieu de xuat mua
14. Phieu nhap kho
15. Chuyen kho
16. Ban hang POS
17. Bao cao
18. Xuat bao cao
19. Thong bao
20. Cau hinh thong bao
21. Mau thong bao
22. Nhat ky hoat dong
23. Cai dat

## Ky vong du lieu co san
- Don online mau: `ONL-2026-0001`, `ONL-2026-0002`
- PO: `PO-2026-0001`
- Goods receipt: `GR-2026-0001`
- Stock transfer: `TR-2026-0001`
- Shipment: `SHIP-2026-0001`
- POS order: `POS-2026-0001`
- Receipt: `RCP-2026-0001`
- Batch: `BATCH-PARA-2601`

## Smoke nhanh tu dong
```powershell
cd BE
npm run test:demo
```

Neu login bi `429` do throttle, doi vai giay roi chay lai.
