// // import { pool } from '../config/db.js';
import { supabase } from '../config/supabase.js';
// import { pool } from '../config/supabaseAuthModule.js';

// /**
//  * 1️⃣ Trabajos realizados en el mes + dinero obtenido
//  */
// /**
//  * 1️⃣ Trabajos realizados en el mes + dinero obtenido (balance)
//  */
// export const getTrabajosDelMes = async (req, res) => {
//   try {
//     // 1️⃣ Trabajos realizados en el mes con balance
//     const trabajosMesQuery = `
//       SELECT 
//         c.id AS cliente_id,
//         c.nombre AS cliente_nombre,
//         c.apellido AS cliente_apellido,
//         e.id AS equipo_id,
//         e.tipo,
//         e.marca,
//         e.modelo,
//         COALESCE(SUM(p.costo), 0) AS costo_total,
//         COALESCE(SUM(p.total), 0) AS total_facturado,
//         (COALESCE(SUM(p.total), 0) - COALESCE(SUM(p.costo), 0)) AS balance_final
//       FROM ingreso i
//       INNER JOIN equipo e ON i.equipo_id = e.id
//       INNER JOIN cliente c ON e.cliente_id = c.id
//       LEFT JOIN presupuesto p ON p.ingreso_id = i.id
//       WHERE DATE_TRUNC('month', i.fecha_ingreso) = DATE_TRUNC('month', CURRENT_DATE)
//       GROUP BY c.id, e.id
//       ORDER BY balance_final DESC;
//     `;
//     const { rows: trabajosMes } = await pool.query(trabajosMesQuery);

//     // 2️⃣ Clientes frecuentes
//     const clientesFrecuentesQuery = `
//       SELECT 
//         c.id AS cliente_id,
//         c.nombre,
//         c.apellido,
//         COUNT(e.id) AS equipos_ingresados
//       FROM cliente c
//       INNER JOIN equipo e ON e.cliente_id = c.id
//       GROUP BY c.id
//       ORDER BY equipos_ingresados DESC
//       LIMIT 10;
//     `;
//     const { rows: clientesFrecuentes } = await pool.query(clientesFrecuentesQuery);

//     // 3️⃣ Reparaciones comunes (problemas más repetidos)
//     const reparacionesComunesQuery = `
//       SELECT 
//         e.problema,
//         COUNT(*) AS cantidad
//       FROM equipo e
//       GROUP BY e.problema
//       ORDER BY cantidad DESC
//       LIMIT 10;
//     `;
//     const { rows: reparacionesComunes } = await pool.query(reparacionesComunesQuery);

//     // 4️⃣ Equipos más comunes (tipo + marca + modelo)
//     const equiposComunesQuery = `
//       SELECT 
//         e.tipo,
//         e.marca,
//         e.modelo,
//         COUNT(*) AS cantidad
//       FROM equipo e
//       GROUP BY e.tipo, e.marca, e.modelo
//       ORDER BY cantidad DESC
//       LIMIT 10;
//     `;
//     const { rows: equiposComunes } = await pool.query(equiposComunesQuery);

//     // 📌 Respuesta consolidada
//     res.json({
//       trabajos_mes: trabajosMes,
//       clientes_frecuentes: clientesFrecuentes,
//       reparaciones_comunes: reparacionesComunes,
//       equipos_comunes: equiposComunes,
//     });
//   } catch (error) {
//     console.error('Error en getEstadisticas:', error.message);
//     res.status(500).json({ error: 'Error obteniendo estadísticas' });
//   }
// };



// /**
//  * 2️⃣ Clientes que más equipos ingresaron
//  */
// export const getClientesFrecuentes = async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         c.id AS cliente_id,
//         c.nombre,
//         c.apellido,
//         COUNT(e.id) AS cantidad_equipos
//       FROM cliente c
//       INNER JOIN equipo e ON e.cliente_id = c.id
//       GROUP BY c.id, c.nombre, c.apellido
//       ORDER BY cantidad_equipos DESC
//       LIMIT 10;
//     `;

//     const { rows } = await pool.query(query);
//     res.json({ clientes_frecuentes: rows });
//   } catch (error) {
//     console.error('Error en getClientesFrecuentes:', error.message);
//     res.status(500).json({ error: 'Error obteniendo clientes frecuentes' });
//   }
// };


