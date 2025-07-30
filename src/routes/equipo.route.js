express = require('express');
const router = express.Router();

const {
  getEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  deleteEquipo
} = require( '../controllers/equipo.controller.js');


router.get('/', getEquipos);
router.get('/:id', getEquipoById);
router.post('/', createEquipo);
router.put('/:id', updateEquipo);
router.delete('/:id', deleteEquipo);

module.exports = router;
