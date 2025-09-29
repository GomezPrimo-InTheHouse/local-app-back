import express, { json } from 'express';
import cors from 'cors';
//import dotenv
import dotenv from 'dotenv';
dotenv.config();

import morgan from 'morgan';
//importar rutas de cliente
import ClienteRoute  from '../routes/cliente.route.js';
import EquipoRoute from '../routes/equipo.route.js';
import PresupuestoRoute from '../routes/presupuesto.route.js';
import IngresoRoute from '../routes/ingreso.route.js';
import AuthRoute from '../routes/auth/auth.routes.js';
import EstadoRoute from '../routes/estado.route.js';
import HistorialRoute from '../routes/historial.route.js';
import EstadisticasRoute from '../routes/estadisticas.routes.js';
import ProductoRoute from '../routes/producto.route.js';
import VentaRoute from '../routes/venta.route.js';
const app = express();
app.use(cors());
const PORT = process.env.PORT || 7001

app.use(morgan('dev'));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Microservicio gral`);
  next();
});

app.use(json());


app.use('/equipo', EquipoRoute);
app.use('/cliente', ClienteRoute);
app.use('/presupuesto', PresupuestoRoute);
app.use('/ingreso', IngresoRoute);
app.use('/auth', AuthRoute);
app.use('/estado', EstadoRoute);
app.use('/historial', HistorialRoute);  // /historial/equipo/:equipoId
app.use('/estadisticas', EstadisticasRoute); // /estadisticas/...
app.use('/producto', ProductoRoute); // /producto/...
app.use('/venta', VentaRoute); // /venta/...

// coma antes del req --> '_req', buena practica para evitar errores de linting si no se usa el parámetro 
app.get('/health', (_req, res) => {
  res.json({
    service: 'Microservicio gral',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Microservicio gral corriendo en http://localhost:${PORT}`);
});