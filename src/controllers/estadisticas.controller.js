// import { pool } from '../config/db.js';
import { supabase } from '../config/supabase.js';
/**
 * 1️⃣ Trabajos realizados en el mes + dinero obtenido
 */
/**
 * 1️⃣ Trabajos realizados en el mes + dinero obtenido (balance)
 */
export const getTrabajosDelMes = async (req, res) => {
  try {
    // 1️⃣ Trabajos realizados en el mes con balance
    const trabajosMesQuery = `
      SELECT 
        c.id AS cliente_id,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        e.id AS equipo_id,
        e.tipo,
        e.marca,
        e.modelo,
        COALESCE(SUM(p.costo), 0) AS costo_total,
        COALESCE(SUM(p.total), 0) AS total_facturado,
        (COALESCE(SUM(p.total), 0) - COALESCE(SUM(p.costo), 0)) AS balance_final
      FROM ingreso i
      INNER JOIN equipo e ON i.equipo_id = e.id
      INNER JOIN cliente c ON e.cliente_id = c.id
      LEFT JOIN presupuesto p ON p.ingreso_id = i.id
      WHERE DATE_TRUNC('month', i.fecha_ingreso) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY c.id, e.id
      ORDER BY balance_final DESC;
    `;
    const { rows: trabajosMes } = await pool.query(trabajosMesQuery);

    // 2️⃣ Clientes frecuentes
    const clientesFrecuentesQuery = `
      SELECT 
        c.id AS cliente_id,
        c.nombre,
        c.apellido,
        COUNT(e.id) AS equipos_ingresados
      FROM cliente c
      INNER JOIN equipo e ON e.cliente_id = c.id
      GROUP BY c.id
      ORDER BY equipos_ingresados DESC
      LIMIT 10;
    `;
    const { rows: clientesFrecuentes } = await pool.query(clientesFrecuentesQuery);

    // 3️⃣ Reparaciones comunes (problemas más repetidos)
    const reparacionesComunesQuery = `
      SELECT 
        e.problema,
        COUNT(*) AS cantidad
      FROM equipo e
      GROUP BY e.problema
      ORDER BY cantidad DESC
      LIMIT 10;
    `;
    const { rows: reparacionesComunes } = await pool.query(reparacionesComunesQuery);

    // 4️⃣ Equipos más comunes (tipo + marca + modelo)
    const equiposComunesQuery = `
      SELECT 
        e.tipo,
        e.marca,
        e.modelo,
        COUNT(*) AS cantidad
      FROM equipo e
      GROUP BY e.tipo, e.marca, e.modelo
      ORDER BY cantidad DESC
      LIMIT 10;
    `;
    const { rows: equiposComunes } = await pool.query(equiposComunesQuery);

    // 📌 Respuesta consolidada
    res.json({
      trabajos_mes: trabajosMes,
      clientes_frecuentes: clientesFrecuentes,
      reparaciones_comunes: reparacionesComunes,
      equipos_comunes: equiposComunes,
    });
  } catch (error) {
    console.error('Error en getEstadisticas:', error.message);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
};



/**
 * 2️⃣ Clientes que más equipos ingresaron
 */
export const getClientesFrecuentes = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id AS cliente_id,
        c.nombre,
        c.apellido,
        COUNT(e.id) AS cantidad_equipos
      FROM cliente c
      INNER JOIN equipo e ON e.cliente_id = c.id
      GROUP BY c.id, c.nombre, c.apellido
      ORDER BY cantidad_equipos DESC
      LIMIT 10;
    `;

    const { rows } = await pool.query(query);
    res.json({ clientes_frecuentes: rows });
  } catch (error) {
    console.error('Error en getClientesFrecuentes:', error.message);
    res.status(500).json({ error: 'Error obteniendo clientes frecuentes' });
  }
};


/**
 * 3️⃣ Reparaciones comunes (problemas más frecuentes)
 */
export const getReparacionesComunes = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.problema,
        COUNT(*) AS cantidad
      FROM equipo e
      GROUP BY e.problema
      ORDER BY cantidad DESC
      LIMIT 10;
    `;

    const { rows } = await pool.query(query);
    res.json({ reparaciones_comunes: rows });
  } catch (error) {
    console.error('Error en getReparacionesComunes:', error.message);
    res.status(500).json({ error: 'Error obteniendo reparaciones comunes' });
  }
};