// /**
//  * 3️⃣ Reparaciones comunes (problemas más frecuentes)
//  */
// export const getReparacionesComunes = async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         e.problema,
//         COUNT(*) AS cantidad
//       FROM equipo e
//       GROUP BY e.problema
//       ORDER BY cantidad DESC
//       LIMIT 10;
//     `;

//     const { rows } = await pool.query(query);
//     res.json({ reparaciones_comunes: rows });
//   } catch (error) {
//     console.error('Error en getReparacionesComunes:', error.message);
//     res.status(500).json({ error: 'Error obteniendo reparaciones comunes' });
//   }
// };


// /**
//  * 4️⃣ Tipos y modelos de equipos comunes
//  */
// export const getEquiposComunes = async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         e.tipo,
//         e.marca,
//         e.modelo,
//         COUNT(*) AS cantidad
//       FROM equipo e
//       GROUP BY e.tipo, e.marca, e.modelo
//       ORDER BY cantidad DESC
//       LIMIT 10;
//     `;

//     const { rows } = await pool.query(query);
//     res.json({ equipos_comunes: rows });
//   } catch (error) {
//     console.error('Error en getEquiposComunes:', error.message);
//     res.status(500).json({ error: 'Error obteniendo equipos comunes' });
//   }
// };


// // export const getEstadisticasPorMes = async (req, res) => {
// //   try {
// //     const { mes, anio } = req.query;

// //     if (!mes) {
// //       return res.status(400).json({ error: 'Debe proporcionar el parámetro "mes" (1-12)' });
// //     }

// //     const year = anio || new Date().getFullYear();

// //     // 1️⃣ Trabajos realizados en el mes (detalle con balances)
// //     const trabajosMesQuery = `
// //       SELECT 
// //         c.id AS cliente_id,
// //         c.nombre AS cliente_nombre,
// //         c.apellido AS cliente_apellido,
// //         e.id AS equipo_id,
// //         e.tipo,
// //         e.marca,
// //         e.modelo,
// //         COALESCE(SUM(p.costo), 0) AS costo_total,
// //         COALESCE(SUM(p.total), 0) AS total_facturado,
// //         (COALESCE(SUM(p.total), 0) - COALESCE(SUM(p.costo), 0)) AS balance_final
// //       FROM ingreso i
// //       INNER JOIN equipo e ON i.equipo_id = e.id
// //       INNER JOIN cliente c ON e.cliente_id = c.id
// //       LEFT JOIN presupuesto p ON p.ingreso_id = i.id
// //       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
// //         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2
// //       GROUP BY c.id, e.id
// //       ORDER BY balance_final DESC;
// //     `;
// //     const { rows: trabajosMes } = await pool.query(trabajosMesQuery, [mes, year]);

// //     // 2️⃣ Totales acumulados del mes (resumen general)
// //     const totalesMesQuery = `
// //       SELECT 
// //         COALESCE(SUM(p.costo), 0) AS costo_total,
// //         COALESCE(SUM(p.total), 0) AS total_facturado,
// //         (COALESCE(SUM(p.total), 0) - COALESCE(SUM(p.costo), 0)) AS balance_total
// //       FROM ingreso i
// //       LEFT JOIN presupuesto p ON p.ingreso_id = i.id
// //       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
// //         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2;
// //     `;
// //     const { rows: [totalesMes] } = await pool.query(totalesMesQuery, [mes, year]);

// //     // 3️⃣ Clientes frecuentes
// //     const clientesFrecuentesQuery = `
// //       SELECT 
// //         c.id AS cliente_id,
// //         c.nombre,
// //         c.apellido,
// //         COUNT(e.id) AS equipos_ingresados
// //       FROM cliente c
// //       INNER JOIN equipo e ON e.cliente_id = c.id
// //       INNER JOIN ingreso i ON i.equipo_id = e.id
// //       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
// //         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2
// //       GROUP BY c.id
// //       ORDER BY equipos_ingresados DESC
// //       LIMIT 10;
// //     `;
// //     const { rows: clientesFrecuentes } = await pool.query(clientesFrecuentesQuery, [mes, year]);

