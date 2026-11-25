// import { Router } from 'express';
// import { 
//     getHistorialCliente,
//     getHistorialClienteByClienteId
//  } from '../controllers/historial.controller.js';

// const router = Router();

// router.get('/equipo/:equipoId', getHistorialCliente);
// router.get('/cliente/:clienteId', getHistorialClienteByClienteId);

// export default router;


import { Router } from 'express';
import {
    getHistorialCliente,
    getHistorialClienteByClienteId,
    getResumenBalanceClientes,
    getVentasCliente,
 } from '../controllers/historial.controller.js';
import { soloAdmin } from '../middlewares/auth/permisos.js';

const router = Router();

router.get('/resumen-clientes', soloAdmin, getResumenBalanceClientes); // solo admin: balances
router.get('/equipo/:equipoId', getHistorialCliente);
router.get('/cliente/:clienteId/ventas', getVentasCliente);
router.get('/cliente/:clienteId', getHistorialClienteByClienteId);

export default router;