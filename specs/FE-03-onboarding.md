# SPEC: FE-03 — Onboarding (Chọn vai trò)
> Phase 1 · Sprint 1 · Frontend

## Mô tả
Màn hình xuất hiện lần đầu sau khi đăng ký. Người dùng chọn vai trò để hệ thống cá nhân hóa lộ trình học. Bắt buộc hoàn thành, không thể skip.

## UI Flow

```
/onboarding
  Step 1: Chọn vai trò  ──────────────────
  │ [Kinh doanh] [Kế toán] [Marketing]    │
  │ [Vận hành]   [Khác]                   │
  └──────────────────────────────────────

  Step 2: Trình độ AI hiện tại (optional)
  │ ○ Mới bắt đầu (chưa dùng AI bao giờ) │
  │ ○ Đã biết cơ bản (đã thử vài lần)    │
  │ ○ Dùng thường xuyên                   │
  └──────────────────────────────────────

  → Nút "Bắt đầu học" → gọi API → redirect /home
```

## Component Breakdown

```
pages/onboarding/
  index.tsx          ← page wrapper
  
components/onboarding/
  RoleCard.tsx       ← card chọn vai trò (icon + label)
  LevelSelector.tsx  ← radio group trình độ
  OnboardingShell.tsx ← progress bar + step wrapper
```

## Design Spec

### Role Cards
| Role | Icon (emoji) | Label |
|------|-------------|-------|
| sales | 💼 | Kinh doanh / Sales |
| accounting | 🧾 | Kế toán |
| marketing | 📣 | Marketing |
| operations | ⚙️ | Vận hành |
| other | 👤 | Khác |

- Card size: ~160×120px (desktop), full-width stack (mobile)
- Selected state: border accent + background tint
- Hover: subtle scale(1.02) + shadow

### States
- Default: chưa chọn gì → nút "Tiếp theo" disabled
- Selected: 1 card highlight → nút enabled
- Loading: nút "Bắt đầu học" → spinner

## API Integration

```typescript
// Step 1 submit
PUT /api/user/me/role
Body: { role: "sales", ai_level: "beginner" }

// Redirect sau khi success
router.push('/home')
```

## Task Checklist

### Setup & Routing
- [ ] Tạo route `/onboarding` (protected — cần login)
- [ ] Route guard: nếu user đã onboard (`onboarded_at` không null) → redirect `/home`
- [ ] Route guard: nếu chưa login → redirect `/login`

### UI Components
- [ ] `RoleCard` component: icon + label + selected state + hover animation
- [ ] `LevelSelector` component: 3 radio options
- [ ] Step indicator (Step 1/2 hoặc progress dots)
- [ ] Nút "Tiếp theo" / "Bắt đầu học"
- [ ] Loading state khi submit

### Logic
- [ ] State: `selectedRole`, `selectedLevel`
- [ ] Validation: `selectedRole` bắt buộc, `selectedLevel` optional
- [ ] Gọi `PUT /api/user/me/role` khi submit
- [ ] Error handling: nếu API fail → toast error, không redirect
- [ ] Success → redirect `/home`

### Test thủ công
- [ ] Đăng ký mới → redirect đúng `/onboarding`
- [ ] Chưa chọn role → nút Next disabled
- [ ] Chọn role → nút enabled
- [ ] Submit → redirect `/home`
- [ ] Login lại (đã onboard) → không bị redirect về `/onboarding`
- [ ] Responsive: mobile + desktop

### Accessibility
- [ ] Role card có `aria-selected`
- [ ] Keyboard navigation (Tab + Enter để chọn)

## Dependencies
- Cần: BE-01 (auth) + BE-02 (update role API)
- Sau task này: FE-04 (Home) có thể dùng role để fetch lộ trình

## Owner
- FE dev

## Definition of Done
- [ ] Màn onboarding hiển thị đẹp trên mobile và desktop
- [ ] Chọn role → lưu đúng DB (kiểm tra qua `GET /api/user/me`)
- [ ] Không thể skip hoặc vào `/home` khi chưa onboard
