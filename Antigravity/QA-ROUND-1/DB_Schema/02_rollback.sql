-- =============================================================================
-- Yuval Studio - QA Round 1 Migration Rollback Script
-- Note: Reverts schema additions only if no dependent traffic relies on them.
-- Does NOT re-enable insecure USING (true) policies on PII/settings tables.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Catalog services public read" ON public.services;
DROP POLICY IF EXISTS "Catalog gallery public read" ON public.gallery;

DROP INDEX IF EXISTS public.idx_appointments_active_window;
DROP INDEX IF EXISTS public.idx_waitlist_requests_created_at;

-- Remove newly added waitlist_requests table and jewelry_orders notification columns
DROP TABLE IF EXISTS public.waitlist_requests;
ALTER TABLE public.jewelry_orders DROP COLUMN IF EXISTS notification_error;
ALTER TABLE public.jewelry_orders DROP COLUMN IF EXISTS notification_status;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS coupon_code;

COMMIT;
