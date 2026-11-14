import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { DEFAULT_MONTHLY_GOALS, DEFAULT_STUDIO_DETAILS, DEFAULT_WORKING_HOURS } from '../../constants.js';
import { parsePriceToShekels } from '../../shared/money.js';
import type {
  Appointment,
  Coupon,
  Expense,
  GalleryItem,
  JewelryOrder,
  Profile,
  Service,
  StudioSettings,
} from '../../types.js';
import {
  buildDefaultRawSettings,
  deterministicUuidFromKey,
  evaluateCouponAgainstTotal,
  generateUniqueOrderNumber,
  incrementCouponUsageList,
  normalizeInventoryItem,
  normalizeServiceRow,
  normalizeWorkingHoursMap,
  sanitizeProfile,
  toPublicSettingsDto,
} from './sanitize.js';
import type { PublicStudioSettingsDto, ServerGoogleUserInfo, StoreAdapter, WaitlistEntry } from './types.js';

type NeonSql = ReturnType<typeof neon>;

function mapAppointmentRow(row: any): Appointment {
  return {
    id: String(row.id),
    client_id: row.client_id || undefined,
    client_name: row.guest_name || row.profile_name || 'לקוח מזדמן',
    client_email: row.guest_email || row.profile_email || undefined,
    client_phone: row.guest_phone || row.profile_phone || '',
    service_id: row.service_id || '',
    service_name: row.service_name || row.joined_service_name || 'טיפול כללי',
    service_price: row.joined_service_price !== undefined && row.joined_service_price !== null
      ? parsePriceToShekels(row.joined_service_price, 0)
      : undefined,
    start_time: new Date(row.start_time).toISOString(),
    end_time: new Date(row.end_time).toISOString(),
    price: row.price !== null && row.price !== undefined ? parsePriceToShekels(row.price, 0) : 0,
    final_price:
      row.final_price !== null && row.final_price !== undefined
        ? parsePriceToShekels(row.final_price, 0)
        : row.price !== null && row.price !== undefined
          ? parsePriceToShekels(row.price, 0)
          : 0,
    status: row.status || 'pending',
    notes: row.notes || undefined,
    signature: row.signature || undefined,
    total_cost: row.total_cost !== null && row.total_cost !== undefined ? parsePriceToShekels(row.total_cost, 0) : undefined,
    total_profit: row.total_profit !== null && row.total_profit !== undefined ? parsePriceToShekels(row.total_profit, 0) : undefined,
    cart_items: Array.isArray(row.cart_items) ? row.cart_items : undefined,
    visual_plan: row.visual_plan || undefined,
    ai_recommendation_text: row.ai_recommendation_text || undefined,
    anatomy_image_url: row.anatomy_image_url || undefined,
    anatomy_status: row.anatomy_status || undefined,
    anatomy_review_comment: row.anatomy_review_comment || undefined,
    is_under_16: Boolean(row.is_under_16),
    parent_name: row.parent_name || undefined,
    parent_id: row.parent_id || undefined,
    parent_phone: row.parent_phone || undefined,
    coupon_code: row.coupon_code || undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

function mapOrderRow(row: any): JewelryOrder {
  return {
    id: String(row.id),
    order_number: String(row.order_number),
    client_name: String(row.client_name),
    client_phone: String(row.client_phone),
    client_email: row.client_email || undefined,
    items: Array.isArray(row.items)
      ? row.items.map((item: any) => ({
          ...item,
          price: parsePriceToShekels(item?.price, 0),
          quantity: Number(item?.quantity) || 1,
        }))
      : [],
    total_price: parsePriceToShekels(row.total_price, 0),
    delivery_method: row.delivery_method === 'pickup' ? 'pickup' : 'delivery',
    shipping_address: row.shipping_address || undefined,
    shipping_cost: parsePriceToShekels(row.shipping_cost, 0),
    status: row.status || 'pending',
    notes: row.notes || undefined,
    notification_status: row.notification_status || undefined,
    notification_error: row.notification_error || undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export class NeonStore implements StoreAdapter {
  private sql: NeonSql;
  private hasWaitlistTableCache: boolean | null = null;
  private hasOrderNotifColsCache: boolean | null = null;
  private hasHealingTimeColCache: boolean | null = null;
  private schemaEnsured: Promise<void> | null = null;

  constructor(databaseUrl: string) {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing');
    }
    this.sql = neon(databaseUrl);
  }

  private async runSafeDdl(label: string, exec: () => Promise<unknown>): Promise<void> {
    try {
      await exec();
    } catch (err) {
      console.warn(`[NeonStore.ensureSchema] Non-fatal DDL skip (${label}):`, (err as any)?.message || err);
    }
  }

  private async runSchemaEnsure(): Promise<void> {
    await Promise.all([
      this.runSafeDdl('appointments_columns', () =>
        this.sql`
          ALTER TABLE public.appointments
            ADD COLUMN IF NOT EXISTS end_time timestamptz,
            ADD COLUMN IF NOT EXISTS total_duration_minutes integer,
            ADD COLUMN IF NOT EXISTS final_price numeric(10, 2),
            ADD COLUMN IF NOT EXISTS original_price numeric(10, 2),
            ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2),
            ADD COLUMN IF NOT EXISTS coupon_code text,
            ADD COLUMN IF NOT EXISTS is_under_16 boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS parent_name text,
            ADD COLUMN IF NOT EXISTS parent_id text,
            ADD COLUMN IF NOT EXISTS parent_phone text,
            ADD COLUMN IF NOT EXISTS total_cost numeric(10, 2),
            ADD COLUMN IF NOT EXISTS total_profit numeric(10, 2),
            ADD COLUMN IF NOT EXISTS cart_items jsonb,
            ADD COLUMN IF NOT EXISTS visual_plan text,
            ADD COLUMN IF NOT EXISTS ai_recommendation_text text,
            ADD COLUMN IF NOT EXISTS anatomy_image_url text,
            ADD COLUMN IF NOT EXISTS anatomy_status text,
            ADD COLUMN IF NOT EXISTS signature text
        `
      ),
      (async () => {
        await this.runSafeDdl('jewelry_orders_table', () =>
          this.sql`
            CREATE TABLE IF NOT EXISTS public.jewelry_orders (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              order_number text UNIQUE NOT NULL,
              client_name text NOT NULL,
              client_phone text NOT NULL,
              client_email text,
              items jsonb NOT NULL DEFAULT '[]'::jsonb,
              total_price numeric(10, 2) NOT NULL CHECK (total_price >= 0),
              delivery_method text NOT NULL DEFAULT 'pickup' CHECK (delivery_method IN ('pickup', 'delivery')),
              shipping_address text,
              shipping_cost numeric(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
              status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
              notes text,
              notification_status text NOT NULL DEFAULT 'pending',
              notification_error text,
              created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
            )
          `
        );
        await this.runSafeDdl('jewelry_orders_columns', () =>
          this.sql`
            ALTER TABLE public.jewelry_orders
              ADD COLUMN IF NOT EXISTS items_total numeric(10, 2),
              ADD COLUMN IF NOT EXISTS shipping_cost numeric(10, 2) NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS idempotency_key text,
              ADD COLUMN IF NOT EXISTS notification_status text NOT NULL DEFAULT 'pending',
              ADD COLUMN IF NOT EXISTS notification_error text
          `
        );
      })(),
      this.runSafeDdl('waitlist_requests_table', () =>
        this.sql`
          CREATE TABLE IF NOT EXISTS public.waitlist_requests (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            client_name text NOT NULL,
            client_phone text NOT NULL,
            preferred_date text,
            service_names text,
            notes text,
            created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
          )
        `
      ),
    ]);
  }

  private ensureSchema(): Promise<void> {
    if (!this.schemaEnsured) {
      this.schemaEnsured = this.runSchemaEnsure();
    }
    return this.schemaEnsured;
  }

  private async hasTable(tableName: string): Promise<boolean> {
    const rows = (await this.sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
      LIMIT 1
    `) as any[];
    return rows.length > 0;
  }

  private async hasColumn(tableName: string, colName: string): Promise<boolean> {
    const rows = (await this.sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName} AND column_name = ${colName}
      LIMIT 1
    `) as any[];
    return rows.length > 0;
  }

  private async checkOrderNotifCols(): Promise<boolean> {
    if (this.hasOrderNotifColsCache === null) {
      this.hasOrderNotifColsCache = await this.hasColumn('jewelry_orders', 'notification_status');
    }
    return this.hasOrderNotifColsCache;
  }

  private async checkHealingTimeCol(): Promise<boolean> {
    if (this.hasHealingTimeColCache === null) {
      this.hasHealingTimeColCache = await this.hasColumn('services', 'healing_time');
    }
    return this.hasHealingTimeColCache;
  }

  async getRawSettings(): Promise<StudioSettings> {
    await this.ensureSchema();
    const base = buildDefaultRawSettings();
    const rows = (await this.sql`
      SELECT key, value FROM settings
      WHERE key IN (
        'working_hours', 'studio_details', 'monthly_goals', 'gallery_tags',
        'coupons', 'enable_ai', 'enable_gallery', 'enable_style_matcher',
        'show_pain_level', 'enable_ar', 'whatsapp_templates', 'inventory_items',
        'booking_horizon_days', 'shipping_fee', 'free_shipping_threshold', 'shipping_eta',
        'enable_telegram_notifications', 'telegram_bot_token', 'telegram_chat_id',
        'enable_email_notifications', 'emailjs_service_id', 'emailjs_template_id',
        'emailjs_public_key', 'notification_email', 'enable_calendar_sync'
      )
    `) as Array<{ key: string; value: any }>;

    for (const row of rows) {
      switch (row.key) {
        case 'working_hours':
          base.working_hours = normalizeWorkingHoursMap(row.value);
          break;
        case 'studio_details':
          base.studio_details = { ...DEFAULT_STUDIO_DETAILS, ...(row.value || {}) };
          break;
        case 'monthly_goals':
          base.monthly_goals = { ...DEFAULT_MONTHLY_GOALS, ...(row.value || {}) };
          break;
        case 'gallery_tags':
          base.gallery_tags = row.value && typeof row.value === 'object' ? row.value : {};
          break;
        case 'coupons':
          base.coupons = Array.isArray(row.value) ? row.value : [];
          break;
        case 'enable_ai':
          base.enable_ai = Boolean(row.value);
          break;
        case 'enable_gallery':
          base.enable_gallery = Boolean(row.value);
          break;
        case 'enable_style_matcher':
          base.enable_style_matcher = Boolean(row.value);
          break;
        case 'show_pain_level':
          base.show_pain_level = Boolean(row.value);
          break;
        case 'enable_ar':
          base.enable_ar = Boolean(row.value);
          break;
        case 'whatsapp_templates':
          base.whatsapp_templates = row.value || undefined;
          break;
        case 'inventory_items':
          base.inventory_items = Array.isArray(row.value)
            ? row.value.map(normalizeInventoryItem)
            : [];
          break;
        case 'booking_horizon_days':
          base.booking_horizon_days = Number(row.value) || undefined;
          break;
        case 'shipping_fee':
          base.shipping_fee = Number(row.value);
          break;
        case 'free_shipping_threshold':
          base.free_shipping_threshold = Number(row.value);
          break;
        case 'shipping_eta':
          base.shipping_eta = typeof row.value === 'string' ? row.value : undefined;
          break;
        case 'enable_telegram_notifications':
          base.enable_telegram_notifications = Boolean(row.value);
          break;
        case 'telegram_bot_token':
          base.telegram_bot_token = typeof row.value === 'string' ? row.value : undefined;
          break;
        case 'telegram_chat_id':
          base.telegram_chat_id = typeof row.value === 'string' ? row.value : undefined;
          break;
        case 'enable_email_notifications':
          base.enable_email_notifications = Boolean(row.value);
          break;
        case 'emailjs_service_id':
          base.emailjs_service_id = typeof row.value === 'string' ? row.value : undefined;
          break;
        case 'emailjs_template_id':
          base.emailjs_template_id = typeof row.value === 'string' ? row.value : undefined;
          break;
        case 'emailjs_public_key':
          base.emailjs_public_key = typeof row.value === 'string' ? row.value : undefined;
          break;
        case 'notification_email':
          base.notification_email = typeof row.value === 'string' ? row.value : undefined;
          break;
        case 'enable_calendar_sync':
          base.enable_calendar_sync = Boolean(row.value);
          break;
      }
    }
    return base;
  }

  async getPublicSettings(): Promise<PublicStudioSettingsDto> {
    const [raw, activeServices] = await Promise.all([
      this.getRawSettings(),
      this.getServices(false),
    ]);
    const activeIds = new Set(activeServices.map(s => s.id));
    return toPublicSettingsDto(raw, activeIds);
  }

  async updateSettings(updates: Partial<StudioSettings>): Promise<StudioSettings> {
    const current = await this.getRawSettings();
    const merged: StudioSettings = {
      ...current,
      ...updates,
      working_hours: updates.working_hours
        ? normalizeWorkingHoursMap(updates.working_hours)
        : current.working_hours,
      studio_details: updates.studio_details
        ? { ...current.studio_details, ...updates.studio_details }
        : current.studio_details,
      monthly_goals: updates.monthly_goals
        ? { ...current.monthly_goals, ...updates.monthly_goals }
        : current.monthly_goals,
      inventory_items: updates.inventory_items
        ? updates.inventory_items.map(normalizeInventoryItem)
        : current.inventory_items,
    };

    const entries: Array<[string, any]> = [
      ['working_hours', merged.working_hours],
      ['studio_details', merged.studio_details],
      ['monthly_goals', merged.monthly_goals],
      ['gallery_tags', merged.gallery_tags || {}],
      ['coupons', merged.coupons || []],
      ['enable_ai', merged.enable_ai ?? true],
      ['enable_gallery', merged.enable_gallery ?? true],
      ['enable_style_matcher', merged.enable_style_matcher ?? true],
      ['show_pain_level', merged.show_pain_level ?? true],
      ['enable_ar', merged.enable_ar ?? true],
      ['whatsapp_templates', merged.whatsapp_templates || {}],
      ['inventory_items', merged.inventory_items || []],
      ['booking_horizon_days', merged.booking_horizon_days ?? merged.studio_details?.booking_horizon_days ?? 30],
      ['shipping_fee', merged.shipping_fee ?? merged.studio_details?.shipping_fee ?? null],
      ['free_shipping_threshold', merged.free_shipping_threshold ?? merged.studio_details?.free_shipping_threshold ?? null],
      ['shipping_eta', merged.shipping_eta ?? merged.studio_details?.shipping_eta ?? null],
      ['enable_telegram_notifications', merged.enable_telegram_notifications ?? false],
      ['telegram_bot_token', merged.telegram_bot_token ?? ''],
      ['telegram_chat_id', merged.telegram_chat_id ?? ''],
      ['enable_email_notifications', merged.enable_email_notifications ?? false],
      ['emailjs_service_id', merged.emailjs_service_id ?? ''],
      ['emailjs_template_id', merged.emailjs_template_id ?? ''],
      ['emailjs_public_key', merged.emailjs_public_key ?? ''],
      ['notification_email', merged.notification_email ?? ''],
      ['enable_calendar_sync', merged.enable_calendar_sync ?? false],
    ];

    for (const [k, val] of entries) {
      const jsonVal = JSON.stringify(val);
      await this.sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES (${k}, ${jsonVal}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    return merged;
  }

  async getServices(includeInactive = false): Promise<Service[]> {
    await this.ensureSchema();
    const rows = includeInactive
      ? ((await this.sql`SELECT * FROM services ORDER BY price ASC, name ASC`) as any[])
      : ((await this.sql`SELECT * FROM services WHERE is_active IS NOT FALSE ORDER BY price ASC, name ASC`) as any[]);
    return rows.map(normalizeServiceRow);
  }

  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    const id = crypto.randomUUID();
    const hasHealingCol = await this.checkHealingTimeCol();
    const norm = normalizeServiceRow({ ...service, id, is_active: true });

    const rows = hasHealingCol
      ? ((await this.sql`
          INSERT INTO services (
            id, name, description, healing_time, price, duration_minutes,
            category, image_url, pain_level, cost_price, stock_quantity, is_active
          ) VALUES (
            ${id}, ${norm.name}, ${norm.description || null}, ${norm.healing_time || null},
            ${norm.price}, ${norm.duration_minutes}, ${norm.category}, ${norm.image_url || null},
            ${norm.pain_level || 0}, ${norm.cost_price ?? null}, ${norm.stock_quantity ?? null}, true
          ) RETURNING *
        `) as any[])
      : ((await this.sql`
          INSERT INTO services (
            id, name, description, price, duration_minutes,
            category, image_url, pain_level, cost_price, stock_quantity, is_active
          ) VALUES (
            ${id}, ${norm.name}, ${norm.description || null},
            ${norm.price}, ${norm.duration_minutes}, ${norm.category}, ${norm.image_url || null},
            ${norm.pain_level || 0}, ${norm.cost_price ?? null}, ${norm.stock_quantity ?? null}, true
          ) RETURNING *
        `) as any[]);

    return normalizeServiceRow(rows[0]);
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
    const existingRows = (await this.sql`SELECT * FROM services WHERE id = ${id} LIMIT 1`) as any[];
    if (existingRows.length === 0) return null;
    const merged = normalizeServiceRow({ ...existingRows[0], ...updates, id });
    const hasHealingCol = await this.checkHealingTimeCol();

    const rows = hasHealingCol
      ? ((await this.sql`
          UPDATE services SET
            name = ${merged.name},
            description = ${merged.description || null},
            healing_time = ${merged.healing_time || null},
            price = ${merged.price},
            duration_minutes = ${merged.duration_minutes},
            category = ${merged.category},
            image_url = ${merged.image_url || null},
            pain_level = ${merged.pain_level || 0},
            cost_price = ${merged.cost_price ?? null},
            stock_quantity = ${merged.stock_quantity ?? null},
            is_active = ${merged.is_active !== false}
          WHERE id = ${id}
          RETURNING *
        `) as any[])
      : ((await this.sql`
          UPDATE services SET
            name = ${merged.name},
            description = ${merged.description || null},
            price = ${merged.price},
            duration_minutes = ${merged.duration_minutes},
            category = ${merged.category},
            image_url = ${merged.image_url || null},
            pain_level = ${merged.pain_level || 0},
            cost_price = ${merged.cost_price ?? null},
            stock_quantity = ${merged.stock_quantity ?? null},
            is_active = ${merged.is_active !== false}
          WHERE id = ${id}
          RETURNING *
        `) as any[]);

    return rows[0] ? normalizeServiceRow(rows[0]) : null;
  }

  async deleteService(id: string): Promise<boolean> {
    const rows = (await this.sql`
      UPDATE services SET is_active = false WHERE id = ${id} RETURNING id
    `) as any[];
    return rows.length > 0;
  }

  async validateCoupon(code: string, cartTotalShekels: number): Promise<{ isValid: boolean; error?: string; coupon?: Coupon }> {
    const settings = await this.getRawSettings();
    return evaluateCouponAgainstTotal(settings.coupons || [], code, cartTotalShekels);
  }

  async getAppointmentBusyIntervals(fromIso: string, toIso: string) {
    const rows = (await this.sql`
      SELECT id, start_time, end_time, status
      FROM appointments
      WHERE status <> 'cancelled'
        AND start_time < ${toIso}::timestamptz
        AND end_time > ${fromIso}::timestamptz
    `) as any[];

    return rows.map(r => ({
      id: String(r.id),
      start_time: new Date(r.start_time).toISOString(),
      end_time: new Date(r.end_time).toISOString(),
      status: String(r.status),
    }));
  }

  async createAppointmentAtomic(payload: Parameters<StoreAdapter['createAppointmentAtomic']>[0]) {
    await this.ensureSchema();
    const rowId = payload.idempotencyKey
      ? deterministicUuidFromKey('appt', payload.idempotencyKey)
      : crypto.randomUUID();

    if (payload.idempotencyKey) {
      const existing = (await this.sql`
        SELECT a.*, s.name as joined_service_name, s.price as joined_service_price
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        WHERE a.id = ${rowId}
        LIMIT 1
      `) as any[];
      if (existing.length > 0) {
        return { appointment: mapAppointmentRow(existing[0]), created: false };
      }
    }

    const cartJson = payload.cart_items ? JSON.stringify(payload.cart_items) : null;
    const lockKey = payload.start_time.slice(0, 10);

    // Atomic CTE acquires transaction advisory lock for the slot day and checks overlap before insert
    const insertedRows = payload.bypassOverlapCheck
      ? ((await this.sql`
          INSERT INTO appointments (
            id, client_id, service_id, guest_name, guest_email, guest_phone,
            start_time, end_time, price, final_price, status, notes, signature,
            total_cost, total_profit, cart_items, visual_plan, ai_recommendation_text,
            anatomy_image_url, anatomy_status, coupon_code,
            is_under_16, parent_name, parent_id, parent_phone
          ) VALUES (
            ${rowId}, ${payload.client_id || null}, ${payload.service_id || null},
            ${payload.guest_name}, ${payload.guest_email || null}, ${payload.guest_phone},
            ${payload.start_time}::timestamptz, ${payload.end_time}::timestamptz,
            ${payload.price}, ${payload.final_price}, ${payload.status}, ${payload.notes || null},
            ${payload.signature || null}, ${payload.total_cost ?? null}, ${payload.total_profit ?? null},
            ${cartJson}::jsonb, ${payload.visual_plan || null}, ${payload.ai_recommendation_text || null},
            ${payload.anatomy_image_url || null}, ${payload.anatomy_status || null},
            ${payload.coupon_code || null}, ${Boolean(payload.is_under_16)},
            ${payload.parent_name || null}, ${payload.parent_id || null}, ${payload.parent_phone || null}
          )
          ON CONFLICT (id) DO NOTHING
          RETURNING *
        `) as any[])
      : ((await this.sql`
          WITH locked AS (
            SELECT pg_advisory_xact_lock(hashtext(${'slot:' + lockKey}))
          )
          INSERT INTO appointments (
            id, client_id, service_id, guest_name, guest_email, guest_phone,
            start_time, end_time, price, final_price, status, notes, signature,
            total_cost, total_profit, cart_items, visual_plan, ai_recommendation_text,
            anatomy_image_url, anatomy_status, coupon_code,
            is_under_16, parent_name, parent_id, parent_phone
          )
          SELECT
            ${rowId}, ${payload.client_id || null}, ${payload.service_id || null},
            ${payload.guest_name}, ${payload.guest_email || null}, ${payload.guest_phone},
            ${payload.start_time}::timestamptz, ${payload.end_time}::timestamptz,
            ${payload.price}, ${payload.final_price}, ${payload.status}, ${payload.notes || null},
            ${payload.signature || null}, ${payload.total_cost ?? null}, ${payload.total_profit ?? null},
            ${cartJson}::jsonb, ${payload.visual_plan || null}, ${payload.ai_recommendation_text || null},
            ${payload.anatomy_image_url || null}, ${payload.anatomy_status || null},
            ${payload.coupon_code || null}, ${Boolean(payload.is_under_16)},
            ${payload.parent_name || null}, ${payload.parent_id || null}, ${payload.parent_phone || null}
          FROM locked
          WHERE NOT EXISTS (
            SELECT 1 FROM appointments
            WHERE status <> 'cancelled'
              AND start_time < ${payload.end_time}::timestamptz
              AND end_time > ${payload.start_time}::timestamptz
          )
          ON CONFLICT (id) DO NOTHING
          RETURNING *
        `) as any[]);

    if (insertedRows.length === 0) {
      // Distinguish idempotency replay from slot conflict
      const replay = (await this.sql`
        SELECT a.*, s.name as joined_service_name, s.price as joined_service_price
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        WHERE a.id = ${rowId}
        LIMIT 1
      `) as any[];
      if (replay.length > 0) {
        return { appointment: mapAppointmentRow(replay[0]), created: false };
      }
      const err: any = new Error('המועד שנבחר נתפס זה עתה. אנא בחרי מועד פנוי אחר.');
      err.code = 'SLOT_CONFLICT';
      throw err;
    }

    // Increment coupon usage count atomically inside settings if applied
    if (payload.coupon_code) {
      const settings = await this.getRawSettings();
      const updatedCoupons = incrementCouponUsageList(settings.coupons || [], payload.coupon_code);
      await this.sql`
        UPDATE settings SET value = ${JSON.stringify(updatedCoupons)}::jsonb, updated_at = NOW()
        WHERE key = 'coupons'
      `;
    }

    if (payload.referralCodeUsed) {
      await this.sql`
        UPDATE profiles
        SET credit_balance = COALESCE(credit_balance, 0) + 30
        WHERE UPPER(referral_code) = ${payload.referralCodeUsed.trim().toUpperCase()}
          AND (${payload.client_id || null}::uuid IS NULL OR id <> ${payload.client_id || null}::uuid)
      `;
    }

    const mapped = mapAppointmentRow({
      ...insertedRows[0],
      service_name: payload.service_name,
    });
    return { appointment: mapped, created: true };
  }

  async getAdminAppointments(): Promise<Appointment[]> {
    const rows = (await this.sql`
      SELECT a.*,
             p.full_name as profile_name,
             p.email as profile_email,
             p.phone as profile_phone,
             s.name as joined_service_name,
             s.price as joined_service_price
      FROM appointments a
      LEFT JOIN profiles p ON p.id = a.client_id
      LEFT JOIN services s ON s.id = a.service_id
      ORDER BY a.start_time ASC
    `) as any[];
    return rows.map(mapAppointmentRow);
  }

  async getAppointmentsForUser(userId: string): Promise<Appointment[]> {
    const rows = (await this.sql`
      SELECT a.*,
             p.full_name as profile_name,
             p.email as profile_email,
             p.phone as profile_phone,
             s.name as joined_service_name,
             s.price as joined_service_price
      FROM appointments a
      LEFT JOIN profiles p ON p.id = a.client_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.client_id = ${userId}
      ORDER BY a.start_time DESC
    `) as any[];
    return rows.map(mapAppointmentRow);
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const existing = (await this.sql`SELECT * FROM appointments WHERE id = ${id} LIMIT 1`) as any[];
    if (existing.length === 0) return null;
    const cur = existing[0];

    const guestName = updates.client_name !== undefined ? updates.client_name : cur.guest_name;
    const guestEmail = updates.client_email !== undefined ? updates.client_email : cur.guest_email;
    const guestPhone = updates.client_phone !== undefined ? updates.client_phone : cur.guest_phone;
    const serviceId = updates.service_id !== undefined ? updates.service_id : cur.service_id;
    const startTime = updates.start_time !== undefined ? updates.start_time : cur.start_time;
    const endTime = updates.end_time !== undefined ? updates.end_time : cur.end_time;
    const status = updates.status !== undefined ? updates.status : cur.status;
    const price = updates.price !== undefined ? updates.price : cur.price;
    const finalPrice = updates.final_price !== undefined ? updates.final_price : cur.final_price;
    const notes = updates.notes !== undefined ? updates.notes : cur.notes;
    const totalCost = updates.total_cost !== undefined ? updates.total_cost : cur.total_cost;
    const totalProfit = updates.total_profit !== undefined ? updates.total_profit : cur.total_profit;
    const cartItems = updates.cart_items !== undefined ? JSON.stringify(updates.cart_items) : JSON.stringify(cur.cart_items ?? null);
    const anatomyStatus = updates.anatomy_status !== undefined ? updates.anatomy_status : cur.anatomy_status;
    const anatomyComment = updates.anatomy_review_comment !== undefined ? updates.anatomy_review_comment : cur.anatomy_review_comment;

    const rows = (await this.sql`
      UPDATE appointments SET
        guest_name = ${guestName},
        guest_email = ${guestEmail},
        guest_phone = ${guestPhone},
        service_id = ${serviceId},
        start_time = ${startTime}::timestamptz,
        end_time = ${endTime}::timestamptz,
        status = ${status},
        price = ${price},
        final_price = ${finalPrice},
        notes = ${notes},
        total_cost = ${totalCost},
        total_profit = ${totalProfit},
        cart_items = ${cartItems}::jsonb,
        anatomy_status = ${anatomyStatus},
        anatomy_review_comment = ${anatomyComment}
      WHERE id = ${id}
      RETURNING *
    `) as any[];

    return rows[0] ? mapAppointmentRow(rows[0]) : null;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const rows = (await this.sql`DELETE FROM appointments WHERE id = ${id} RETURNING id`) as any[];
    return rows.length > 0;
  }

  async clearAppointments(): Promise<boolean> {
    await this.sql`DELETE FROM appointments`;
    return true;
  }

  async getMonthlyStats() {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const rows = (await this.sql`
      SELECT price, final_price, total_cost, total_profit, status
      FROM appointments
      WHERE start_time >= ${startOfMonth}::timestamptz
    `) as any[];

    let revenue = 0;
    let profit = 0;
    let pending = 0;
    let activeCount = 0;

    for (const r of rows) {
      if (r.status !== 'cancelled') {
        activeCount++;
        const rev = parsePriceToShekels(r.final_price ?? r.price, 0);
        revenue += rev;
        if (r.total_profit !== null && r.total_profit !== undefined) {
          profit += parsePriceToShekels(r.total_profit, 0);
        } else {
          profit += rev - parsePriceToShekels(r.total_cost, 0);
        }
      }
      if (r.status === 'pending') pending++;
    }
    return { revenue, profit, appointments: activeCount, pending };
  }

  async getExpenses(month?: number, year?: number): Promise<Expense[]> {
    if (month !== undefined && year !== undefined) {
      const startDate = new Date(Date.UTC(year, month, 1)).toISOString();
      const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();
      const rows = (await this.sql`
        SELECT * FROM expenses
        WHERE expense_date >= ${startDate}::timestamptz AND expense_date <= ${endDate}::timestamptz
        ORDER BY expense_date DESC
      `) as any[];
      return rows.map(r => ({
        id: String(r.id),
        category: r.category || 'אחר',
        description: r.description,
        amount: parsePriceToShekels(r.amount, 0),
        expense_date: new Date(r.expense_date).toISOString(),
        created_at: new Date(r.created_at).toISOString(),
      }));
    }

    const rows = (await this.sql`SELECT * FROM expenses ORDER BY expense_date DESC`) as any[];
    return rows.map(r => ({
      id: String(r.id),
      category: r.category || 'אחר',
      description: r.description,
      amount: parsePriceToShekels(r.amount, 0),
      expense_date: new Date(r.expense_date).toISOString(),
      created_at: new Date(r.created_at).toISOString(),
    }));
  }

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const id = crypto.randomUUID();
    const rows = (await this.sql`
      INSERT INTO expenses (id, category, description, amount, expense_date)
      VALUES (${id}, ${expense.category}, ${expense.description}, ${parsePriceToShekels(expense.amount, 0)}, ${expense.expense_date}::timestamptz)
      RETURNING *
    `) as any[];
    const r = rows[0];
    return {
      id: String(r.id),
      category: r.category,
      description: r.description,
      amount: parsePriceToShekels(r.amount, 0),
      expense_date: new Date(r.expense_date).toISOString(),
      created_at: new Date(r.created_at).toISOString(),
    };
  }

  async deleteExpense(id: string): Promise<boolean> {
    const rows = (await this.sql`DELETE FROM expenses WHERE id = ${id} RETURNING id`) as any[];
    return rows.length > 0;
  }

  async getGallery(page = 1, limit = 12): Promise<{ items: any[]; total: number }> {
    const offset = Math.max(0, (page - 1) * limit);
    const [galleryRows, countRows, services, rawSettings] = await Promise.all([
      this.sql`SELECT * FROM gallery ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}` as Promise<any[]>,
      this.sql`SELECT count(*)::int as cnt FROM gallery` as Promise<any[]>,
      this.getServices(false),
      this.getRawSettings(),
    ]);

    const svcMap = new Map(services.map(s => [s.id, s]));
    const tags = rawSettings.gallery_tags || {};
    const items = galleryRows.map(g => {
      const taggedIds: string[] = Array.isArray(tags[g.id]) ? tags[g.id] : [];
      const taggedServices = taggedIds.map(id => svcMap.get(id)).filter(Boolean);
      return {
        id: String(g.id),
        image_url: String(g.image_url),
        created_at: new Date(g.created_at).toISOString(),
        taggedServices,
      };
    });

    return { items, total: countRows[0]?.cnt || 0 };
  }

  async addToGallery(imageUrl: string): Promise<GalleryItem> {
    const id = crypto.randomUUID();
    const rows = (await this.sql`
      INSERT INTO gallery (id, image_url) VALUES (${id}, ${imageUrl}) RETURNING *
    `) as any[];
    return {
      id: String(rows[0].id),
      image_url: String(rows[0].image_url),
      created_at: new Date(rows[0].created_at).toISOString(),
    };
  }

  async deleteFromGallery(id: string): Promise<boolean> {
    const rows = (await this.sql`DELETE FROM gallery WHERE id = ${id} RETURNING id`) as any[];
    return rows.length > 0;
  }

  async upsertGoogleProfile(info: ServerGoogleUserInfo, adminEmails: string[]): Promise<Profile> {
    const email = info.email.trim().toLowerCase();
    const isAdminEnv = adminEmails.includes(email);
    const existingRows = (await this.sql`
      SELECT * FROM profiles WHERE LOWER(email) = ${email} LIMIT 1
    `) as any[];

    if (existingRows.length > 0) {
      const ex = existingRows[0];
      const nextRole = ex.role === 'admin' || isAdminEnv ? 'admin' : 'client';
      const updated = (await this.sql`
        UPDATE profiles SET
          full_name = COALESCE(NULLIF(${info.name || ''}, ''), full_name),
          avatar_url = COALESCE(NULLIF(${info.picture || ''}, ''), avatar_url),
          role = ${nextRole},
          auth_provider = 'google'
        WHERE id = ${ex.id}
        RETURNING *
      `) as any[];
      return sanitizeProfile(updated[0]);
    }

    const id = crypto.randomUUID();
    const refCode = `YUVAL-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const role = isAdminEnv ? 'admin' : 'client';
    const inserted = (await this.sql`
      INSERT INTO profiles (id, email, full_name, role, auth_provider, avatar_url, referral_code, credit_balance, wishlist)
      VALUES (${id}, ${email}, ${info.name || email.split('@')[0]}, ${role}, 'google', ${info.picture || null}, ${refCode}, 0, ARRAY[]::text[])
      RETURNING *
    `) as any[];
    return sanitizeProfile(inserted[0]);
  }

  async getProfileById(id: string): Promise<Profile | null> {
    const rows = (await this.sql`SELECT * FROM profiles WHERE id = ${id} LIMIT 1`) as any[];
    return rows[0] ? sanitizeProfile(rows[0]) : null;
  }

  async updateProfileSafe(
    id: string,
    updates: { full_name?: string; phone?: string; avatar_url?: string }
  ): Promise<Profile | null> {
    const existing = await this.getProfileById(id);
    if (!existing) return null;
    const rows = (await this.sql`
      UPDATE profiles SET
        full_name = ${updates.full_name !== undefined ? updates.full_name : existing.full_name || null},
        phone = ${updates.phone !== undefined ? updates.phone : existing.phone || null},
        avatar_url = ${updates.avatar_url !== undefined ? updates.avatar_url : existing.avatar_url || null}
      WHERE id = ${id}
      RETURNING *
    `) as any[];
    return rows[0] ? sanitizeProfile(rows[0]) : null;
  }

  async toggleWishlist(userId: string, itemId: string): Promise<string[]> {
    const profile = await this.getProfileById(userId);
    if (!profile) return [];
    const list = Array.isArray(profile.wishlist) ? [...profile.wishlist] : [];
    const idx = list.indexOf(itemId);
    if (idx !== -1) list.splice(idx, 1);
    else list.push(itemId);
    await this.sql`UPDATE profiles SET wishlist = ${list} WHERE id = ${userId}`;
    return list;
  }

  async getWishlist(userId: string): Promise<any[]> {
    const profile = await this.getProfileById(userId);
    const ids = profile?.wishlist || [];
    if (ids.length === 0) return [];
    const [svcs, settings, gallery] = await Promise.all([
      this.getServices(false),
      this.getRawSettings(),
      this.getGallery(1, 50),
    ]);
    const inv = (settings.inventory_items || []).map(normalizeInventoryItem);
    const out: any[] = [];
    for (const id of ids) {
      const s = svcs.find(x => x.id === id);
      if (s) { out.push(s); continue; }
      const i = inv.find(x => x.id === id);
      if (i) { out.push(i); continue; }
      const g = gallery.items.find((x: any) => x.id === id);
      if (g) out.push(g);
    }
    return out;
  }

  async checkInAftercare(userId: string): Promise<string | null> {
    const nowIso = new Date().toISOString();
    const rows = (await this.sql`
      UPDATE profiles SET last_aftercare_checkin = ${nowIso}::timestamptz
      WHERE id = ${userId}
      RETURNING last_aftercare_checkin
    `) as any[];
    return rows[0]?.last_aftercare_checkin ? new Date(rows[0].last_aftercare_checkin).toISOString() : null;
  }

  async getLastAftercareCheckin(userId: string): Promise<string | null> {
    const rows = (await this.sql`
      SELECT last_aftercare_checkin FROM profiles WHERE id = ${userId} LIMIT 1
    `) as any[];
    return rows[0]?.last_aftercare_checkin ? new Date(rows[0].last_aftercare_checkin).toISOString() : null;
  }

  async createJewelryOrderIdempotent(payload: Parameters<StoreAdapter['createJewelryOrderIdempotent']>[0]) {
    await this.ensureSchema();
    const rowId = payload.idempotencyKey
      ? deterministicUuidFromKey('order', payload.idempotencyKey)
      : crypto.randomUUID();
    const orderNumber = generateUniqueOrderNumber();
    const itemsJson = JSON.stringify(payload.items);

    const hasNotifCols = await this.checkOrderNotifCols();
    const inserted = hasNotifCols
      ? ((await this.sql`
          INSERT INTO jewelry_orders (
            id, order_number, client_name, client_phone, client_email,
            items, total_price, delivery_method, shipping_address, shipping_cost,
            status, notes, notification_status
          ) VALUES (
            ${rowId}, ${orderNumber}, ${payload.client_name}, ${payload.client_phone},
            ${payload.client_email || null}, ${itemsJson}::jsonb, ${payload.total_price},
            ${payload.delivery_method}, ${payload.shipping_address || null}, ${payload.shipping_cost},
            'pending', ${payload.notes || null}, 'pending'
          )
          ON CONFLICT (id) DO NOTHING
          RETURNING *
        `) as any[])
      : ((await this.sql`
          INSERT INTO jewelry_orders (
            id, order_number, client_name, client_phone, client_email,
            items, total_price, delivery_method, shipping_address, shipping_cost,
            status, notes
          ) VALUES (
            ${rowId}, ${orderNumber}, ${payload.client_name}, ${payload.client_phone},
            ${payload.client_email || null}, ${itemsJson}::jsonb, ${payload.total_price},
            ${payload.delivery_method}, ${payload.shipping_address || null}, ${payload.shipping_cost},
            'pending', ${payload.notes || null}
          )
          ON CONFLICT (id) DO NOTHING
          RETURNING *
        `) as any[]);

    if (inserted.length > 0) {
      return { order: mapOrderRow(inserted[0]), created: true };
    }

    const existing = (await this.sql`SELECT * FROM jewelry_orders WHERE id = ${rowId} LIMIT 1`) as any[];
    if (existing.length === 0) {
      throw new Error('שמירת ההזמנה בשרת נכשלה');
    }
    return { order: mapOrderRow(existing[0]), created: false };
  }

  async updateJewelryOrderNotificationState(
    orderId: string,
    status: 'sent' | 'failed' | 'skipped',
    error?: string
  ): Promise<void> {
    const hasNotifCols = await this.checkOrderNotifCols();
    if (!hasNotifCols) return;
    await this.sql`
      UPDATE jewelry_orders SET
        notification_status = ${status},
        notification_error = ${error || null}
      WHERE id = ${orderId}
    `;
  }

  async getJewelryOrders(): Promise<JewelryOrder[]> {
    const rows = (await this.sql`
      SELECT * FROM jewelry_orders ORDER BY created_at DESC
    `) as any[];
    return rows.map(mapOrderRow);
  }

  async updateJewelryOrderStatus(orderId: string, status: JewelryOrder['status']): Promise<boolean> {
    const rows = (await this.sql`
      UPDATE jewelry_orders SET status = ${status} WHERE id = ${orderId} RETURNING id
    `) as any[];
    return rows.length > 0;
  }

  async deleteJewelryOrder(orderId: string): Promise<boolean> {
    const rows = (await this.sql`
      DELETE FROM jewelry_orders WHERE id = ${orderId} RETURNING id
    `) as any[];
    return rows.length > 0;
  }

  async addWaitlistEntry(entry: Omit<WaitlistEntry, 'id' | 'created_at'>): Promise<WaitlistEntry> {
    await this.ensureSchema();
    if (this.hasWaitlistTableCache === null) {
      this.hasWaitlistTableCache = await this.hasTable('waitlist_requests');
    }
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    if (this.hasWaitlistTableCache) {
      const rows = (await this.sql`
        INSERT INTO waitlist_requests (id, client_name, client_phone, preferred_date, service_names, notes)
        VALUES (${id}, ${entry.client_name}, ${entry.client_phone}, ${entry.preferred_date || null}, ${entry.service_names || null}, ${entry.notes || null})
        RETURNING *
      `) as any[];
      return {
        id: String(rows[0].id),
        client_name: String(rows[0].client_name),
        client_phone: String(rows[0].client_phone),
        preferred_date: rows[0].preferred_date || undefined,
        service_names: rows[0].service_names || undefined,
        notes: rows[0].notes || undefined,
        created_at: new Date(rows[0].created_at).toISOString(),
      };
    }

    // Fallback cleanly into JSONB waitlist_requests setting key without throwing if migration pending
    const existingRows = (await this.sql`SELECT value FROM settings WHERE key = 'waitlist_requests' LIMIT 1`) as any[];
    const list: WaitlistEntry[] = Array.isArray(existingRows[0]?.value) ? existingRows[0].value : [];
    const created: WaitlistEntry = { ...entry, id, created_at: nowIso };
    const updated = [created, ...list].slice(0, 200);
    await this.sql`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('waitlist_requests', ${JSON.stringify(updated)}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
    return created;
  }

  async getWaitlistEntries(): Promise<WaitlistEntry[]> {
    await this.ensureSchema();
    if (this.hasWaitlistTableCache === null) {
      this.hasWaitlistTableCache = await this.hasTable('waitlist_requests');
    }
    if (this.hasWaitlistTableCache) {
      const rows = (await this.sql`SELECT * FROM waitlist_requests ORDER BY created_at DESC LIMIT 100`) as any[];
      return rows.map(r => ({
        id: String(r.id),
        client_name: String(r.client_name),
        client_phone: String(r.client_phone),
        preferred_date: r.preferred_date || undefined,
        service_names: r.service_names || undefined,
        notes: r.notes || undefined,
        created_at: new Date(r.created_at).toISOString(),
      }));
    }
    const existingRows = (await this.sql`SELECT value FROM settings WHERE key = 'waitlist_requests' LIMIT 1`) as any[];
    return Array.isArray(existingRows[0]?.value) ? existingRows[0].value : [];
  }
}