/**
 * 4️⃣ Tipos y modelos de equipos comunes
 */
export const getEquiposComunes = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.tipo,
        e.marca,
        e.modelo,
        COUNT(*) AS cantidad
      FROM equipo e
      GROUP BY e.tipo, e.marca, e.modelo
      ORDER BY cantidad DESC
      LIMIT 10;
    `;

    const { rows } = await pool.query(query);
    res.json({ equipos_comunes: rows });
  } catch (error) {
    console.error('Error en getEquiposComunes:', error.message);
    res.status(500).json({ error: 'Error obteniendo equipos comunes' });
  }
};


// export const getEstadisticasPorMes = async (req, res) => {
//   try {
//     const { mes, anio } = req.query;

//     if (!mes) {
//       return res.status(400).json({ error: 'Debe proporcionar el parámetro "mes" (1-12)' });
//     }

//     const year = anio || new Date().getFullYear();

//     // 1️⃣ Trabajos realizados en el mes (detalle con balances)
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
//       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
//         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2
//       GROUP BY c.id, e.id
//       ORDER BY balance_final DESC;
//     `;
//     const { rows: trabajosMes } = await pool.query(trabajosMesQuery, [mes, year]);

//     // 2️⃣ Totales acumulados del mes (resumen general)
//     const totalesMesQuery = `
//       SELECT 
//         COALESCE(SUM(p.costo), 0) AS costo_total,
//         COALESCE(SUM(p.total), 0) AS total_facturado,
//         (COALESCE(SUM(p.total), 0) - COALESCE(SUM(p.costo), 0)) AS balance_total
//       FROM ingreso i
//       LEFT JOIN presupuesto p ON p.ingreso_id = i.id
//       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
//         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2;
//     `;
//     const { rows: [totalesMes] } = await pool.query(totalesMesQuery, [mes, year]);

//     // 3️⃣ Clientes frecuentes
//     const clientesFrecuentesQuery = `
//       SELECT 
//         c.id AS cliente_id,
//         c.nombre,
//         c.apellido,
//         COUNT(e.id) AS equipos_ingresados
//       FROM cliente c
//       INNER JOIN equipo e ON e.cliente_id = c.id
//       INNER JOIN ingreso i ON i.equipo_id = e.id
//       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
//         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2
//       GROUP BY c.id
//       ORDER BY equipos_ingresados DESC
//       LIMIT 10;
//     `;
//     const { rows: clientesFrecuentes } = await pool.query(clientesFrecuentesQuery, [mes, year]);

//     // 4️⃣ Reparaciones comunes
//     const reparacionesComunesQuery = `
//       SELECT 
//         e.problema,
//         COUNT(*) AS cantidad
//       FROM equipo e
//       INNER JOIN ingreso i ON i.equipo_id = e.id
//       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
//         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2
//       GROUP BY e.problema
//       ORDER BY cantidad DESC
//       LIMIT 10;
//     `;
//     const { rows: reparacionesComunes } = await pool.query(reparacionesComunesQuery, [mes, year]);

//     // 5️⃣ Equipos más comunes
//     const equiposComunesQuery = `
//       SELECT 
//         e.tipo,
//         e.marca,
//         e.modelo,
//         COUNT(*) AS cantidad
//       FROM equipo e
//       INNER JOIN ingreso i ON i.equipo_id = e.id
//       WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = $1
//         AND EXTRACT(YEAR FROM i.fecha_ingreso) = $2
//       GROUP BY e.tipo, e.marca, e.modelo
//       ORDER BY cantidad DESC
//       LIMIT 10;
//     `;
//     const { rows: equiposComunes } = await pool.query(equiposComunesQuery, [mes, year]);