// //     // 4️⃣ Reparaciones comunes
// //     const reparacionesComunesQuery = `
// //       SELECT 
// //         e.problema,
// //         COUNT(*) AS cantidad
// //       FROM equipo e
// //       INNER JOIN ingreso i ON i.equipo_id = e.id
// //       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
// //         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2
// //       GROUP BY e.problema
// //       ORDER BY cantidad DESC
// //       LIMIT 10;
// //     `;
// //     const { rows: reparacionesComunes } = await pool.query(reparacionesComunesQuery, [mes, year]);

// //     // 5️⃣ Equipos más comunes
// //     const equiposComunesQuery = `
// //       SELECT 
// //         e.tipo,
// //         e.marca,
// //         e.modelo,
// //         COUNT(*) AS cantidad
// //       FROM equipo e
// //       INNER JOIN ingreso i ON i.equipo_id = e.id
// //       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
// //         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2
// //       GROUP BY e.tipo, e.marca, e.modelo
// //       ORDER BY cantidad DESC
// //       LIMIT 10;
// //     `;
// //     const { rows: equiposComunes } = await pool.query(equiposComunesQuery, [mes, year]);

// //     res.json({
// //       mes,
// //       anio: year,
// //       resumen_general: {
// //         costo_total: Number(totalesMes.costo_total),
// //         total_facturado: Number(totalesMes.total_facturado),
// //         balance_total: Number(totalesMes.balance_total)
// //       },
// //       trabajos_mes: trabajosMes,
// //       clientes_frecuentes: clientesFrecuentes,
// //       reparaciones_comunes: reparacionesComunes,
// //       equipos_comunes: equiposComunes
// //     });
// //   } catch (error) {
// //     console.error('Error en getEstadisticasPorMes:', error.message);
// //     res.status(500).json({ error: 'Error obteniendo estadísticas por mes' });
// //   }
// // };

// export const getEstadisticasPorMes = async (req, res) => {
//   try {
//     const { mes, anio } = req.query;

//     if (!mes) {
//       return res.status(400).json({ error: 'Debe proporcionar el parámetro "mes" (1-12)' });
//     }

//     const year = anio ? Number(anio) : new Date().getFullYear();

//     // Llamada RPC: fijate bien los nombres de parámetros en la definición: _mes, _anio
//     const { data, error } = await supabase.rpc('get_estadisticas_por_mes', {
//       _mes: Number(mes),
//       _anio: Number(year)
//     });

//     if (error) {
//       console.error('Error en get_estadisticas_por_mes:', error);
//       return res.status(500).json({ error: error.message || 'Error en RPC' });
//     }

//     // data es el jsonb que retornó la función
//     // Lo devolvemos tal cual (manteniendo la misma estructura que tu controlador original)
//     return res.json(data);
//   } catch (err) {
//     console.error('Error en getEstadisticasPorMes:', err);
//     return res.status(500).json({ error: 'Error obteniendo estadísticas por mes' });
//   }
// };

// //VENTAS

// // ✅ Resumen de ventas por período dado
// export const getResumenVentasPorPeriodo = async (req, res) => {
//   const { fecha_inicio, fecha_fin } = req.query;

//   if (!fecha_inicio || !fecha_fin) {
//     return res.status(400).json({ success: false, error: "Fechas de inicio y fin son requeridas" });
//   }

//   try {
//     const query = `
//       SELECT
//         COUNT(id) AS numero_ventas,
//         SUM(total) AS total_ingresos
//       FROM venta
//       WHERE fecha BETWEEN $1 AND $2;
//     `;
//     const { rows } = await pool.query(query, [fecha_inicio, fecha_fin]);
//     res.status(200).json({ success: true, data: rows[0] });
//   } catch (error) {
//     console.error("Error al obtener el resumen de ventas por período:", error.message);
//     res.status(500).json({ success: false, error: "Error al obtener el resumen de ventas por período" });
//   }
// };

// // ✅ Resumen de ventas por mes específico o todos -- TRABAJANDO ESTE
// // export const getResumenVentasPorMes = async (req, res) => {
// //   const { mes, anio } = req.query;

// //   if (!mes || !anio) {
// //     return res.status(400).json({
// //       success: false,
// //       error: "Debes proporcionar 'mes' y 'anio' en el cuerpo de la petición"
// //     });
// //   }

