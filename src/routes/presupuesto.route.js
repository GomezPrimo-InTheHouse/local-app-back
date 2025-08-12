const express = require('express');
const router = express.Router();
const validatePresupuesto = require('../middlewares/validatePresupuesto.js');
const {
  getPresupuestos,
  createPresupuesto,
  updatePresupuesto,
  deletePresupuesto,
  getPresupuestosByIngreso,
  getPresupuestosByEquipo
} = require('../controllers/presupuesto.controller');

// Rutas 
router.get('/', getPresupuestos); // Obtener todos los presupuestos
router.post('/', createPresupuesto); // Crear un nuevo presupuesto con validación de existencia equipo
router.get('/:equipoId', getPresupuestosByEquipo); // Obtener presupuestos por equipo
router.put('/:id', updatePresupuesto); // Actualizar un presupuesto
router.delete('/:id', deletePresupuesto); // Eliminar un presupuesto
router.get('/ingreso/:ingresoId', getPresupuestosByIngreso); // Obtener presupuestos por ingreso

module.exports = router;
