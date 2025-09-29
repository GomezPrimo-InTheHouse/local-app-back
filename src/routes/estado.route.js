import { Router } from 'express';
const router = Router();
import {getEstados, createEstado, getEstadosById, deleteEstado, updateEstado, getEstadoByAmbito} from '../controllers/estado.controller.js';

//obtener estados

router.get('/', getEstados);
router.post('/create', createEstado);

router.get('/:ambito', getEstadoByAmbito); // obtener estados por ambito
router.get('/:id', getEstadosById); // obtener estado por id
router.delete('/:id', deleteEstado); //eliminar estado
router.put('/:id', updateEstado);  //modificar estado

export default router;