//     res.json({
//       mes,
//       anio: year,
//       resumen_general: {
//         costo_total: Number(totalesMes.costo_total),
//         total_facturado: Number(totalesMes.total_facturado),
//         balance_total: Number(totalesMes.balance_total)
//       },
//       trabajos_mes: trabajosMes,
//       clientes_frecuentes: clientesFrecuentes,
//       reparaciones_comunes: reparacionesComunes,
//       equipos_comunes: equiposComunes
//     });
//   } catch (error) {
//     console.error('Error en getEstadisticasPorMes:', error.message);
//     res.status(500).json({ error: 'Error obteniendo estadísticas por mes' });
//   }
// };

export const getEstadisticasPorMes = async (req, res) => {
  try {
    const { mes, anio } = req.query;

    if (!mes) {
      return res.status(400).json({ error: 'Debe proporcionar el parámetro "mes" (1-12)' });
    }

    const year = anio ? Number(anio) : new Date().getFullYear();

    // Llamada RPC: fijate bien los nombres de parámetros en la definición: _mes, _anio
    const { data, error } = await supabase.rpc('get_estadisticas_por_mes', {
      _mes: Number(mes),
      _anio: Number(year)
    });

    if (error) {
      console.error('Error en get_estadisticas_por_mes:', error);
      return res.status(500).json({ error: error.message || 'Error en RPC' });
    }

    // data es el jsonb que retornó la función
    // Lo devolvemos tal cual (manteniendo la misma estructura que tu controlador original)
    return res.json(data);
  } catch (err) {
    console.error('Error en getEstadisticasPorMes:', err);
    return res.status(500).json({ error: 'Error obteniendo estadísticas por mes' });
  }
};

//VENTAS

// ✅ Resumen de ventas por período dado
export const getResumenVentasPorPeriodo = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: "Fechas de inicio y fin son requeridas" });
  }

  try {
    const query = `
      SELECT
        COUNT(id) AS numero_ventas,
        SUM(total) AS total_ingresos
      FROM venta
      WHERE fecha BETWEEN $1 AND $2;
    `;
    const { rows } = await pool.query(query, [fecha_inicio, fecha_fin]);
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error al obtener el resumen de ventas por período:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener el resumen de ventas por período" });
  }
};

// ✅ Resumen de ventas por mes específico o todos -- TRABAJANDO ESTE
// export const getResumenVentasPorMes = async (req, res) => {
//   const { mes, anio } = req.query;

//   if (!mes || !anio) {
//     return res.status(400).json({
//       success: false,
//       error: "Debes proporcionar 'mes' y 'anio' en el cuerpo de la petición"
//     });
//   }

//   try {
//     const query = `
//       SELECT
//         v.id AS venta_id,
//         v.fecha,
//         c.id AS cliente_id,
//         c.nombre AS nombre_cliente,
//         p.id AS producto_id,
//         p.nombre AS nombre_producto,
//         dv.cantidad,
//         dv.precio_unitario
//       FROM venta v
//       JOIN cliente c ON c.id = v.cliente_id
//       JOIN detalle_venta dv ON dv.venta_id = v.id
//       JOIN producto p ON p.id = dv.producto_id
//       WHERE
//         EXTRACT(YEAR FROM v.fecha) = $1
//         AND EXTRACT(MONTH FROM v.fecha) = $2
//       ORDER BY v.fecha ASC
//     `;

//     const values = [anio, mes];
//     const { rows } = await pool.query(query, values);

//     const ventasMap = {};
//     let total_ventas = 0;

//     for (const row of rows) {
//       if (!ventasMap[row.venta_id]) {
//         ventasMap[row.venta_id] = {
//           venta_id: row.venta_id,
//           fecha: row.fecha,
//           cliente_id: row.cliente_id,
//           nombre_cliente: row.nombre_cliente,
//           productos: [],
//           total: 0
//         };
//       }

