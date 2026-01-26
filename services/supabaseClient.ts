import { createClient } from '@supabase/supabase-js';

// Access environment variables using standard Vite syntax
// fallback to empty object if env is undefined (runtime safety)
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// בדיקה האם הוגדרה כתובת תקינה כדי למנוע קריסה בטעינה ראשונית
const isValidUrl = (url: string) => {
  try {
    return url && url.startsWith('http');
  } catch {
    return false;
  }
};

export const supabase = isValidUrl(supabaseUrl) && supabaseKey
  ? createClient(supabaseUrl, supabaseKey) 
  : null;