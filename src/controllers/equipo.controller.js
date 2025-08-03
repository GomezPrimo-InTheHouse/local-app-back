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
    const { rows } = await pool.query('SELECT * FROM equipo WHERE id = $1 ', [id]);
    if (rows.length === 0) return res.status(404).json({ msg: 'Equipo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crear equipo
 const createEquipo = async (req, res) => {
  try {
    const { tipo, marca, modelo, password, problema, fecha_ingreso, presupuesto, patron, cliente_id } = req.body;
    const presupuestoValue = presupuesto ?? 0;
    const query = `
      INSERT INTO equipo (tipo, marca, modelo, password, problema, fecha_ingreso, presupuesto, patron, cliente_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`;
    const values = [tipo, marca, modelo, password, problema, fecha_ingreso, presupuestoValue, patron, cliente_id];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar equipo
 const updateEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, marca, modelo, password, problema, fecha_ingreso, presupuesto, patron, cliente_id } = req.body;
    const presupuestoValue = presupuesto ?? 0;
    const query = `
      UPDATE equipo
      SET tipo=$1, marca=$2, modelo=$3, password=$4, problema=$5, fecha_ingreso=$6, presupuesto=$7, patron=$8, cliente_id=$9
      WHERE id=$10 RETURNING *`;
    const values = [tipo, marca, modelo, password, problema, fecha_ingreso, presupuestoValue, patron, cliente_id, id];
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


// Exportar las funciones para ser utilizadas en las rutas
module.exports = {
    getEquipos,
    getEquipoById,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    getEquiposByTipo,
    getEquiposFiltrados,
    getEquiposByCliente
};

