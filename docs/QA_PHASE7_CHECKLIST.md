# Phase 7 QA Checklist

## 1) Role & Permission Matrix

### Admin
- Access được toàn bộ admin routes: dashboard, users, roles, settings, reports.
- CRUD users/roles thành công.
- Xem và thao tác kho, tồn kho, đơn hàng, thanh toán, báo cáo.

### Pharmacist
- Truy cập được POS, giỏ hàng/đơn hàng liên quan bán hàng.
- Xem sản phẩm.
- Chỉ xem tồn kho theo phạm vi được cấp.
- Không truy cập được các màn quản trị hệ thống (users/roles/settings toàn cục).

### Customer
- Chỉ truy cập web public: products, cart, checkout.
- Chỉ xem đơn hàng của chính mình.
- Không truy cập được admin routes.

## 2) FE Smoke
- Đăng nhập theo từng role và điều hướng nhanh các trang chính.
- Kiểm tra 403/redirect đúng khi vào route không có quyền.
- Kiểm tra không còn i18n key thô hiển thị ra UI.

## 3) BE Smoke
- Auth: login/logout/refresh.
- Identity: users/roles/permissions APIs theo role.
- Commerce: products/orders/payments detail.
- Operation: goods-receipt/stock-transfer/FEFO/POS receipt endpoints.
- Reporting: dashboard KPI/report jobs/export endpoints.

## 4) Deterministic Seed
- Seed chạy nhiều lần cho kết quả ổn định.
- Dùng `SEED_BASE_DATE` để cố định dữ liệu mốc thời gian.
- Verify không dùng thời gian runtime không kiểm soát trong seed logic.

## 5) i18n Validation
- So khớp key `vi` và `en` theo từng namespace.
- Kiểm tra placeholder/label/common text lặp đã dùng key chung.
- Spot-check các trang: Users, Permissions, Reports, Payments, ProductFilters.

## 6) Build & Integration Gate
- FE build thành công.
- BE build/test demo không lỗi compile.
- FE gọi được BE endpoints chính (không còn `demo/unavailable` cho luồng core).
