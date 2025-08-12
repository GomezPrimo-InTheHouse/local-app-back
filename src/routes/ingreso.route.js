// src/routes/ingreso.route.js
const express = require('express');
const router = express.Router();
const validateIngreso = require('../middlewares/validateIngreso');
const {
  createIngreso,
  getIngresos,
  getIngresosByEquipo,
  updateIngreso,
  deleteIngreso
} = require('../controllers/ingreso.controller');

router.get('/', getIngresos);  //obtener los todos los ingresos
router.get('/equipo/:equipoId', getIngresosByEquipo); //obtener ingresos por equipo
router.post('/', validateIngreso, createIngreso); //crear un nuevo ingreso validando que exista el cliente y el equipo
router.put('/:id', updateIngreso); //actualizar un ingreso
router.delete('/:id', deleteIngreso); //eliminar un ingreso

module.exports = router;
