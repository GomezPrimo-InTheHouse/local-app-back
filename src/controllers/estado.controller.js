import { pool } from '../config/db.js';

export const getEstados = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM estado');
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo estados:", error);
    res.status(500).json({ error: "Error obteniendo estados" });
  }
};

//crear estado nuevo
export const createEstado = async (req, res) => {
  const { nombre, descripcion, ambito } = req.body;

  if(!nombre || !descripcion || !ambito) {
    return res.status(400).json({ error: "Nombre y descripcion son requeridos" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO estado (nombre, descripcion, ambito) VALUES ($1, $2, $3) RETURNING *`,
      [nombre, descripcion, ambito]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creando estado:", error);
    res.status(500).json({ error: "Error creando estado" });
  }
};

export const getEstadosById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM estado WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Estado no encontrado" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error obteniendo estado por ID:", error);
    res.status(500).json({ error: "Error obteniendo estado por ID" });
  }
};

export const deleteEstado = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM estado WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Estado no encontrado" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error eliminando estado:", error);
    res.status(500).json({ error: "Error eliminando estado" });
  }
};

export const updateEstado = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, ambito } = req.body;

  try {
    const { rowCount } = await pool.query(
      `UPDATE estado SET 
        nombre = COALESCE($1, nombre), 
        descripcion = COALESCE($2, descripcion), 
        ambito = COALESCE($3, ambito)
      WHERE id = $4`,
      [nombre, descripcion, ambito, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Estado no encontrado" });
    }

    res.status(200).json({ message: "Estado actualizado correctamente" });
  } catch (error) {
    console.error("Error actualizando estado:", error);
    res.status(500).json({ error: "Error actualizando estado" });
  }
};

export const getEstadoByAmbito = async (req, res) => {
  const { ambito } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM estado WHERE ambito = $1', [ambito]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "No se encontraron estados para el ámbito especificado" });
    }
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo estados por ámbito:", error);
    res.status(500).json({ error: "Error obteniendo estados por ámbito" });
  }
}

export default {
  getEstados,
  createEstado,
  getEstadosById,
  deleteEstado,
  updateEstado,
  getEstadoByAmbito
};
  
