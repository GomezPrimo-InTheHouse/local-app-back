// src/routes/auth/empleado.route.js — gestión de empleados (montado detrás de soloAdmin)
import { Router } from 'express';
import {
  listarEmpleados,
  crearEmpleado,
  actualizarEmpleado,
  resetPasswordEmpleado,
  resetTotpEmpleado,
  bajaEmpleado,
  reactivarEmpleado,
} from '../../controllers/auth/empleado.controller.js';

const router = Router();

router.get('/', listarEmpleados);
router.post('/', crearEmpleado);
router.put('/:id', actualizarEmpleado);
router.post('/:id/reset-password', resetPasswordEmpleado);
router.post('/:id/reset-totp', resetTotpEmpleado);
router.post('/:id/baja', bajaEmpleado);
router.post('/:id/reactivar', reactivarEmpleado);

export default router;
