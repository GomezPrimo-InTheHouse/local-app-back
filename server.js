const express = require('express');
const cors = require('cors');



// Habilitar CORS para todas las rutas

require('dotenv').config();
const app = express();
app.use(cors());
const PORT = process.env.PORT || 6000;





// Middleware
app.use(express.json());

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor API corriendo en http://localhost:${PORT}`);
  //llamo a la functon de auto refresh unos minutos antes de que expire el token
   
});