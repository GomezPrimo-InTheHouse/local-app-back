const { pool } = require ('../config/db.js');

// Obtener todos los equipos
 const getEquipos = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM equipo');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener equipo por ID
 const getEquipoById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM equipo WHERE id = $1', [id]);
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
    const query = `
      INSERT INTO equipo (tipo, marca, modelo, password, problema, fecha_ingreso, presupuesto, patron, cliente_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`;
    const values = [tipo, marca, modelo, password, problema, fecha_ingreso, presupuesto, patron, cliente_id];
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
    const query = `
      UPDATE equipo
      SET tipo=$1, marca=$2, modelo=$3, password=$4, problema=$5, fecha_ingreso=$6, presupuesto=$7, patron=$8, cliente_id=$9
      WHERE id=$10 RETURNING *`;
    const values = [tipo, marca, modelo, password, problema, fecha_ingreso, presupuesto, patron, cliente_id, id];
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


// Exportar las funciones para ser utilizadas en las rutas
module.exports = {
    getEquipos,
    getEquipoById,
    createEquipo,
    updateEquipo,
    deleteEquipo
};

