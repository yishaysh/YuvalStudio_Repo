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
            
            // במקרה של תצורות עם מרכאות
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
        console.log('ודא שקיים קובץ .env עם VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY אמיתיים.');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // חישוב מחר בצהריים
    const tomorrow1 = new Date();
    tomorrow1.setDate(tomorrow1.getDate() + 1);
    tomorrow1.setHours(12, 0, 0, 0);

    const tomorrow2 = new Date();
    tomorrow2.setDate(tomorrow2.getDate() + 1);
    tomorrow2.setHours(13, 0, 0, 0);

    const tomorrow3 = new Date();
    tomorrow3.setDate(tomorrow3.getDate() + 1);
    tomorrow3.setHours(15, 0, 0, 0);

    // רשימת תורי הדמה. שמנו הערה [MOCK_FOR_SCREENSHOT] כדי שנוכל לזהות ולמחוק בקלות
    const mockAppointments = [
        {
            client_name: 'לקוחה לדוגמה (הליקס)',
            client_email: 'mock1@studio.com',
            client_phone: '050-0000001',
            service_id: '2', // הליקס
            service_name: 'הליקס / סחוס',
            start_time: tomorrow1.toISOString(),
            status: 'confirmed',
            notes: '[MOCK_FOR_SCREENSHOT]'
        },
        {
            client_name: 'לקוחה לדוגמה (נזם)',
            client_email: 'mock2@studio.com',
            client_phone: '050-0000002',
            service_id: '3', // נזם
            service_name: 'נזם',
            start_time: tomorrow2.toISOString(),
            status: 'confirmed',
            notes: '[MOCK_FOR_SCREENSHOT]'
        },
        {
            client_name: 'לקוחה לדוגמה (אינדסטריאל + תנוך)',
            client_email: 'mock3@studio.com',
            client_phone: '050-0000003',
            service_id: '5', // אינדסטריאל
            service_name: 'אינדסטריאל',
            start_time: tomorrow3.toISOString(),
            status: 'confirmed',
            notes: '[MOCK_FOR_SCREENSHOT]'
        }
    ];

    console.log('🚀 שולח תורי דמה למחר ל-Supabase...');

    const { data, error } = await supabase
        .from('appointments')
        .insert(mockAppointments)
        .select();

    if (error) {
        console.error('❌ שגיאה בהוספת תורים:', error.message);
    } else {
        console.log(`✅ נוספו בהצלחה ${data.length} תורי דמה ליום מחר!`);
        console.log('כנס כעת למערכת האדמין כדי לצלם מסך של קוביית "הכנות למחר".');
        console.log('למחיקה, הרץ: npm run remove-mocks');
    }
};

run();
