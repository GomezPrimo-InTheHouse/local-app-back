const express = require('express');
const router = express.Router();

const {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente
} = require ('../controllers/cliente.controller.js');



// CRUD Clientes
router.get('/', getClientes);          // Listar todos
router.get('/:id', getClienteById);    // Obtener por ID
router.post('/', createCliente);       // Crear
router.put('/:id', updateCliente);     // Actualizar
router.delete('/:id', deleteCliente);  // Eliminar

module.exports = router;
