// scripts/check_appointments.js
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const dotenv = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const env = {};
dotenv.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim();
});

const databaseUrl = env['DATABASE_URL'] || env['VITE_NEON_DATABASE_URL'] || '';
if (databaseUrl) {
    const sql = neon(databaseUrl);
    sql`SELECT * FROM appointments ORDER BY start_time DESC LIMIT 5;`
        .then(console.log)
        .catch(console.error);
}