// //   try {
// //     const query = `
// //       SELECT
// //         v.id AS venta_id,
// //         v.fecha,
// //         c.id AS cliente_id,
// //         c.nombre AS nombre_cliente,
// //         p.id AS producto_id,
// //         p.nombre AS nombre_producto,
// //         dv.cantidad,
// //         dv.precio_unitario
// //       FROM venta v
// //       JOIN cliente c ON c.id = v.cliente_id
// //       JOIN detalle_venta dv ON dv.venta_id = v.id
// //       JOIN producto p ON p.id = dv.producto_id
// //       WHERE
// //         EXTRACT(YEAR FROM v.fecha) = $1
// //         AND EXTRACT(MONTH FROM v.fecha) = $2
// //       ORDER BY v.fecha ASC
// //     `;

// //     const values = [anio, mes];
// //     const { rows } = await pool.query(query, values);

// //     const ventasMap = {};
// //     let total_ventas = 0;

// //     for (const row of rows) {
// //       if (!ventasMap[row.venta_id]) {
// //         ventasMap[row.venta_id] = {
// //           venta_id: row.venta_id,
// //           fecha: row.fecha,
// //           cliente_id: row.cliente_id,
// //           nombre_cliente: row.nombre_cliente,
// //           productos: [],
// //           total: 0
// //         };
// //       }

// //       const subtotal = Number(row.cantidad) * Number(row.precio_unitario);
// //       ventasMap[row.venta_id].productos.push({
// //         producto_id: row.producto_id,
// //         nombre_producto: row.nombre_producto,
// //         cantidad: Number(row.cantidad),
// //         precio_unitario: Number(row.precio_unitario),
// //         subtotal
// //       });

// //       ventasMap[row.venta_id].total += subtotal;
// //     }

// //     const ventas = Object.values(ventasMap);
// //     total_ventas = ventas.reduce((sum, v) => sum + v.total, 0);

// //     res.status(200).json({
// //       success: true,
// //       data: {
// //         total_ventas,
// //         ventas
// //       }
// //     });
// //   } catch (error) {
// //     console.error("Error al obtener las ventas del mes:", error.message);
// //     res.status(500).json({
// //       success: false,
// //       error: "Error al obtener las ventas del mes"
// //     });
// //   }
// // };


// // endpoint utilizado para obtener el resumen de ventas por mes específico ( actualmente es el que utiliza el frontend )
// // export const getResumenVentasPorMes = async (req, res) => {
// //   const { mes, anio } = req.query;

// //   if (!mes || !anio) {
// //     return res.status(400).json({
// //       success: false,
// //       error: "Debes proporcionar 'mes' y 'anio' en el cuerpo de la petición"
// //     });
// //   }

// //   try {
// //     // llamar RPC: atención a los nombres de parámetro: _anio, _mes
// //     const { data: rows, error } = await supabase
// //       .rpc('get_resumen_ventas_por_mes', { _anio: Number(anio), _mes: Number(mes) });

// //     if (error) throw error;

// //     // Reconstruir exactamente la misma estructura que tu versión con pool.query
// //     const ventasMap = {};
// //     let total_ventas = 0;

// //     for (const row of rows || []) {
// //       if (!ventasMap[row.venta_id]) {
// //         ventasMap[row.venta_id] = {
// //           venta_id: row.venta_id,
// //           fecha: row.fecha,
// //           cliente_id: row.cliente_id,
// //           nombre_cliente: row.nombre_cliente,
// //           productos: [],
// //           total: 0
// //         };
// //       }

// //       const subtotal = Number(row.cantidad) * Number(row.precio_unitario);
// //       ventasMap[row.venta_id].productos.push({
// //         producto_id: row.producto_id,
// //         nombre_producto: row.nombre_producto,
// //         cantidad: Number(row.cantidad),
// //         precio_unitario: Number(row.precio_unitario),
// //         subtotal
// //       });

// //       ventasMap[row.venta_id].total += subtotal;
// //     }

// //     const ventas = Object.values(ventasMap);
// //     total_ventas = ventas.reduce((sum, v) => sum + v.total, 0);

// //     return res.status(200).json({
// //       success: true,
// //       data: {
// //         total_ventas,
// //         ventas
// //       }
// //     });
// //   } catch (error) {
// //     console.error("Error al obtener las ventas del mes:", error?.message || error);
// //     return res.status(500).json({
// //       success: false,
// //       error: "Error al obtener las ventas del mes"
// //     });
// //   }
// // };

