

// controllers/equipos/getHistorialEquipo.sql.controller.js
import { pool } from '../config/supabaseAuthModule.js';



export const getHistorialCliente = async (req, res) => {
  try {
    const { equipoId } = req.params;
    const id = Number(equipoId);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'equipoId inválido' });
    }

    // SQL equivalente al RPC, parametrizado
    const SQL = `
      WITH base AS (
        SELECT
          e.cliente_id,
          e.id AS equipo_id,
          e.tipo,
          e.marca,
          e.modelo,
          e.problema,
          i.id AS ingreso_id,
          i.fecha_ingreso,
          i.fecha_egreso,
          ei.id AS estado_ingreso_id,
          ei.nombre AS estado_ingreso_nombre,
          p.id AS presupuesto_id,
          p.fecha AS fecha_presupuesto,
          p.costo,
          p.total,
          p.observaciones,
          ep.id AS estado_presupuesto_id,
          ep.nombre AS estado_presupuesto_nombre
        FROM equipo e
        LEFT JOIN ingreso i       ON i.equipo_id = e.id
        LEFT JOIN estado  ei      ON i.estado_id = ei.id
        LEFT JOIN presupuesto p   ON p.ingreso_id = i.id
        LEFT JOIN estado  ep      ON p.estado_id = ep.id
        WHERE e.cliente_id = (SELECT cliente_id FROM equipo WHERE id = $1)
      )
      SELECT *
      FROM base
      
      ORDER BY equipo_id ASC,
               fecha_ingreso DESC NULLS LAST,
               fecha_presupuesto DESC NULLS LAST;
    `;

    const { rows: data } = await pool.query(SQL, [id]);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No se encontró el equipo.' });
    }

    const clienteId = data[0].cliente_id;

    // Reagrupar y ORDENAR por fechas (desc)
    const equiposMap = {};

    for (const r of data) {
      if (!equiposMap[r.equipo_id]) {
        equiposMap[r.equipo_id] = {
          equipo_id: r.equipo_id,
          tipo: r.tipo,
          marca: r.marca,
          modelo: r.modelo,
          problema: r.problema,
          ingresos: {},      // map temporal para agrupar
          _maxFecha: null,   // para ordenar equipos por su ingreso más reciente
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
              nombre: r.estado_ingreso_nombre,
            },
            presupuestos: [],
          };
        }

        // trackear la fecha más reciente del equipo
        const fi = r.fecha_ingreso ? new Date(r.fecha_ingreso).getTime() : null;
        if (fi !== null) {
          if (
            equiposMap[r.equipo_id]._maxFecha === null ||
            fi > equiposMap[r.equipo_id]._maxFecha
          ) {
            equiposMap[r.equipo_id]._maxFecha = fi;
          }
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
              nombre: r.estado_presupuesto_nombre,
            },
          });
        }
      }
    }

    // Helpers de orden
    const ts = (d) => (d ? new Date(d).getTime() : -Infinity);

    // Convertir y ordenar
    const equipos = Object.values(equiposMap)
      .map((eq) => {
        // Ordenar presupuestos dentro de cada ingreso (desc por fecha)
        const ingresosOrdenados = Object.values(eq.ingresos)
          .map((ing) => ({
            ...ing,
            presupuestos: [...ing.presupuestos].sort(
              (a, b) => ts(b.fecha) - ts(a.fecha)
            ),
          }))
          // Orden de ingresos: más recientes primero
          .sort((a, b) => ts(b.fecha_ingreso) - ts(a.fecha_ingreso));

        return {
          equipo_id: eq.equipo_id,
          tipo: eq.tipo,
          marca: eq.marca,
          modelo: eq.modelo,
          problema: eq.problema,
          ingresos: ingresosOrdenados,
          _maxFecha: eq._maxFecha ?? -Infinity,
        };
      })
      // Orden de equipos: por el ingreso más reciente
      .sort((a, b) => (b._maxFecha - a._maxFecha));

    // Remover campo interno
    for (const e of equipos) delete e._maxFecha;

    return res.json({
      cliente_id: clienteId,
      equipos,
    });
  } catch (error) {
    console.error('Error en getHistorialEquipo (SQL):', error);
    return res
      .status(500)
      .json({ error: 'Error al obtener historial de los equipos del cliente' });
  }
};


