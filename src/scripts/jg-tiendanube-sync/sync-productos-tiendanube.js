// sync-productos-tiendanube.js
//
// Sincroniza productos desde la tabla `producto` de Supabase hacia Tiendanube,
// usando la API REST oficial (crea el producto y sus fotos en un solo paso).
//
// Requisitos:
//   npm install @supabase/supabase-js dotenv
//   (usa fetch nativo de Node 18+, no hace falta axios)
//
// Uso:
//   node sync-productos-tiendanube.js          -> corre la sincronización real
//   node sync-productos-tiendanube.js --dry-run -> solo muestra qué haría, sin crear nada

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_BUCKET,
  TIENDANUBE_STORE_ID,
  TIENDANUBE_ACCESS_TOKEN,
  TIENDANUBE_USER_AGENT,
} = process.env;

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_BUCKET',
  'TIENDANUBE_STORE_ID',
  'TIENDANUBE_ACCESS_TOKEN',
  'TIENDANUBE_USER_AGENT',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Falta la variable de entorno ${key}. Revisá tu archivo .env`);
    process.exit(1);
  }
}

const DRY_RUN = process.argv.includes('--dry-run');
const API_BASE = `https://api.tiendanube.com/2025-03/${TIENDANUBE_STORE_ID}`;
const HEADERS = {
  Authorization: `Bearer ${TIENDANUBE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
  'User-Agent': TIENDANUBE_USER_AGENT,
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Espera entre requests para no pasarnos del rate limit (2 req/seg en planes base)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RATE_LIMIT_DELAY_MS = 600;

// Cache de categorías ya resueltas en esta corrida: nombre (lowercase) -> id
const categoriaCache = new Map();

function resolverUrlFoto(valor) {
  if (!valor) return null;
  if (valor.startsWith('http://') || valor.startsWith('https://')) return valor;
  // Si no es una URL completa, se asume que es la ruta dentro del bucket público
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${valor}`;
}

async function tiendanubeFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: HEADERS,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`Tiendanube API ${res.status}: ${JSON.stringify(data)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function obtenerOCrearCategoriaId(nombreCategoria) {
  if (!nombreCategoria) return null;
  const key = nombreCategoria.trim().toLowerCase();
  if (categoriaCache.has(key)) return categoriaCache.get(key);

  // Buscar si ya existe
  const existentes = await tiendanubeFetch(`/categories?per_page=200`);
  const encontrada = existentes.find(
    (c) => (c.name?.es || '').trim().toLowerCase() === key
  );
  if (encontrada) {
    categoriaCache.set(key, encontrada.id);
    return encontrada.id;
  }

  // Crearla si no existe
  if (DRY_RUN) {
    console.log(`   [dry-run] crearía categoría "${nombreCategoria}"`);
    categoriaCache.set(key, null);
    return null;
  }
  await sleep(RATE_LIMIT_DELAY_MS);
  const nueva = await tiendanubeFetch(`/categories`, {
    method: 'POST',
    body: JSON.stringify({ name: { es: nombreCategoria } }),
  });
  categoriaCache.set(key, nueva.id);
  return nueva.id;
}

function armarPayloadProducto(producto, categoriaId, imagenes) {
  const specs = [];
  if (producto.ram_gb) specs.push(`RAM: ${producto.ram_gb}GB`);
  if (producto.almacenamiento_gb) specs.push(`Almacenamiento: ${producto.almacenamiento_gb}GB`);
  if (producto.color) specs.push(`Color: ${producto.color}`);
  if (producto.marca) specs.push(`Marca: ${producto.marca}`);

  const descripcionBase = producto.descripcion_web || producto.descripcion || '';
  const descripcionFinal = specs.length
    ? `${descripcionBase}\n\n${specs.join(' | ')}`
    : descripcionBase;

  const variant = {
    price: String(producto.precio ?? 0),
    stock: producto.stock ?? 0,
    sku: String(producto.id),
  };
  if (producto.oferta && Number(producto.oferta) > 0) {
    variant.promotional_price = String(producto.oferta);
  }

  return {
    name: { es: producto.nombre || `Producto ${producto.id}` },
    description: { es: descripcionFinal },
    categories: categoriaId ? [categoriaId] : [],
    variants: [variant],
    images: imagenes.map((src) => ({ src })),
  };
}

async function sincronizarProducto(producto) {
  const imagenes = [producto.foto_url, producto.foto_url_2]
    .map(resolverUrlFoto)
    .filter(Boolean);

  let categoriaId = null;
  try {
    categoriaId = await obtenerOCrearCategoriaId(producto.categoria);
  } catch (err) {
    console.warn(`   ⚠️  No se pudo resolver la categoría "${producto.categoria}": ${err.message}`);
  }

  const payload = armarPayloadProducto(producto, categoriaId, imagenes);

  if (DRY_RUN) {
    console.log(`   [dry-run] crearía producto "${payload.name.es}" con ${imagenes.length} foto(s)`);
    return { ok: true, dryRun: true };
  }

  await sleep(RATE_LIMIT_DELAY_MS);
  const creado = await tiendanubeFetch('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const { error: updateError } = await supabase
    .from('producto')
    .update({ tiendanube_id: creado.id })
    .eq('id', producto.id);

  if (updateError) {
    throw new Error(`Producto creado (id Tiendanube ${creado.id}) pero falló marcarlo en Supabase: ${updateError.message}`);
  }

  return { ok: true, tiendanubeId: creado.id };
}

async function main() {
  console.log(DRY_RUN ? '🧪 Modo DRY RUN (no se crea nada real)\n' : '🚀 Sincronizando productos con Tiendanube\n');

  const { data: productos, error } = await supabase
    .from('producto')
    .select('*')
    .eq('subir_web', true)
    .is('tiendanube_id', null);

  if (error) {
    console.error('❌ Error consultando Supabase:', error.message);
    process.exit(1);
  }

  if (!productos || productos.length === 0) {
    console.log('✅ No hay productos nuevos para subir (todos ya tienen tiendanube_id, o subir_web = false).');
    return;
  }

  console.log(`Encontrados ${productos.length} producto(s) para subir.\n`);

  const resultados = { exitosos: [], fallidos: [] };

  for (const producto of productos) {
    process.stdout.write(`→ (${producto.id}) ${producto.nombre} ... `);
    try {
      const res = await sincronizarProducto(producto);
      console.log(res.dryRun ? 'OK (simulado)' : `OK (Tiendanube id ${res.tiendanubeId})`);
      resultados.exitosos.push(producto.id);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      resultados.fallidos.push({ id: producto.id, nombre: producto.nombre, error: err.message });
    }
  }

  console.log('\n--- Resumen ---');
  console.log(`✅ Exitosos: ${resultados.exitosos.length}`);
  console.log(`❌ Fallidos: ${resultados.fallidos.length}`);
  if (resultados.fallidos.length) {
    console.log('\nDetalle de errores:');
    resultados.fallidos.forEach((f) => console.log(`  - (${f.id}) ${f.nombre}: ${f.error}`));
  }
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});