// //inicio test : pasando a SQL PURO y añadiendo costos
// export const getResumenVentasPorMes = async (req, res) => {
//   const { mes, anio } = req.query;

//   if (!mes || !anio) {
//     return res.status(400).json({
//       success: false,
//       error: "Debes proporcionar 'mes' y 'anio' como query params (?mes=..&anio=..)",
//     });
//   }

//   const nMes = Number(mes);
//   const nAnio = Number(anio);

//   if (!Number.isInteger(nMes) || !Number.isInteger(nAnio) || nMes < 1 || nMes > 12) {
//     return res.status(400).json({
//       success: false,
//       error: "Los parámetros 'mes' (1-12) y 'anio' deben ser números válidos",
//     });
//   }

//   try {
//     const sql = `
//       SELECT
//         v.id           AS venta_id,
//         v.estado_id,
//         v.fecha,
//         c.id           AS cliente_id,
//         c.nombre       AS nombre_cliente,
//         p.id           AS producto_id,
//         p.nombre       AS nombre_producto,
//         dv.cantidad,
//         dv.precio_unitario,
//         p.costo        AS costo_unitario
//       FROM venta v
//       JOIN cliente       c  ON c.id = v.cliente_id
//       JOIN detalle_venta dv ON dv.venta_id = v.id
//       JOIN producto      p  ON p.id = dv.producto_id
//       WHERE
//         EXTRACT(YEAR FROM v.fecha)  = $1
//         AND EXTRACT(MONTH FROM v.fecha) = $2
//         AND v.estado_id != 20  -- excluir ventas dadas de baja
//       ORDER BY v.fecha ASC;
//     `;

//     const { rows } = await pool.query(sql, [nAnio, nMes]);

//     const ventasMap = {};
//     let total_ventas = 0;
//     let total_costos = 0;

//     for (const row of rows || []) {
//       const ventaId = row.venta_id;

//       if (!ventasMap[ventaId]) {
//         ventasMap[ventaId] = {
//           venta_id: ventaId,
//           fecha: row.fecha,
//           cliente_id: row.cliente_id,
//           nombre_cliente: row.nombre_cliente,
//           productos: [],
//           total: 0,
//           total_costo: 0,
//         };
//       }

//       const cantidad = Number(row.cantidad) || 0;
//       const precioUnit = Number(row.precio_unitario) || 0;
//       const costoUnit = Number(row.costo_unitario) || 0;

//       const subtotal = cantidad * precioUnit;
//       const subtotal_costo = cantidad * costoUnit;

//       ventasMap[ventaId].productos.push({
//         producto_id: row.producto_id,
//         nombre_producto: row.nombre_producto,
//         cantidad,
//         precio_unitario: precioUnit,
//         costo_unitario: costoUnit,
//         subtotal,
//         subtotal_costo,
//       });

//       ventasMap[ventaId].total += subtotal;
//       ventasMap[ventaId].total_costo += subtotal_costo;
//     }

//     const ventas = Object.values(ventasMap);

//     total_ventas = ventas.reduce((sum, v) => sum + v.total, 0);
//     total_costos = ventas.reduce((sum, v) => sum + v.total_costo, 0);
//     const total_ganancia = total_ventas - total_costos;

//     return res.status(200).json({
//       success: true,
//       data: {
//         total_ventas,
//         total_costos,
//         total_ganancia,
//         ventas,
//       },
//     });
//   } catch (error) {
//     console.error("Error al obtener las ventas del mes:", error?.message || error);
//     return res.status(500).json({
//       success: false,
//       error: "Error al obtener las ventas del mes",
//     });
//   }
// };

// //fin test : pasando a SQL PURO y añadiendo costos




// // ✅ Resumen de saldos de clientes
// export const getResumenCuentaClienteByID = async (req, res) => {
//   try {
//     const query = `
//       SELECT
//         c.id AS cliente_id,
//         c.nombre,
//         c.apellido,
//         SUM(v.saldo) AS saldo_pendiente
//       FROM venta v
//       INNER JOIN cliente c ON v.cliente_id = c.id
//       GROUP BY c.id, c.nombre, c.apellido
//       HAVING SUM(v.saldo) > 0
//       ORDER BY saldo_pendiente DESC;
//     `;
//     const { rows } = await pool.query(query);
//     res.status(200).json({ success: true, data: rows });
//   } catch (error) {
//     console.error("Error al obtener el resumen de saldos de clientes:", error.message);
//     res.status(500).json({ success: false, error: "Error al obtener el resumen de saldos de clientes" });
//   }
// };

