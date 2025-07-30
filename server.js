const express = require('express');

require('dotenv').config();




const app = express();
const PORT = process.env.PORT || 6000;





// Middleware
app.use(express.json());

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor API corriendo en http://localhost:${PORT}`);
  //llamo a la functon de auto refresh unos minutos antes de que expire el token
   
});