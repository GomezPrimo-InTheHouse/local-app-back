import { Router } from 'express';
const router = Router();
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });
import { getClientes, getClienteById, createCliente, updateCliente, deleteCliente } from '../controllers/cliente.controller.js';



// CRUD Clientes
router.get('/', getClientes);          // Listar todos
router.get('/:id', getClienteById);    // Obtener por ID
router.post('/', upload.single("foto"), createCliente);       // Crear
router.put('/:id', upload.single("foto"),  updateCliente);     // Actualizar
router.delete('/:id', deleteCliente);  // Eliminar

export default router;
