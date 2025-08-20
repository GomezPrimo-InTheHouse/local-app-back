import { Router } from 'express';
const router = Router();

import { getEquipos, getEquipoById, createEquipo, updateEquipo, deleteEquipo, getEquiposByTipo, getEquiposFiltrados, getEquiposByCliente, getEquiposConDetalle } from '../controllers/equipo.controller.js';


router.get('/', getEquipos);
router.post('/', createEquipo);
router.get('/detalle', getEquiposConDetalle);

router.get('/:id', getEquipoById);
router.put('/:id', updateEquipo);
router.delete('/:id', deleteEquipo);

router.get('/tipo/:tipo', getEquiposByTipo);
router.get('/filtrar', getEquiposFiltrados);

//buscar equipos por cliente
router.get('/cliente/:cliente_id', getEquiposByCliente);


export default router;
