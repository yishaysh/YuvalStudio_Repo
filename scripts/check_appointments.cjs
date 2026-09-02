// scripts/check_appointments.cjs
const fs = require('fs');

const dotenv = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const env = {};
dotenv.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim();
});

const databaseUrl = env['DATABASE_URL'] || env['VITE_NEON_DATABASE_URL'] || '';
if (databaseUrl) {
    import('@neondatabase/serverless').then(({ neon }) => {
        const sql = neon(databaseUrl);
        sql`SELECT * FROM appointments ORDER BY start_time DESC LIMIT 5;`
            .then(console.log)
            .catch(console.error);
    });
}
