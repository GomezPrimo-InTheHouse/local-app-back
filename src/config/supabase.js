// postgresql://postgres:39173125juli@db.maphvkklznpiwelcofuo.supabase.co:5432/postgres

// nuevo
// config/supabase.js
import path from "path";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// estas claves las copiás de tu dashboard de supabase
const SUPABASE_URL = process.env.SUPABASE_URL 
const SUPABASE_KEY = process.env.SUPABASE_ROLE_KEY   ; // service_role si es backend seguro



const BUCKET_PRODUCTOS_FOTOS =
  process.env.SUPABASE_PRODUCTOS_BUCKET || "productos-fotos";

const parseBoolean = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    return ["true", "1", "si", "sí", "on"].includes(v);
  }
  return false;
};

const parseNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};



export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const testConnection = async () => {
  const { data, error } = await supabase.from("producto").select("*").limit(1);
  if (error) {
    console.error("❌ Error al conectar a Supabase:", error.message);
  } else {
    console.log("✅ Conectado a Supabase");
    
  }
};

testConnection();