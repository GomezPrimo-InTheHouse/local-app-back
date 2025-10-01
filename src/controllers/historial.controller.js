import { pool } from '../config/db.js';
import {supabase } from '../config/supabase.js';
// export const getHistorialEquipo = async (req, res) => {
//   try {
//     const { equipoId } = req.params;

//     // 1️⃣ Buscar el cliente_id asociado a ese equipo
//     const clienteQuery = `SELECT cliente_id FROM equipo WHERE id = $1`;
//     const clienteResult = await pool.query(clienteQuery, [equipoId]);

//     if (clienteResult.rowCount === 0) {
//       return res.status(404).json({ error: "No se encontró el equipo." });
//     }
    

//     const clienteId = clienteResult.rows[0].cliente_id;

//     // 2️⃣ Obtener todos los equipos del mismo cliente (con ingresos y presupuestos)
//     const query = `
//       SELECT 
//           e.id AS equipo_id,
//           e.tipo,
//           e.marca,
//           e.modelo,
//           e.problema,

//           i.id AS ingreso_id,
//           i.fecha_ingreso,
//           i.fecha_egreso,
//           ei.id AS estado_ingreso_id,
//           ei.nombre AS estado_ingreso_nombre,

//           p.id AS presupuesto_id,
//           p.fecha AS fecha_presupuesto,
//           p.costo,
//           p.total,
//           p.observaciones,
//           ep.id AS estado_presupuesto_id,
//           ep.nombre AS estado_presupuesto_nombre
//       FROM equipo e
//       LEFT JOIN ingreso i ON i.equipo_id = e.id
//       LEFT JOIN estado ei ON i.estado_id = ei.id
//       LEFT JOIN presupuesto p ON p.ingreso_id = i.id
//       LEFT JOIN estado ep ON p.estado_id = ep.id
//       WHERE e.cliente_id = $1
//       ORDER BY e.id, i.fecha_ingreso DESC, p.fecha DESC;
//     `;

//     const { rows } = await pool.query(query, [clienteId]);

//     // 3️⃣ Reagrupar: equipos -> ingresos -> presupuestos
//     const equiposMap = {};

//     rows.forEach(r => {
//       if (!equiposMap[r.equipo_id]) {
//         equiposMap[r.equipo_id] = {
//           equipo_id: r.equipo_id,
//           tipo: r.tipo,
//           marca: r.marca,
//           modelo: r.modelo,
//           problema: r.problema,
//           ingresos: {}
//         };
//       }

//       if (r.ingreso_id) {
//         if (!equiposMap[r.equipo_id].ingresos[r.ingreso_id]) {
//           equiposMap[r.equipo_id].ingresos[r.ingreso_id] = {
//             ingreso_id: r.ingreso_id,
//             fecha_ingreso: r.fecha_ingreso,
//             fecha_egreso: r.fecha_egreso,
//             estado: {
//               id: r.estado_ingreso_id,
//               nombre: r.estado_ingreso_nombre
//             },
//             presupuestos: []
//           };
//         }

//         if (r.presupuesto_id) {
//           equiposMap[r.equipo_id].ingresos[r.ingreso_id].presupuestos.push({
//             presupuesto_id: r.presupuesto_id,
//             fecha: r.fecha_presupuesto,
//             costo: r.costo,
//             total: r.total,
//             observaciones: r.observaciones,
//             estado: {
//               id: r.estado_presupuesto_id,
//               nombre: r.estado_presupuesto_nombre
//             }
//           });
//         }
//       }
//     });

//     // 4️⃣ Devolver como lista ordenada
//     const equipos = Object.values(equiposMap).map(eq => ({
//       ...eq,
//       ingresos: Object.values(eq.ingresos)
//     }));

//     res.json({
//       cliente_id: clienteId,
//       equipos
//     });
//   } catch (error) {
//     console.error('Error en getHistorialEquiposPorCliente:', error.message);
//     res.status(500).json({ error: 'Error al obtener historial de los equipos del cliente' });
//   }
// };


//creo que no seria necesario exportar las funciones, chequear funcionamiento


export const getHistorialEquipo = async (req, res) => {
  try {
    const { equipoId } = req.params;

    // Llamamos al RPC
    const { data, error } = await supabase
      .rpc('obtener_historial_por_equipo', { _equipo_id: Number(equipoId) });

    if (error) {
      console.error('Error RPC obtener_historial_por_equipo:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No se encontró el equipo.' });
    }

    const clienteId = data[0].cliente_id;

    // Reagrupar resultados
    const equiposMap = {};

    data.forEach(r => {
      if (!equiposMap[r.equipo_id]) {
        equiposMap[r.equipo_id] = {
          equipo_id: r.equipo_id,
          tipo: r.tipo,
          marca: r.marca,
          modelo: r.modelo,
          problema: r.problema,
          ingresos: {}
        };
      }

      if (r.ingreso_id) {
        if (!equiposMap[r.equipo_id].ingresos[r.ingreso_id]) {
          equiposMap[r.equipo_id].ingresos[r.ingreso_id] = {
            ingreso_id: r.ingreso_id,
            fecha_ingreso: r.fecha_ingreso,
            fecha_egreso: r.fecha_egreso,
            estado: {
              id: r.estado_ingreso_id,
              nombre: r.estado_ingreso_nombre
            },
            presupuestos: []
          };
        }

        if (r.presupuesto_id) {
          equiposMap[r.equipo_id].ingresos[r.ingreso_id].presupuestos.push({
            presupuesto_id: r.presupuesto_id,
            fecha: r.fecha_presupuesto,
            costo: r.costo,
            total: r.total,
            observaciones: r.observaciones,
            estado: {
              id: r.estado_presupuesto_id,
              nombre: r.estado_presupuesto_nombre
            }
          });
        }
      }
    });

    // Convertir el map a lista ordenada
    const equipos = Object.values(equiposMap).map(eq => ({
      ...eq,
      ingresos: Object.values(eq.ingresos)
    }));

    return res.json({
      cliente_id: clienteId,
      equipos
    });

  } catch (error) {
    console.error('Error en getHistorialEquipo:', error.message);
    res.status(500).json({ error: 'Error al obtener historial de los equipos del cliente' });
  }
};