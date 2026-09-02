import { dbClient } from '../services/dbClient';

async function check() {
    const { data, error } = await dbClient
        .from('appointments')
        .select('*')
        .gte('start_time', '2026-03-08T00:00:00.000Z')
        .lte('start_time', '2026-03-08T23:59:59.000Z');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

check();
