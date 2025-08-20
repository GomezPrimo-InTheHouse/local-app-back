import { Router } from 'express';
const router = Router();
// import validatePresupuesto from '../middlewares/validatePresupuesto.js';
import { getPresupuestos, createPresupuesto, updatePresupuesto, 
  deletePresupuesto, getPresupuestosByIngreso, getPresupuestosByEquipo } from '../controllers/presupuesto.controller.js';

// Rutas 
router.get('/', getPresupuestos); // Obtener todos los presupuestos
router.post('/', createPresupuesto); // Crear un nuevo presupuesto con validación de existencia equipo
router.get('/:equipoId', getPresupuestosByEquipo); // Obtener presupuestos por equipo
router.put('/:id', updatePresupuesto); // Actualizar un presupuesto
router.delete('/:id', deletePresupuesto); // Eliminar un presupuesto
router.get('/ingreso/:ingresoId', getPresupuestosByIngreso); // Obtener presupuestos por ingreso

export default router;
