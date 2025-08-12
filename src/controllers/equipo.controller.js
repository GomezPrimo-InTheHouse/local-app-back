const { pool } = require ('../config/db.js');

// Obtener todos los equipos
 const getEquipos = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM equipo ORDER BY fecha_ingreso DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener equipo por ID
const getEquipoById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
          -- Equipo
          e.id AS equipo_id,
          e.tipo,
          e.marca,
          e.modelo,
          e.password,
          e.problema,
          e.fecha_ingreso,
          e.patron,

          -- Cliente
          c.id AS cliente_id,
          c.nombre AS cliente_nombre,
          c.apellido AS cliente_apellido,
          c.direccion AS cliente_direccion,
          c.celular AS cliente_celular,
          c.celular_contacto AS cliente_celular_contacto,

          -- Último ingreso
          i.id AS ingreso_id,
          i.fecha_ingreso,
          i.fecha_egreso,
          i.estado AS estado_ingreso,

          -- Último presupuesto
          p.id AS presupuesto_id,
          p.fecha AS fecha_presupuesto,
          p.costo AS costo_presupuesto,
          p.total AS total_presupuesto,
          p.observaciones AS observaciones_presupuesto

      FROM equipo e
      INNER JOIN cliente c ON e.cliente_id = c.id

      LEFT JOIN LATERAL (
          SELECT *
          FROM ingreso i
          WHERE i.equipo_id = e.id
          ORDER BY i.fecha_ingreso DESC
          LIMIT 1
      ) i ON true

      LEFT JOIN LATERAL (
          SELECT *
          FROM presupuesto p
          WHERE p.ingreso_id = i.id
          ORDER BY p.fecha DESC
          LIMIT 1
      ) p ON true

      WHERE e.id = $1
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Equipo no encontrado' });
    }

    const r = rows[0];

    const response = {
      equipo: {
        id: r.equipo_id,
        tipo: r.tipo,
        marca: r.marca,
        modelo: r.modelo,
        password: r.password,
        problema: r.problema,
        fecha_ingreso: r.fecha_ingreso,
        presupuesto: r.presupuesto,
        patron: r.patron
      },
      cliente: {
        id: r.cliente_id,
        nombre: r.cliente_nombre,
        apellido: r.cliente_apellido,
        direccion: r.cliente_direccion,
        celular: r.cliente_celular,
        celular_contacto: r.cliente_celular_contacto
      },
      detalles: {
        ingreso: r.ingreso_id
          ? {
              id: r.ingreso_id,
              fecha_ingreso: r.fecha_ingreso,
              fecha_egreso: r.fecha_egreso,
              estado: r.estado_ingreso
            }
          : null,
        presupuesto: r.presupuesto_id
          ? {
              id: r.presupuesto_id,
              fecha: r.fecha_presupuesto,
              costo: r.costo_presupuesto,
              total: r.total_presupuesto,
              observaciones: r.observaciones_presupuesto
            }
          : null
      }
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Crear equipo


const createEquipo = async (req, res) => {
  const client = await pool.connect();
  try {
    const { tipo, marca, modelo, password, problema, fecha_ingreso, patron, cliente_id } = req.body;

    // ✅ Validar datos mínimos obligatorios
    if (!tipo || !marca || !modelo || !cliente_id) {
      return res.status(400).json({ error: "Campos obligatorios: tipo, marca, modelo, cliente_id" });
    }

    await client.query('BEGIN');

    // 1️⃣ Crear equipo sin presupuesto
    const insertEquipoQuery = `
      INSERT INTO equipo (tipo, marca, modelo, password, problema, fecha_ingreso, patron, cliente_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;
    const equipoValues = [
      tipo,
      marca,
      modelo,
      password || null,
      problema || null,
      fecha_ingreso || new Date(),
      patron || null,
      cliente_id
    ];

    const { rows: equipoRows } = await client.query(insertEquipoQuery, equipoValues);
    const nuevoEquipo = equipoRows[0];

    // 2️⃣ Crear ingreso asociado automáticamente
    const insertIngresoQuery = `
      INSERT INTO ingreso (equipo_id, fecha_ingreso, fecha_egreso, estado)
      VALUES ($1, NOW(), NULL, 'Pendiente')
      RETURNING *;
    `;
    const { rows: ingresoRows } = await client.query(insertIngresoQuery, [nuevoEquipo.id]);
    const nuevoIngreso = ingresoRows[0];

    await client.query('COMMIT');

    // 3️⃣ Devolver la respuesta estructurada
    res.status(201).json({
      equipo: nuevoEquipo,
      ingreso: nuevoIngreso
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear equipo e ingreso:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};


//obtener todos los equipos pertenecientes a un cliente por su cliente_id

const obtenerEquiposbyClientId = async (req, res) =>{
  const { cliente_id } = req.params;

  try {
    const query = `
      SELECT * FROM equipo
      WHERE cliente_id = $1
      ORDER BY fecha_ingreso DESC
    `;
    const { rows } = await pool.query(query, [cliente_id]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron equipos para este cliente' });
    }

    res.status(200).json(rows);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}




// Actualizar equipo
 const updateEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, marca, modelo, password, problema, fecha_ingreso, patron, cliente_id } = req.body;
    
    const query = `
      UPDATE equipo
      SET tipo=$1, marca=$2, modelo=$3, password=$4, problema=$5, fecha_ingreso=$6, patron=$7, cliente_id=$8
      WHERE id=$9 RETURNING *`;
    const values = [tipo, marca, modelo, password, problema, fecha_ingreso, patron, cliente_id, id];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ msg: 'Equipo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar equipo
 const deleteEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM equipo WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ msg: 'Equipo no encontrado' });
    res.json({ msg: 'Equipo eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//FILTROS



// 1) Filtrar por tipo exacto
const getEquiposByTipo = async (req, res) => {
  const { tipo } = req.params;

  try {
    const query = `
      SELECT * FROM equipo
      WHERE LOWER(tipo) = LOWER($1)
      ORDER BY fecha_ingreso DESC
    `;
    const { rows } = await pool.query(query, [tipo]);

    res.json({
      status: 'success',
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error al filtrar equipos por tipo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 2) Filtrar múltiples tipos (ej: /equipo/filtrar?tipos=celular,notebook)
const getEquiposFiltrados = async (req, res) => {
  const { tipos } = req.query;

  if (!tipos) {
    return res.status(400).json({ error: 'Debes enviar el parámetro ?tipos=...' });
  }

  // Convertimos a array y normalizamos
  const tiposArray = tipos.split(',').map(t => t.trim().toLowerCase());

  try {
    const query = `
      SELECT * FROM equipo
      WHERE LOWER(tipo) = ANY($1::text[])
      ORDER BY fecha_ingreso DESC
    `;
    const { rows } = await pool.query(query, [tiposArray]);

    res.json({
      status: 'success',
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error al filtrar múltiples tipos de equipos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


const getEquiposByCliente = async (req, res) => {
  const { cliente_id } = req.params;

  try {
    const query = `
      SELECT e.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
      FROM equipo e
      INNER JOIN cliente c ON e.cliente_id = c.id
      WHERE e.cliente_id = $1
      ORDER BY e.fecha_ingreso DESC
    `;
    const { rows } = await pool.query(query, [cliente_id]);

    if (rows.length === 0) {
      return res.status(201).json({ 
        success: true,
        message: 'No se encontraron equipos para este cliente.' 
      });
    }

    res.json({
      status: 'success',
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error al buscar equipos por cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todos los equipos con último ingreso y presupuesto

const getEquiposConDetalle = async (_req, res) => {
  try {
    const query = `
      SELECT 
          e.id AS equipo_id,
          e.tipo,
          e.marca,
          e.modelo,
          e.problema,
          e.patron,
          e.cliente_id,
          
          i.id AS ingreso_id,
          i.fecha_ingreso,
          i.fecha_egreso,
          i.estado AS estado_ingreso,
          
          p.id AS presupuesto_id,
          p.costo AS costo_presupuesto,
          p.total AS total_presupuesto,
          p.estado AS estado_presupuesto,
          p.fecha AS fecha_presupuesto,
          p.observaciones AS observaciones_presupuesto

      FROM equipo e
      LEFT JOIN LATERAL (
          SELECT *
          FROM ingreso i
          WHERE i.equipo_id = e.id
          ORDER BY i.fecha_ingreso DESC
          LIMIT 1
      ) i ON true
      LEFT JOIN LATERAL (
          SELECT *
          FROM presupuesto p
          WHERE p.ingreso_id = i.id
          ORDER BY p.fecha DESC
          LIMIT 1
      ) p ON true
      ORDER BY e.id;
    `;

    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Exportar las funciones para ser utilizadas en las rutas
module.exports = {
    getEquipos,
    getEquipoById,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    getEquiposByTipo,
    getEquiposFiltrados,
    getEquiposByCliente,
    getEquiposConDetalle
};

