# Environment Variables & Production Rollout Checklist (QA Round 1)

## 1. Required Vercel Server Environment Variables

Set these strictly as **Server / Sensitive** environment variables in Vercel (DO NOT prefix with `VITE_` except `VITE_GOOGLE_CLIENT_ID`):

| Variable | Scope | Purpose / Requirements |
|---|---|---|
| `DATABASE_URL` | Server | Neon PostgreSQL connection string (`neonStore.ts`). |
| `SESSION_SECRET` | Server | Random high-entropy secret (>= 32 chars, minimum 16 chars enforced in production) used to sign `ys_session` HMAC-SHA256 cookies. |
| `ADMIN_EMAILS` | Server | Comma/space-separated allowlist of authorized admin Google email addresses (e.g. Yuval's owner Google email). |
| `GOOGLE_CLIENT_ID` | Server | Google OAuth Client ID verified server-side against Google tokeninfo / userinfo during `/api/auth/google`. |
| `VITE_GOOGLE_CLIENT_ID` | Client (Public) | Google OAuth Client ID for Google Identity Services popup on the browser. Public identifier only. |
| `GEMINI_API_KEY` | Server | Google Gemini API key used strictly inside `api/_lib/aiStylist.ts` (`POST /api/ai/stylist`). Never expose as `VITE_GEMINI_API_KEY`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Server | Cloudinary credentials used strictly inside `api/_lib/cloudinary.ts`. Never expose API secret in `VITE_*`. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Server | Studio notification bot credentials (prefer env vars over DB `settings` rows; stripped from public `/api/bootstrap`). |
| `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `NOTIFICATION_EMAIL` | Server | Notification email configuration used server-side in `api/_lib/notifications.ts`. |

> Any legacy `VITE_GEMINI_API_KEY`, `VITE_CLOUDINARY_*`, `VITE_TELEGRAM_*`, or client-bundle secrets previously set in Vercel or `.env.local` should be deleted from client builds cleanly (`vite` embeds `VITE_*` variables into browser JS).

---

## 2. Owner Security Actions (Mandatory Before Declaring P0 Closed in Live Prod)

1. **Rotate Exposed Credentials**:
   - The legacy client-side admin passcode that existed in prior production JS bundles must be considered compromised. If that passcode was reused for any external account, database, hosting, or social login, rotate it immediately.
   - Rotate Gemini, Cloudinary, and Telegram credentials if they were previously shipped in `VITE_*` client env vars or stored in unauthenticated public `settings` rows before DB migration.
2. **Apply Database Migration**:
   - Execute `Antigravity/QA-ROUND-1/DB_Schema/01_security_and_hardening.sql` on Neon PostgreSQL / Supabase SQL editor.
   - Verify no `USING (true)` policies remain on `appointments`, `profiles`, `settings`, `expenses`, `jewelry_orders`, or `waitlist_requests`.
3. **Seed Authorized Admin Email**:
   - Ensure `ADMIN_EMAILS` is configured in Vercel with Yuval's verified Google email and ensure her `profiles.role` row in Postgres is `'admin'` (automatically promoted when matching `ADMIN_EMAILS`).
4. **Access Log Review**:
   - Review Neon query logs / Cloudinary upload history / historical booking & order rows with the owner for unexpected entries created while client-side settings/DB policies were permissive.

---

## 3. Initial Live Verification Checklist After Deploy (Requires Live Env)

Because automated tests ran against isolated `MemoryStore` fixtures with zero mutations to live customer data, perform these live smoke checks with the owner after deploying:

1. Visit `/#/admin` signed out -> confirm zero password input, Google Sign-In gate only.
2. Inspect browser DevTools Network response for `/api/bootstrap` -> confirm `coupons`, `monthly_goals`, `telegram_bot_token`, `telegram_chat_id`, `emailjs_*`, `notification_email` are absent/undefined.
3. Sign in with non-admin Google account and call `/api/admin/dashboard` -> confirm `403`.
4. Sign in with owner's allowlisted Google email -> confirm `ys_session` (`HttpOnly`) cookie grants access to `/#/admin`, open Admin working hours for desired days and confirm `booking_horizon_days` (`30` default).
5. Create and cancel one controlled test booking + one controlled test order (after owner confirms WhatsApp/Telegram test window), verifying end-to-end persistence and notification delivery.