// // ✅ Resumen de ventas por período dado
// export const resumenPorPeriodo = async (req, res) => {
//   const { fecha_inicio, fecha_fin } = req.query;

//   if (!fecha_inicio || !fecha_fin) {
//     return res.status(400).json({ success: false, error: "Fechas de inicio y fin son requeridas" });
//   }

//   try {
//     const query = `
//       SELECT
//         COUNT(id) AS numero_ventas,
//         SUM(total) AS total_ingresos
//       FROM venta
//       WHERE fecha BETWEEN $1 AND $2;
//     `;
//     const { rows } = await pool.query(query, [fecha_inicio, fecha_fin]);
//     res.status(200).json({ success: true, data: rows[0] });
//   } catch (error) {
//     console.error("Error al obtener el resumen de ventas por período:", error.message);
//     res.status(500).json({ success: false, error: "Error al obtener el resumen de ventas por período" });
//   }
// };




/**
 * 1️⃣ Estadísticas Generales (Consolidado)
 * Nota: Dado que esta función hace múltiples agregaciones complejas, 
 * lo más eficiente es usar una función RPC en Supabase que devuelva todo el JSON.
 */
export const getTrabajosDelMes = async (req, res) => {
  try {
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();

    // Reutilizamos la lógica de la función RPC que ya tienes definida para el mes actual
    const { data, error } = await supabase.rpc('get_estadisticas_por_mes', {
      _mes: mesActual,
      _anio: anioActual
    });

    if (error) throw error;

    res.json({
      trabajos_mes: data.trabajos_mes,
      clientes_frecuentes: data.clientes_frecuentes,
      reparaciones_comunes: data.reparaciones_comunes,
      equipos_comunes: data.equipos_comunes,
    });
  } catch (error) {
    console.error('Error en getTrabajosDelMes:', error.message);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
};

/**
 * 2️⃣ Clientes Frecuentes
 */
export const getClientesFrecuentes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cliente')
      .select(`
        id,
        nombre,
        apellido,
        equipo:equipo(id)
      `)
      .limit(10);

    if (error) throw error;

    // Mapeo manual para mantener la respuesta idéntica (COUNT de equipos)
    const clientes_frecuentes = data.map(c => ({
      cliente_id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      cantidad_equipos: c.equipo.length
    })).sort((a, b) => b.cantidad_equipos - a.cantidad_equipos);

    res.json({ clientes_frecuentes });
  } catch (error) {
    console.error('Error en getClientesFrecuentes:', error.message);
    res.status(500).json({ error: 'Error obteniendo clientes frecuentes' });
  }
};

/**
 * 3️⃣ Reparaciones comunes
 */
export const getReparacionesComunes = async (req, res) => {
  try {
    // Para GROUP BY complejos con COUNT, lo mejor es una vista o RPC, 
    // pero podemos emularlo así:
    const { data, error } = await supabase.rpc('get_reparaciones_comunes_simple'); 
    // Si no tienes RPC, puedes usar .select('problema').then(...) y contar en JS
    
    if (error) throw error;
    res.json({ reparaciones_comunes: data });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo reparaciones comunes' });
  }
};

/**
 * 5️⃣ Estadísticas por Mes (RPC - Ya lo tenías casi listo)
 */
// export const getEstadisticasPorMes = async (req, res) => {
//   try {
//     const { mes, anio } = req.query;
//     if (!mes) return res.status(400).json({ error: 'Falta mes' });

//     const year = anio ? Number(anio) : new Date().getFullYear();

//     const { data, error } = await supabase.rpc('get_estadisticas_por_mes', {
//       _mes: Number(mes),
//       _anio: year
//     });

//     if (error) throw error;
//     return res.json(data);
//   } catch (err) {
//     res.status(500).json({ error: 'Error obteniendo estadísticas por mes' });
//   }
// };





