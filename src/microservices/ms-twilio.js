import express, { json } from 'express';
import cors from 'cors';
//import dotenv
import dotenv from 'dotenv';
dotenv.config();

import morgan from 'morgan';

//importar rutas de cliente
import TwilioRoute  from '../routes/twilio/twilio.route.js';

const app = express();
app.use(cors());
const PORT = process.env.MS2PORT || 7002

app.use(morgan('dev'));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Microservicio twilio`);
  next();
});

app.use(json());


app.use('/twilio', TwilioRoute);


// coma antes del req --> '_req', buena practica para evitar errores de linting si no se usa el parámetro 
app.get('/health', (_req, res) => {
  res.json({
    service: 'Microservicio twilio',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Microservicio twilio corriendo en http://localhost:${PORT}`);
});