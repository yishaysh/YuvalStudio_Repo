import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { handleApiRequest } from '../api/_lib/handler';
import { parseCookieHeader } from '../api/_lib/auth';
import { MemoryStore } from '../api/_lib/memoryStore';
import type { WorkingHoursMap } from '../shared/availability';
import type { GalleryItem, JewelryItem, Service } from '../types';

const rootDir = process.env.YUVAL_ROOT_DIR ? path.resolve(process.env.YUVAL_ROOT_DIR) : process.cwd();
const distDir = path.join(rootDir, 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const FIXTURE_SERVICES: Service[] = [
  {
    id: 'svc-earlobe',
    name: 'לוב (תנוך)',
    description: 'ניקוב תנוך עדין בסטנדרט היגייני מחמיר. זמן החלמה משוער: 6–8 שבועות.',
    price: '90.00' as unknown as number,
    duration_minutes: 30,
    category: 'Ear',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    pain_level: 2,
    is_active: true,
  },
  {
    id: 'svc-helix',
    name: 'הליקס',
    description: 'ניקוב סחוס עליון עם תכשיט טיטניום ראשוני.',
    price: '120.00' as unknown as number,
    duration_minutes: 30,
    category: 'Ear',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    pain_level: 0,
    is_active: true,
  },
  {
    id: 'svc-conch',
    name: 'קונץ׳',
    description: 'פירסינג מרכז האוזן.',
    price: '130.00' as unknown as number,
    duration_minutes: 30,
    category: 'Ear',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    pain_level: 5,
    is_active: true,
  },
];

const FIXTURE_INVENTORY: JewelryItem[] = [
  {
    id: 'jewel-130',
    name: 'חישוק זהב 14K',
    description: 'חישוק קליק זהב 14K בקוטר 8 מ״מ',
    price: 130,
    category: 'Jewelry',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    in_stock: true,
    stock_quantity: 8,
    material: 'זהב 14K',
  },
  {
    id: 'jewel-50',
    name: 'עגיל טיטניום מיני',
    description: 'לאברט טיטניום רפואי ASTM F136',
    price: 50,
    category: 'Jewelry',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    in_stock: true,
    stock_quantity: 12,
    material: 'טיטניום',
  },
  {
    id: 'jewel-oos',
    name: 'חישוק יהלום (אזל)',
    description: 'אזל זמנית מהמלאי',
    price: 190,
    category: 'Jewelry',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    in_stock: false,
    stock_quantity: 0,
    material: 'טיטניום',
  },
];

const FIXTURE_GALLERY: GalleryItem[] = [
  {
    id: 'gal-tagged-conch',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    created_at: '2026-11-01T10:00:00.000Z',
    taggedServices: [FIXTURE_SERVICES[2]],
  },
  {
    id: 'gal-untagged',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    created_at: '2026-11-02T10:00:00.000Z',
    taggedServices: [],
  },
];

const CLOSED_HOURS: WorkingHoursMap = {
  '0': { isOpen: false, ranges: [] },
  '1': { isOpen: false, ranges: [] },
  '2': { isOpen: false, ranges: [] },
  '3': { isOpen: false, ranges: [] },
  '4': { isOpen: false, ranges: [] },
  '5': { isOpen: false, ranges: [] },
  '6': { isOpen: false, ranges: [] },
};

const OPEN_HOURS: WorkingHoursMap = {
  '0': { isOpen: true, ranges: [{ start: 10, end: 18 }] },
  '1': { isOpen: true, ranges: [{ start: '12:00', end: '20:00' }] },
  '2': { isOpen: true, ranges: [{ start: '10:00', end: '18:00' }] },
  '3': { isOpen: true, ranges: [{ start: '10:00', end: '18:00' }] },
  '4': { isOpen: true, ranges: [{ start: '10:00', end: '16:00' }] },
  '5': { isOpen: true, ranges: [{ start: '09:00', end: '14:00' }] },
  '6': { isOpen: true, ranges: [{ start: '10:00', end: '16:00' }] },
};

let store = createFixtureStore('open');
let simulateNotifFailure = false;

function createFixtureStore(mode: 'open' | 'closed'): MemoryStore {
  return new MemoryStore({
    services: FIXTURE_SERVICES,
    gallery: FIXTURE_GALLERY,
    settings: {
      working_hours: mode === 'closed' ? CLOSED_HOURS : OPEN_HOURS,
      inventory_items: FIXTURE_INVENTORY,
      gallery_tags: {
        'gal-tagged-conch': ['svc-conch'],
      },
      enable_gallery: true,
      enable_style_matcher: true,
      show_pain_level: true,
      booking_horizon_days: 30,
    },
  });
}

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = urlObj.pathname;

  // Test-only fixture control route (isolated local staging only)
  if (pathname === '/__fixture/state' && req.method === 'POST') {
    const body = (await readJsonBody(req)) || {};
    if (body.mode === 'closed' || body.mode === 'open') {
      store = createFixtureStore(body.mode);
    }
    if (typeof body.failOrderInsert === 'boolean') {
      store.failures.failOrderInsert = body.failOrderInsert;
    }
    if (typeof body.failAvailabilityRead === 'boolean') {
      store.failures.failAvailabilityRead = body.failAvailabilityRead;
    }
    if (typeof body.notificationFailed === 'boolean') {
      simulateNotifFailure = body.notificationFailed;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        ordersCount: (await store.getJewelryOrders()).length,
        appointmentsCount: (await store.getAdminAppointments()).length,
        waitlistCount: (await store.getWaitlistEntries()).length,
      })
    );
    return;
  }

  if (pathname === '/__fixture/inspect' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        orders: await store.getJewelryOrders(),
        appointments: await store.getAdminAppointments(),
        waitlist: await store.getWaitlistEntries(),
      })
    );
    return;
  }

  if (pathname.startsWith('/api/') || pathname === '/api') {
    const body = await readJsonBody(req);
    const query: Record<string, string | undefined> = {};
    urlObj.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    const headers: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
    }
    const result = await handleApiRequest(
      {
        method: req.method || 'GET',
        path: pathname,
        query,
        headers,
        cookies: parseCookieHeader(headers.cookie),
        body,
        isHttps: false,
      },
      {
        store,
        notifications: {
          sendAppointmentNotifications: async () =>
            simulateNotifFailure
              ? { telegram: 'failed', email: 'skipped', error: 'Simulated staging notif failure' }
              : { telegram: 'skipped', email: 'skipped' },
          sendOrderNotifications: async () =>
            simulateNotifFailure
              ? { telegram: 'failed', email: 'skipped', error: 'Simulated staging notif failure' }
              : { telegram: 'skipped', email: 'skipped' },
        },
        verifyGoogleToken: async (token: string) => {
          if (token === 'staging-admin-token') {
            return {
              sub: 'staging-admin',
              email: 'owner@yuvalstudio.test',
              email_verified: true,
              name: 'יובל שבלב',
            };
          }
          throw new Error('Unauthorized staging token');
        },
      }
    );

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }
    if (result.setCookies && result.setCookies.length > 0) {
      res.setHeader('Set-Cookie', result.setCookies);
    }
    res.writeHead(result.status);
    res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
    return;
  }

  // Static dist/ serving with SPA fallback
  const requestedRel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let targetFile = path.resolve(distDir, requestedRel);
  if (!targetFile.startsWith(distDir) || !fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
    targetFile = path.join(distDir, 'index.html');
  }

  const ext = path.extname(targetFile).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(targetFile).pipe(res);
});

server.listen(0, '127.0.0.1', () => {
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  console.log(`STAGING_READY http://127.0.0.1:${port}`);
});
