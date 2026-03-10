import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// הפונקציה לקריאת משתני הסביבה מקובץ .env
const loadEnv = () => {
    const envPath = path.resolve(process.cwd(), '.env');
    let supabaseUrl = '';
    let supabaseKey = '';

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1]?.trim();
            if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1]?.trim();
            
            supabaseUrl = supabaseUrl?.replace(/^["']|["']$/g, '');
            supabaseKey = supabaseKey?.replace(/^["']|["']$/g, '');
        }
    }
    return { supabaseUrl, supabaseKey };
};

const run = async () => {
    const { supabaseUrl, supabaseKey } = loadEnv();

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase_url_here')) {
        console.error('❌ שגיאה: לא נמצאו אישורי Supabase תקינים בקובץ .env.');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 מחפש תורי דמה למחיקה...');

    // מוחק כל תור שיש בו את ההערה שהוספנו
    const { data, error } = await supabase
        .from('appointments')
        .delete()
        .like('notes', '%[MOCK_FOR_SCREENSHOT]%')
        .select();

    if (error) {
        console.error('❌ שגיאה במחיקת התורים:', error.message);
    } else {
        console.log(`✅ נמחקו בהצלחה ${data?.length || 0} תורי דמה.`);
    }
};

run();
