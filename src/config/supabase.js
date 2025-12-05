// postgresql://postgres:39173125juli@db.maphvkklznpiwelcofuo.supabase.co:5432/postgres

// nuevo
// config/supabase.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Prefer explicit service-role var but fall back for historical name.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing Supabase URL. Set SUPABASE_URL in your environment.');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ROLE_KEY) in your environment.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const testConnection = async () => {
  const { data, error } = await supabase.from("producto").select("*").limit(1);
  if (error) {
    console.error("❌ Error al conectar a Supabase:", error.message);
  } else {
    console.log("✅ Conectado a Supabase");
    
  }
};

testConnection();
