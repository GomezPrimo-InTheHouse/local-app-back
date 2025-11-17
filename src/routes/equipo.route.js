import { Router } from 'express';
const router = Router();

import { getEquipos, getEquipoById, 
    createEquipo, updateEquipo, 
    deleteEquipo, getEquiposByTipo, getEquiposFiltrados, 
    getEquiposByCliente, getEquiposConDetalle, getEquipoByMarcaModeloDni, checkEquipoRoute } from '../controllers/equipo.controller.js';


router.get('/', getEquipos);
router.post('/', createEquipo);
router.get('/detalle', getEquiposConDetalle);
router.get('/filtrar', getEquiposFiltrados);
router.get('/check', checkEquipoRoute);

router.get('/marca-modelo-dni', getEquipoByMarcaModeloDni); // obtener equipo por marca, modelo y dni

router.get('/:id', getEquipoById);
router.put('/:id', updateEquipo);
router.delete('/:id', deleteEquipo);

router.get('/tipo/:tipo', getEquiposByTipo);
//buscar equipos por cliente
router.get('/cliente/:cliente_id', getEquiposByCliente);


export default router;
