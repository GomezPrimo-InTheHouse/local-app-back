import  { pool }  from '../config/db.js';

// Obtener todos los clientes
export const getClientes = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cliente ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener cliente por ID
export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM cliente WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ msg: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crear nuevo cliente
export const createCliente = async (req, res) => {
  try {
    const { nombre, apellido, direccion, celular, celular_contacto } = req.body;
    const query = `
      INSERT INTO cliente (nombre, apellido, direccion, celular, celular_contacto)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *`;
    const values = [nombre, apellido, direccion, celular, celular_contacto];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar cliente
export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, direccion, celular, celular_contacto } = req.body;
    const query = `
      UPDATE cliente
      SET nombre=$1, apellido=$2, direccion=$3, celular=$4, celular_contacto=$5
      WHERE id=$6
      RETURNING *`;
    const values = [nombre, apellido, direccion, celular, celular_contacto, id];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ msg: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar cliente
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM cliente WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ msg: 'Cliente no encontrado' });
    res.json({ msg: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




// Exportar las funciones
export default {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente
};

