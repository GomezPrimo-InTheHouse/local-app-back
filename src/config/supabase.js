// postgresql://postgres:39173125juli@db.maphvkklznpiwelcofuo.supabase.co:5432/postgres

// nuevo
// config/supabase.js
import path from "path";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// estas claves las copiás de tu dashboard de supabase
const SUPABASE_URL = process.env.SUPABASE_URL 




export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const testConnection = async () => {
  const { data, error } = await supabase.from("producto").select("*").limit(1);
  if (error) {
    console.error("❌ Error al conectar a Supabase:", error.message);
  } else {
    console.log("✅ Conectado a Supabase");
    
  }
};

testConnection();