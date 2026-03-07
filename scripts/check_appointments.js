// scripts/check_appointments.js
const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const env = {};
dotenv.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim();
});

const url = env['VITE_SUPABASE_URL'] + '/rest/v1/appointments?start_time=gte.2026-03-08T00:00:00.000Z&start_time=lte.2026-03-08T23:59:59.000Z';
const key = env['VITE_SUPABASE_ANON_KEY'];

fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    .then(r => r.json())
    .then(console.log)
    .catch(console.error);
