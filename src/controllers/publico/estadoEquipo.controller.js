// src/controllers/publico/estadoEquipo.controller.js
// Consulta pública del estado de un equipo, usada por la web jginformatica.com.
// No requiere login. Devuelve solo los datos necesarios para el cliente
// (nada de IMEI, nombre ni DNI).
// Usa el cliente de Supabase (API REST), la misma vía que el resto del sistema.
import { supabase } from '../../config/supabase.js';

// Estados que no se muestran al público
const ESTADOS_OCULTOS = [16]; // Dado de baja

// Marcas que el cliente puede escribir de otra forma
const ALIAS_MARCA = {
  iphone: 'apple',
  ipad: 'apple',
  macbook: 'apple',
  redmi: 'xiaomi',
  poco: 'xiaomi',
  xiaomiredmi: 'xiaomi',
  xiaomipoco: 'xiaomi',
  galaxy: 'samsung',
  samsunggalaxy: 'samsung',
  moto: 'motorola',
};

const error = (res, status, code, msg) => res.status(status).json({ code, msg });

// "Xiaomi Redmi" -> "xiaomiredmi" ; "Galaxy A-26" -> "galaxya26"
const normalizar = (txt = '') =>
  String(txt)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const canonMarca = (txt) => {
  const n = normalizar(txt);
  return ALIAS_MARCA[n] || n;
};

// Distancia de edición, para tolerar un error de tipeo ("motorla")
const distancia = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
};

const coincideMarca = (buscada, cargada) => {
  const a = canonMarca(buscada);
  const b = canonMarca(cargada);
  if (!a || !b) return false;
  if (a === b || b.startsWith(a) || a.startsWith(b)) return true;
  return a.length >= 4 && distancia(a, b) <= 1;
};

// El modelo es opcional; si viene, alcanza con que uno contenga al otro
// ("A26" encuentra "Galaxy A26 5G").
const coincideModelo = (buscado, cargado) => {
  const a = normalizar(buscado);
  if (!a) return true;
  const b = normalizar(cargado);
  return b.includes(a) || a.includes(b);
};

export const consultarEstadoEquipo = async (req, res) => {
  const dni = String(req.body?.dni ?? '').replace(/\D/g, '');
  const marca = String(req.body?.marca ?? '').trim();
  const modelo = String(req.body?.modelo ?? '').trim();

  if (!dni || !marca) {
    return error(res, 400, 'DATOS_INCOMPLETOS', 'Ingresá el DNI del titular y la marca del equipo.');
  }
  if (dni.length < 6 || dni.length > 9) {
    return error(res, 400, 'DNI_INVALIDO', 'El DNI tiene que tener entre 6 y 9 números, sin puntos.');
  }

  try {
    // 1) Clientes con ese DNI. Se contemplan las formas en que está cargado:
    //    "30123456", "30.123.456" y dos DNI en el mismo campo ("30123456 / 31234567").
    const conPuntos = dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const { data: clientes, error: errClientes } = await supabase
      .from('cliente')
      .select('id, dni')
      .or(`dni.eq.${dni},dni.eq."${conPuntos}",dni.ilike.%${dni}%`)
      .limit(20);
    if (errClientes) throw errClientes;

    const idsClientes = (clientes || [])
      .filter((c) => {
        const txt = String(c.dni ?? '');
        return txt.replace(/\D/g, '') === dni || (txt.match(/\d+/g) || []).includes(dni);
      })
      .map((c) => c.id);

    let rows = [];
    if (idsClientes.length > 0) {
      // 2) Equipos de esos clientes, el más reciente primero
      const { data: equiposDb, error: errEquipos } = await supabase
        .from('equipo')
        .select('id, tipo, marca, modelo, fecha_ingreso, updated_at, estado_id')
        .in('cliente_id', idsClientes)
        .order('fecha_ingreso', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(50);
      if (errEquipos) throw errEquipos;

      const visibles = (equiposDb || []).filter((e) => !ESTADOS_OCULTOS.includes(e.estado_id));

      // 3) Nombre de cada estado
      const idsEstado = [...new Set(visibles.map((e) => e.estado_id).filter(Boolean))];
      let nombres = {};
      if (idsEstado.length > 0) {
        const { data: estados, error: errEstados } = await supabase
          .from('estado')
          .select('id, nombre')
          .in('id', idsEstado);
        if (errEstados) throw errEstados;
        nombres = Object.fromEntries((estados || []).map((es) => [es.id, es.nombre]));
      }
      rows = visibles.map((e) => ({ ...e, estado_nombre: nombres[e.estado_id] ?? null }));
    }

    const equipos = rows
      .filter((e) => coincideMarca(marca, e.marca) && coincideModelo(modelo, e.modelo))
      .slice(0, 5)
      .map(({ estado_id, ...e }) => e);

    if (equipos.length === 0) {
      return error(
        res,
        404,
        'NO_ENCONTRADO',
        modelo
          ? 'No encontramos un equipo con esos datos. Revisá la marca o probá dejando el modelo vacío.'
          : 'No encontramos un equipo con ese DNI y esa marca. Revisá que el DNI sea el del titular de la orden.'
      );
    }

    return res.json({ equipos });
  } catch (err) {
    console.error('[publico/estado-equipo]', err);
    return error(res, 500, 'ERROR_INTERNO', 'No pudimos consultar el estado por un error del servidor. Probá de nuevo en unos minutos.');
  }
};

export default { consultarEstadoEquipo };