export const getHistorialClienteByClienteId = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const id = Number(clienteId);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'clienteId inválido' });
    }

    // SQL equivalente al RPC, pero filtrando por cliente_id
    const SQL = `
      SELECT
        e.cliente_id,
        e.id AS equipo_id,
        e.tipo,
        e.marca,
        e.modelo,
        e.problema,
        i.id AS ingreso_id,
        i.fecha_ingreso,
        i.fecha_egreso,
        ei.id AS estado_ingreso_id,
        ei.nombre AS estado_ingreso_nombre,
        p.id AS presupuesto_id,
        p.fecha AS fecha_presupuesto,
        p.costo,
        p.total,
        p.observaciones,
        ep.id AS estado_presupuesto_id,
        ep.nombre AS estado_presupuesto_nombre
      FROM equipo e
      LEFT JOIN ingreso i     ON i.equipo_id = e.id
      LEFT JOIN estado  ei    ON i.estado_id = ei.id
      LEFT JOIN presupuesto p ON p.ingreso_id = i.id
      LEFT JOIN estado  ep    ON p.estado_id = ep.id
      WHERE e.cliente_id = $1
      ORDER BY e.id ASC,
               i.fecha_ingreso DESC NULLS LAST,
               p.fecha         DESC NULLS LAST;
    `;

    const { rows: data } = await pool.query(SQL, [id]);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No se encontraron equipos para este cliente.' });
    }

    const cliente_id = data[0].cliente_id;

    // === Reagrupado + ordenado (desc) para mantener mismo shape final ===
    const equiposMap = {};
    const ts = (d) => (d ? new Date(d).getTime() : -Infinity);

    for (const r of data) {
      if (!equiposMap[r.equipo_id]) {
        equiposMap[r.equipo_id] = {
          equipo_id: r.equipo_id,
          tipo: r.tipo,
          marca: r.marca,
          modelo: r.modelo,
          problema: r.problema,
          ingresos: {},
          _maxFecha: -Infinity, // para ordenar equipos por su ingreso más reciente
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
              nombre: r.estado_ingreso_nombre,
            },
            presupuestos: [],
          };
        }

        // trackear la fecha más reciente del equipo
        const fi = ts(r.fecha_ingreso);
        if (fi > equiposMap[r.equipo_id]._maxFecha) {
          equiposMap[r.equipo_id]._maxFecha = fi;
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
              nombre: r.estado_presupuesto_nombre,
            },
          });
        }
      }
    }

    // Ordenar niveles
    const equipos = Object.values(equiposMap)
      .map((eq) => {
        const ingresosOrdenados = Object.values(eq.ingresos)
          .map((ing) => ({
            ...ing,
            presupuestos: [...ing.presupuestos].sort((a, b) => ts(b.fecha) - ts(a.fecha)),
          }))
          .sort((a, b) => ts(b.fecha_ingreso) - ts(a.fecha_ingreso));

        return {
          equipo_id: eq.equipo_id,
          tipo: eq.tipo,
          marca: eq.marca,
          modelo: eq.modelo,
          problema: eq.problema,
          ingresos: ingresosOrdenados,
          _maxFecha: eq._maxFecha,
        };
      })
      .sort((a, b) => b._maxFecha - a._maxFecha)
      .map(({ _maxFecha, ...rest }) => rest); // limpiar campo interno

    return res.json({ cliente_id, equipos });
  } catch (error) {
    console.error('Error en getHistorialCliente (SQL):', error);
    return res
      .status(500)
      .json({ error: 'Error al obtener historial de los equipos del cliente' });
  }
};

