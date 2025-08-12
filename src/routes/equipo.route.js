express = require('express');
const router = express.Router();

const {
  getEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  getEquiposByTipo,
  getEquiposFiltrados,
  getEquiposByCliente,
  getEquiposConDetalle
} = require( '../controllers/equipo.controller.js');


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


module.exports = router;
