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

const router = Router();

router.get('/resumen-clientes', getResumenBalanceClientes);
router.get('/equipo/:equipoId', getHistorialCliente);
router.get('/cliente/:clienteId/ventas', getVentasCliente);
router.get('/cliente/:clienteId', getHistorialClienteByClienteId);

export default router;