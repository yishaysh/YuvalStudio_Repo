import { createClient } from '@supabase/supabase-js';

// --- הוראות ---
// החלף את המחרוזות למטה בפרטים שקיבלת מ-Supabase (Settings -> API)
const supabaseUrl = 'https://qudcdengyudednjzrdil.supabase.co';
const supabaseKey = 'sb_publishable_ZjkPc2uLSTxPPfVEEjIXkw_i4U213bE';

// בדיקה האם הוגדרה כתובת תקינה כדי למנוע קריסה בטעינה ראשונית
const isValidUrl = (url: string) => {
  try {
    return url.startsWith('http');
  } catch {
    return false;
  }
};

export const supabase = isValidUrl(supabaseUrl) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;