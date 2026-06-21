# SPEC: BE-01 — Auth (Đăng ký / Đăng nhập)
> Phase 1 · Sprint 1 · Backend

## Mô tả
API xác thực cơ bản: đăng ký tài khoản mới và đăng nhập, trả về JWT access token.

## Database Schema

```sql
-- users (Phase 1: bảng đơn cho cả auth + profile)
-- Phase 2: nên tách user_profiles khi thêm field manager/HR
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  role        VARCHAR(50) DEFAULT NULL,  -- null = chưa onboard
  ai_level    VARCHAR(20) DEFAULT NULL,  -- beginner | basic | frequent
  onboarded_at TIMESTAMP DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

> **Tradeoff ghi chú:** Phase 1 dùng 1 bảng `users` cho cả auth concern (`password_hash`) và profile concern (`role`, `ai_level`). Đây là quyết định đơn giản hóa cho MVP. Phase 2 nên tách `user_profiles` khi thêm nhiều field hơn.

## API Endpoints

### POST /api/auth/register
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Nguyễn Văn A"
}
```
**Response 201:**
```json
{
  "token": "eyJhbGc...",
  "user": { "id": "...", "email": "...", "name": "...", "role": null }
}
```
**Errors (theo Standard Error Format):**
- `409`: `{ "error": { "code": "CONFLICT", "message": "Email đã tồn tại" } }`
- `400`: `{ "error": { "code": "VALIDATION_ERROR", "message": "Thiếu thông tin bắt buộc", "details": { "fields": ["email"] } } }`

### POST /api/auth/login
**Request:**
```json
{ "email": "user@example.com", "password": "password123" }
```
**Response 200:**
```json
{
  "token": "eyJhbGc...",
  "user": { "id": "...", "email": "...", "name": "...", "role": "sales" }
}
```
**Errors:**
- `401`: `{ "error": { "code": "UNAUTHORIZED", "message": "Email hoặc mật khẩu không đúng" } }`

### POST /api/auth/logout
**Response 200:** `{ "ok": true }`

## Task Checklist

### Setup
- [ ] Cài `bcrypt` (hash password)
- [ ] Cài `jsonwebtoken` hoặc `jose`
- [ ] Tạo `JWT_SECRET` trong `.env`
- [ ] Tạo bảng `users` trong DB

### Code
- [ ] `POST /api/auth/register` — validate, hash password, lưu DB, trả token
- [ ] `POST /api/auth/login` — tìm user, compare hash, trả token
- [ ] `POST /api/auth/logout` — invalidate token (blacklist hoặc client-side clear)
- [ ] Middleware `requireAuth(req)` — verify token, gắn `req.user`

### Test thủ công
- [ ] Đăng ký email mới → 201 + token
- [ ] Đăng ký email đã có → 409
- [ ] Login đúng → 200 + token
- [ ] Login sai password → 401
- [ ] Gọi protected route có token → pass
- [ ] Gọi protected route không có token → 401

### Security
- [ ] Password không bao giờ lưu plain text
- [ ] Token expire (ví dụ: 7 ngày)
- [ ] Rate-limit login endpoint (chống brute force) — optional Phase 1

### Password Validation
- [ ] Min length: 8 chars
- [ ] Max length: 128 chars
- [ ] Phase 1: không yêu cầu complexity (uppercase/lowercase/special char)
- [ ] Password quá ngắn/dài → trả `VALIDATION_ERROR` với message rõ ràng

## Dependencies
- Không có dependency vào task khác
- Blocked by: không có

## Owner
- BE dev (assign khi planning sprint)

## Definition of Done
- [ ] Endpoint đã deploy lên môi trường dev/staging
- [ ] Postman collection hoặc curl examples đã test pass
- [ ] Không có plain text password trong DB
- [ ] Error response đúng Standard Error Format (xem PHASE1-SPEC.md)
