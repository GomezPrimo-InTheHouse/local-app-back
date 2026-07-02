// services/dolar.service.js
import { supabase } from "../config/supabase.js";

const DOLAR_TIPO = process.env.DOLAR_TIPO || "blue"; // 'blue' | 'oficial' | 'tarjeta' | etc.
const DOLAR_API_URL = `https://dolarapi.com/v1/dolares/${DOLAR_TIPO}`;

function hoyISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Llama a la API pública dolarapi.com y devuelve el valor de venta.
 */
async function fetchCotizacionExterna() {
  const response = await fetch(DOLAR_API_URL);
  if (!response.ok) {
    throw new Error(`No se pudo obtener la cotización del dólar (status ${response.status})`);
  }
  const data = await response.json();
  if (!data.venta) {
    throw new Error("Respuesta inesperada de la API del dólar");
  }
  return Number(data.venta);
}

/**
 * Recalcula costo/precio de TODOS los productos celular (los que tienen costo_usd cargado)
 * usando el valor de dólar pasado por parámetro.
 */
async function recalcularPreciosCelulares(valorDolar) {
  const { data, error } = await supabase.rpc("recalcular_precios_celulares", {
    p_dolar: valorDolar,
  });
  if (error) throw error;
  return data; // array de productos actualizados
}

/**
 * Devuelve la cotización vigente de HOY.
 * - Si ya hay una fila para hoy (automática o manual), la devuelve tal cual
 *   (así un override manual no se pisa con el valor automático el mismo día).
 * - Si no existe, la busca en la API externa, la guarda como 'automatica',
 *   recalcula los precios de los celulares y la devuelve.
 */
export async function obtenerCotizacionHoy() {
  const { data: existente, error: errorConsulta } = await supabase
    .from("cotizacion_dolar")
    .select("*")
    .eq("fecha", hoyISO())
    .maybeSingle();

  if (errorConsulta) throw errorConsulta;
  if (existente) return existente;

  // No hay cotización cargada hoy todavía -> buscarla automáticamente
  const valor = await fetchCotizacionExterna();

  const { data: nueva, error: errorUpsert } = await supabase
    .rpc("upsert_cotizacion_dolar", { p_valor: valor, p_fuente: "automatica" })
    .single();

  if (errorUpsert) throw errorUpsert;

  await recalcularPreciosCelulares(nueva.valor);

  return nueva;
}

/**
 * Guarda un override manual de la cotización de HOY y recalcula los celulares.
 */
export async function setCotizacionManual(valor) {
  const valorNum = Number(valor);
  if (!valorNum || valorNum <= 0) {
    throw new Error("El valor del dólar debe ser un número positivo");
  }

  const { data, error } = await supabase
    .rpc("upsert_cotizacion_dolar", { p_valor: valorNum, p_fuente: "manual" })
    .single();

  if (error) throw error;

  await recalcularPreciosCelulares(data.valor);

  return data;
}

export default {
  obtenerCotizacionHoy,
  setCotizacionManual,
};