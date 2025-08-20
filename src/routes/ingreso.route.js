// src/routes/ingreso.route.js
import { Router } from 'express';
const router = Router();
// import { validateIngreso } from '../middlewares/validateIngreso';
import { createIngreso, getIngresos, getIngresosByEquipo, updateIngreso, deleteIngreso } from '../controllers/ingreso.controller.js';

router.get('/', getIngresos);  //obtener los todos los ingresos
router.get('/equipo/:equipoId', getIngresosByEquipo); //obtener ingresos por equipo
router.post('/', createIngreso); //crear un nuevo ingreso validando que exista el cliente y el equipo
router.put('/:id', updateIngreso); //actualizar un ingreso
router.delete('/:id', deleteIngreso); //eliminar un ingreso

export default router;
