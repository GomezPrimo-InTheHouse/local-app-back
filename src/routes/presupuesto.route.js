import { Router } from 'express';
const router = Router();
// import validatePresupuesto from '../middlewares/validatePresupuesto.js';
import { getPresupuestos, createPresupuesto, updatePresupuesto, 
  deletePresupuesto, getPresupuestosByIngreso,
   getPresupuestosByEquipo, getBalancePresupuestos, 
   aprobarPresupuesto,
   savePresupuestoDetalles,
  getPresupuestoWithDetalles, } from '../controllers/presupuesto.controller.js';

// Rutas 
router.get('/', getPresupuestos); // Obtener todos los presupuestos
router.post('/', createPresupuesto); // Crear un nuevo presupuesto con validación de existencia equipo
router.get('/balance', getBalancePresupuestos); // Obtener balance de presupuestos
router.post("/:id/aprobar-venta", aprobarPresupuesto); // Aprobar un presupuesto
router.get('/:equipoId', getPresupuestosByEquipo); // Obtener presupuestos por equipo
router.put('/:id', updatePresupuesto); // Actualizar un presupuesto
router.delete('/:id', deletePresupuesto); // Eliminar un presupuesto
router.get('/ingreso/:ingresoId', getPresupuestosByIngreso); // Obtener presupuestos por ingreso
// 🔹 NUEVO: Guardar / reemplazar detalles de un presupuesto
router.post("/:id/detalles", savePresupuestoDetalles);

// 🔹 NUEVO: Obtener presupuesto + detalles (para edición completa)
router.get("/:id/with-detalles", getPresupuestoWithDetalles);

export default router;
