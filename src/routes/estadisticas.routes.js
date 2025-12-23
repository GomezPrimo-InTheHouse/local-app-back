import { Router } from 'express';
import { 
  getTrabajosDelMes,
  getClientesFrecuentes,
  getReparacionesComunes,
  getEquiposComunes,
  getEstadisticasPorMes,
  getResumenCuentaClienteByID,
  getResumenVentasPorMes,
  resumenPorPeriodo,
  getResumenVentasPorPeriodo,
  getEstadisticasHistoricas
  
} from '../controllers/estadisticas.controller.js';

const router = Router();

router.get('/trabajos-mes', getTrabajosDelMes);
router.get('/clientes-frecuentes', getClientesFrecuentes);
router.get('/reparaciones-comunes', getReparacionesComunes);
router.get('/equipos-comunes', getEquiposComunes);
router.get('/resumen-mes', getEstadisticasPorMes);

router.get('/resumen-ventas-mes', getResumenVentasPorMes);
router.get('/resumen-ventas-periodo', getResumenVentasPorPeriodo);
router.post('/resumen-por-periodo', resumenPorPeriodo);
router.get('/estadisticas-historicas', getEstadisticasHistoricas);
router.get('/resumen-cuenta-cliente/:clienteId', getResumenCuentaClienteByID);


export default router;
