const express = require('express');
const router = express.Router();
const validatePresupuesto = require('../middlewares/validatePresupuesto.js');
const {
  getPresupuestos,
  createPresupuesto,
  updatePresupuesto,
  deletePresupuesto
} = require('../controllers/presupuesto.controller');

// Rutas CRUD
router.get('/', getPresupuestos);
router.post('/', validatePresupuesto, createPresupuesto);
router.put('/:id', updatePresupuesto);
router.delete('/:id', deletePresupuesto);

module.exports = router;