//       const subtotal = Number(row.cantidad) * Number(row.precio_unitario);
//       ventasMap[row.venta_id].productos.push({
//         producto_id: row.producto_id,
//         nombre_producto: row.nombre_producto,
//         cantidad: Number(row.cantidad),
//         precio_unitario: Number(row.precio_unitario),
//         subtotal
//       });

//       ventasMap[row.venta_id].total += subtotal;
//     }

//     const ventas = Object.values(ventasMap);
//     total_ventas = ventas.reduce((sum, v) => sum + v.total, 0);

//     res.status(200).json({
//       success: true,
//       data: {
//         total_ventas,
//         ventas
//       }
//     });
//   } catch (error) {
//     console.error("Error al obtener las ventas del mes:", error.message);
//     res.status(500).json({
//       success: false,
//       error: "Error al obtener las ventas del mes"
//     });
//   }
// };



export const getResumenVentasPorMes = async (req, res) => {
  const { mes, anio } = req.query;

  if (!mes || !anio) {
    return res.status(400).json({
      success: false,
      error: "Debes proporcionar 'mes' y 'anio' en el cuerpo de la petición"
    });
  }

  try {
    // llamar RPC: atención a los nombres de parámetro: _anio, _mes
    const { data: rows, error } = await supabase
      .rpc('get_resumen_ventas_por_mes', { _anio: Number(anio), _mes: Number(mes) });

    if (error) throw error;

    // Reconstruir exactamente la misma estructura que tu versión con pool.query
    const ventasMap = {};
    let total_ventas = 0;

    for (const row of rows || []) {
      if (!ventasMap[row.venta_id]) {
        ventasMap[row.venta_id] = {
          venta_id: row.venta_id,
          fecha: row.fecha,
          cliente_id: row.cliente_id,
          nombre_cliente: row.nombre_cliente,
          productos: [],
          total: 0
        };
      }

      const subtotal = Number(row.cantidad) * Number(row.precio_unitario);
      ventasMap[row.venta_id].productos.push({
        producto_id: row.producto_id,
        nombre_producto: row.nombre_producto,
        cantidad: Number(row.cantidad),
        precio_unitario: Number(row.precio_unitario),
        subtotal
      });

      ventasMap[row.venta_id].total += subtotal;
    }

    const ventas = Object.values(ventasMap);
    total_ventas = ventas.reduce((sum, v) => sum + v.total, 0);

    return res.status(200).json({
      success: true,
      data: {
        total_ventas,
        ventas
      }
    });
  } catch (error) {
    console.error("Error al obtener las ventas del mes:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener las ventas del mes"
    });
  }
};




// ✅ Resumen de saldos de clientes
export const getResumenCuentaClienteByID = async (req, res) => {
  try {
    const query = `
      SELECT
        c.id AS cliente_id,
        c.nombre,
        c.apellido,
        SUM(v.saldo) AS saldo_pendiente
      FROM venta v
      INNER JOIN cliente c ON v.cliente_id = c.id
      GROUP BY c.id, c.nombre, c.apellido
      HAVING SUM(v.saldo) > 0
      ORDER BY saldo_pendiente DESC;
    `;
    const { rows } = await pool.query(query);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error al obtener el resumen de saldos de clientes:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener el resumen de saldos de clientes" });
  }
};

// ✅ Resumen de ventas por período dado
export const resumenPorPeriodo = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: "Fechas de inicio y fin son requeridas" });
  }

  try {
    const query = `
      SELECT
        COUNT(id) AS numero_ventas,
        SUM(total) AS total_ingresos
      FROM venta
      WHERE fecha BETWEEN $1 AND $2;
    `;
    const { rows } = await pool.query(query, [fecha_inicio, fecha_fin]);
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error al obtener el resumen de ventas por período:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener el resumen de ventas por período" });
  }
};
