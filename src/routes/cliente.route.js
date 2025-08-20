import { Router } from 'express';
const router = Router();

import { getClientes, getClienteById, createCliente, updateCliente, deleteCliente } from '../controllers/cliente.controller.js';



// CRUD Clientes
router.get('/', getClientes);          // Listar todos
router.get('/:id', getClienteById);    // Obtener por ID
router.post('/', createCliente);       // Crear
router.put('/:id', updateCliente);     // Actualizar
router.delete('/:id', deleteCliente);  // Eliminar

export default router;
