# Yuval Studio - QA Round 1 Production Hardening & Upgrades Summary

## Scope Implemented

### P0 - Security Containment & Server Session Authentication
- Removed the hardcoded client-side admin passcode and password form entirely from `pages/Admin.tsx` and browser bundles (`0` hits in `scripts/audit-bundle.mjs` across `48` `dist/` artifacts).
- Added HMAC-SHA256 signed `HttpOnly; SameSite=Lax; Path=/` session cookie (`ys_session`) via `api/_lib/auth.ts`, minted after server-verified Google OAuth (`POST /api/auth/google`), checking `ADMIN_EMAILS` / DB `profiles.role`.
- Protected every `/api/admin/*`, `/api/settings` (PUT), `/api/services`, `/api/gallery`, and `/api/orders` (GET/PUT/DELETE) endpoint with fail-closed `401`/`403` enforcement inside `api/_lib/handler.ts`.
- Split public DTO vs private studio settings in `api/_lib/sanitize.ts`: `/api/bootstrap` strips `monthly_goals`, `coupons`, notification tokens/emails, and never exposes raw appointment rows (availability computes busy intervals server-side via `/api/availability`).
- Moved Gemini AI Stylist (`POST /api/ai/stylist`) and Cloudinary uploads (`POST /api/upload`) behind server endpoints (`api/_lib/aiStylist.ts`, `api/_lib/cloudinary.ts`).

### P1-A - Numeric Money Arithmetic (Integer Agorot) & Server Recomputation
- Built `shared/money.ts` (`tryParsePriceToAgorot`, `parsePriceToAgorot`, `agorotToShekels`, `parsePriceToShekels`, `sumAgorot`, `multiplyAgorot`, `applyPercentageDiscountAgorot`, `calculateAppointmentPricing`, `formatILS`) so DB decimals like `"90.00"` never concatenate as `"090.00120.000"`.
- Normalized prices at data/API boundary and unified UI formatting via `components/Money.tsx` (`<bdi dir="ltr">`).
- Server recomputes authoritative booking & order totals in `api/_lib/handler.ts` from canonical DB service/inventory records, guarding against `NaN`, negatives, invalid coupons (`קופון לא נמצא`), and zero/quantity abuse.

### P1-B - Order Durability, Idempotency & Notification Isolation
- Removed dangerous localStorage fake-success fallbacks in `services/mockApi.ts` / checkout flows.
- `POST /api/orders` validates items, stock availability (`409` on out-of-stock/insufficient stock), Israeli phone (`shared/validation.ts`), delivery method/address, and idempotency keys (`Idempotency-Key` / deterministic key UUID in `NeonStore` & `MemoryStore`), returning unique server references (`YV-YYYYMMDD-XXXXXX`).
- Separated durable DB persistence from notification delivery (`notification_status` / `notification_error`): failed inserts return HTTP `500` with accessible inline Hebrew errors and local draft preservation (`טיוטה שלא נשלחה`); stored orders with delayed notifications remain persisted and surface truthful status + WhatsApp handoff.
- Made WhatsApp action labels explicit (`שמור הזמנה באתר ופתח בוואטסאפ`) before calling server persistence (`components/jewelry/useJewelryCheckout.ts`, `components/jewelry/JewelryCartDrawer.tsx`, `components/jewelry/QuickBuyModal.tsx`).

### P1-C - Authoritative Shipping Policy Single Source of Truth
- Confirmed owner decision (`A1`): **`35 ₪`** courier delivery, free shipping at **`250 ₪`** and above (inclusive, goods subtotal), free studio pickup (`0 ₪`).
- Unified rules in `shared/shipping.ts` (`AUTHORITATIVE_SHIPPING_POLICY`, `resolveShippingPolicy`, `calculateJewelryOrderPricing`) and synchronized `pages/Jewelry.tsx`, `components/jewelry/JewelryCartDrawer.tsx`, `components/jewelry/QuickBuyModal.tsx`, `pages/ShippingPolicy.tsx`, WhatsApp draft builders (`services/notifications.ts`), and `api/_lib/handler.ts`.

### P1-D - Availability, DST-Safe Windows, Horizon & Waitlist
- Implemented `shared/availability.ts` handling both numeric (`9` / `20`) and `"HH:mm"` strings, Asia/Jerusalem timezone / DST boundaries, slot overlap checks (`409` under Neon transaction advisory lock + conflict check), configurable `booking_horizon_days` (default `30`), and fail-closed `503` when DB availability fails.
- Preserved live closed-schedule truth while adding explicit calendar status banners and an inline waitlist form (`POST /api/waitlist`, stored in `waitlist_requests` or JSONB fallback) plus WhatsApp handoff (`pages/Booking.tsx`).

### P1-E, P1-F, P2 & U1–U4 Upgrades
- **P1-E**: `shared/serviceInfo.ts` (`extractHealingTime`, `getPainDisplay`) parses true healing windows cleanly (`6–8 שבועות`) without falling back to unrelated descriptions, and renders numeric `0` pain levels accurately; aligned home aftercare timeline & aftercare portal terminology.
- **P1-F & Modals**: Added `hooks/useDialogA11y.ts` (initial focus, Focus Trap `Tab`/`Shift+Tab`, `Escape` close, focus restoration) and fixed `CookieSettingsModal.tsx` & `components/ui.tsx` `Modal` so `role="dialog" aria-modal="true"` sits directly on the dialog container rather than backdrop wrappers; updated `SignaturePad` in `pages/Booking.tsx` to track strokes via `isDrawingRef` so fast pointer strokes reliably save signatures.
- **P2**: `components/ProtectedRoute.tsx` preserves clean Hebrew RTL signed-out CTA instead of empty blank outlet; sanitized image URLs; static legal revision date `14 בנובמבר 2026` + draft notice in `shared/release.ts`; Instagram link `https://www.instagram.com/yuval_studio`; pluralization helper; Google Maps coordinates + navigation fallback.
- **U1–U4**: Guest wishlist persistence (`localStorage` + merge upon sign-in), inventory live search + stock/material/category filters (`pages/Jewelry.tsx`), pre-submission final review card on consent step (`pages/Booking.tsx`), client receipt download/print modal (`components/dashboard/ReceiptModal.tsx`).

---

## Verification Ledger

### Executed & Passed (After Final Edit)
- `npm run typecheck` (`tsc --noEmit`): exit code `0`.
- `npm test` (`node scripts/run-unit-tests.mjs`): `9/9` subtests passed (`pass 9, fail 0, skipped 0`).
- `npm run build` (`vite build`): exit code `0` (`dist/` built cleanly in `8.19s`).
- `npm run audit:bundle` (`node scripts/audit-bundle.mjs`): exit code `0`, `48` artifacts in `dist/` passed with zero exposed secrets/passwords/DB URIs.
- `npm run test:e2e` (`node tests/e2e.puppeteer.mjs` against isolated `MemoryStore` staging server): exit code `0` across Desktop `1280x800`, Mobile `390x844`, Mobile `360x800`, zero horizontal overflow, zero floating widget overlap, verified screenshots inspected visually.

### Live Production Flows Still Unverified (Requires Owner Deployment & Secrets)
- Live Google Identity Services OAuth popup sign-in & admin email login against production Vercel URL.
- Execution of `DB_Schema/01_security_and_hardening.sql` & verification against live Neon PostgreSQL instance.
- Live delivery of Telegram / EmailJS / WhatsApp studio notifications and live booking/order/GDPR consent submissions.