export const getEstadisticasPorMes = async (req, res) => {
  try {
    const fechaActual = new Date();
    const nMes = req.query.mes ? Number(req.query.mes) : fechaActual.getMonth() + 1;
    const nAnio = req.query.anio ? Number(req.query.anio) : fechaActual.getFullYear();

    const inicioMes = new Date(nAnio, nMes - 1, 1).toISOString();
    const finMes = new Date(nAnio, nMes, 0, 23, 59, 59).toISOString();

    const [ventasResp, presupuestosResp] = await Promise.all([
      supabase
        .from('venta')
        .select(`
          total,
          detalle_venta (
            cantidad,
            subtotal,
            producto:producto!detalle_venta_producto_id_fkey ( costo )
          )
        `)
        .gte('fecha', inicioMes)
        .lte('fecha', finMes)
        .not('estado_id', 'in', '(20, 28)'), // 👈 EXCLUIMOS INACTIVOS (20) Y CANCELADOS (28)

      supabase
        .from('presupuesto')
        .select('total, costo')
        .gte('fecha', inicioMes)
        .lte('fecha', finMes)
        .not('estado_id', 'in', '(3, 18, 20)') // 👈 EXCLUIMOS RECHAZADOS, BAJAS E INACTIVOS
    ]);

    if (ventasResp.error) throw ventasResp.error;
    if (presupuestosResp.error) throw presupuestosResp.error;

    let totalVentasBruto = 0;
    let gananciaNetaVentas = 0;

    ventasResp.data.forEach(v => {
      totalVentasBruto += Number(v.total || 0);
      v.detalle_venta?.forEach(dv => {
        const costoTotalProd = Number(dv.producto?.costo || 0) * Number(dv.cantidad || 0);
        gananciaNetaVentas += (Number(dv.subtotal || 0) - costoTotalProd);
      });
    });

    let totalTallerBruto = 0;
    let gananciaNetaTaller = 0;

    presupuestosResp.data.forEach(p => {
      totalTallerBruto += Number(p.total || 0);
      gananciaNetaTaller += (Number(p.total || 0) - Number(p.costo || 0));
    });

    return res.json({
      success: true,
      mes: nMes,
      anio: nAnio,
      data: {
        ventas_bruto: totalVentasBruto,
        ventas_neto: gananciaNetaVentas,
        taller_bruto: totalTallerBruto,
        taller_neto: gananciaNetaTaller,
        balance_total_general: gananciaNetaVentas + gananciaNetaTaller
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
/**
 * 💰 VENTAS: getResumenVentasPorMes (Lógica de mapeo de productos)
 */
export const getResumenVentasPorMes = async (req, res) => {
  const { mes, anio } = req.query;
  if (!mes || !anio) return res.status(400).json({ success: false, error: "Faltan mes y anio" });

  try {
    // Usamos el cliente para traer los datos relacionados (Join)
    const { data: rows, error } = await supabase
      .from('venta')
      .select(`
        id,
        fecha,
        estado_id,
        cliente:cliente(id, nombre),
        detalle_venta:detalle_venta(
          cantidad,
          precio_unitario,
          producto:producto(id, nombre, costo)
        )
      `)
      .neq('estado_id', 20) // Excluir bajas
      // Filtro de fecha simplificado para Supabase
      .gte('fecha', `${anio}-${mes}-01`)
      .lte('fecha', `${anio}-${mes}-31`);

    if (error) throw error;

    const ventasMap = {};
    let total_ventas = 0;
    let total_costos = 0;

    rows.forEach(v => {
      const ventaId = v.id;
      if (!ventasMap[ventaId]) {
        ventasMap[ventaId] = {
          venta_id: ventaId,
          fecha: v.fecha,
          cliente_id: v.cliente.id,
          nombre_cliente: v.cliente.nombre,
          productos: [],
          total: 0,
          total_costo: 0,
        };
      }

      v.detalle_venta.forEach(dv => {
        const subtotal = Number(dv.cantidad) * Number(dv.precio_unitario);
        const subtotal_costo = Number(dv.cantidad) * Number(dv.producto.costo);

        ventasMap[ventaId].productos.push({
          producto_id: dv.producto.id,
          nombre_producto: dv.producto.nombre,
          cantidad: dv.cantidad,
          precio_unitario: dv.precio_unitario,
          costo_unitario: dv.producto.costo,
          subtotal,
          subtotal_costo,
        });

        ventasMap[ventaId].total += subtotal;
        ventasMap[ventaId].total_costo += subtotal_costo;
      });
    });

    const ventas = Object.values(ventasMap);
    total_ventas = ventas.reduce((sum, v) => sum + v.total, 0);
    total_costos = ventas.reduce((sum, v) => sum + v.total_costo, 0);

    res.status(200).json({
      success: true,
      data: {
        total_ventas,
        total_costos,
        total_ganancia: total_ventas - total_costos,
        ventas,
      },
    });
  } catch (error) {
    console.error("Error en ventas mes:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener las ventas" });
  }
};

/**
 * 🔍 Resumen de saldos de clientes
 */
export const getResumenCuentaClienteByID = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('venta')
      .select(`
        saldo,
        cliente:cliente(id, nombre, apellido)
      `)
      .gt('saldo', 0);

    if (error) throw error;

    // Agrupamos por cliente manualmente para mantener la estructura original
    const agrupado = data.reduce((acc, curr) => {
      const cid = curr.cliente.id;
      if (!acc[cid]) {
        acc[cid] = { 
          cliente_id: cid, 
          nombre: curr.cliente.nombre, 
          apellido: curr.cliente.apellido, 
          saldo_pendiente: 0 
        };
      }
      acc[cid].saldo_pendiente += Number(curr.saldo);
      return acc;
    }, {});

    res.status(200).json({ 
      success: true, 
      data: Object.values(agrupado).sort((a,b) => b.saldo_pendiente - a.saldo_pendiente) 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error en saldos" });
  }
};
/**
 * 4️⃣ Tipos y modelos de equipos comunes
 */
export const getEquiposComunes = async (req, res) => {
  try {
    // Opción A: Si tienes una función RPC (Recomendado para velocidad)
    const { data: equiposComunes, error } = await supabase.rpc('get_equipos_comunes_estadistica');

    // Opción B: Si prefieres no crear el RPC ahora, podemos usar esta lógica:
    /*
    const { data, error } = await supabase
      .from('equipo')
      .select('tipo, marca, modelo');
      
    // Luego agrupamos en JS (solo si el volumen de datos es manejable)
    const conteo = data.reduce((acc, eq) => {
      const key = `${eq.tipo}-${eq.marca}-${eq.modelo}`;
      if (!acc[key]) {
        acc[key] = { tipo: eq.tipo, marca: eq.marca, modelo: eq.modelo, cantidad: 0 };
      }
      acc[key].cantidad++;
      return acc;
    }, {});
    const equiposComunes = Object.values(conteo)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
    */

    if (error) throw error;

    // Devolvemos exactamente el mismo formato de objeto
    res.json({ equipos_comunes: equiposComunes });
    
  } catch (error) {
    console.error('Error en getEquiposComunes:', error.message);
    res.status(500).json({ error: 'Error obteniendo equipos comunes' });
  }
};

// ✅ Resumen de ventas por período dado
export const resumenPorPeriodo = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: "Fechas de inicio y fin son requeridas" });
  }

  try {
    // 1. Consultamos las ventas en el rango de fechas
    // Pedimos solo el campo 'total' para no sobrecargar la red
    const { data, error, count } = await supabase
      .from('venta')
      .select('total', { count: 'exact' }) 
      .gte('fecha', fecha_inicio)
      .lte('fecha', fecha_fin);

    if (error) throw error;

    // 2. Calculamos el total de ingresos sumando los totales del array devuelto
    const total_ingresos = data.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    // 3. Devolvemos la respuesta con la misma estructura original
    res.status(200).json({ 
      success: true, 
      data: {
        numero_ventas: count || 0,
        total_ingresos: total_ingresos
      }
    });

  } catch (error) {
    console.error("Error al obtener el resumen de ventas por período:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener el resumen de ventas por período" });
  }
};

export const getResumenVentasPorPeriodo = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: "Fechas de inicio y fin son requeridas" });
  }

  try {
    const { data, error, count } = await supabase
      .from('venta')
      .select('total', { count: 'exact' })
      .gte('fecha', fecha_inicio)
      .lte('fecha', fecha_fin);

    if (error) throw error;

    const total_ingresos = data.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    res.status(200).json({ 
      success: true, 
      data: {
        numero_ventas: count || 0,
        total_ingresos: total_ingresos
      } 
    });
  } catch (error) {
    console.error("Error en resumen por periodo:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener el resumen de ventas" });
  }
};