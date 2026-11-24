import { Router } from 'express';
const router = Router();
import {getEstados, createEstado, getEstadosById, deleteEstado, updateEstado, getEstadoByAmbito} from '../controllers/estado.controller.js';

// Solo deja pasar IDs numéricos; cualquier otro valor sigue a la siguiente ruta (ej: /:ambito)
const soloIdNumerico = (req, res, next) =>
  /^\d+$/.test(req.params.id) ? next() : next('route');

//obtener estados

router.get('/', getEstados);
router.post('/create', createEstado);

router.get('/:id', soloIdNumerico, getEstadosById); // obtener estado por id (ej: /estado/5)
router.get('/:ambito', getEstadoByAmbito);          // obtener estados por ambito (ej: /estado/presupuesto)
router.delete('/:id', deleteEstado); //eliminar estado
router.put('/:id', updateEstado);  //modificar estado

export default router;
