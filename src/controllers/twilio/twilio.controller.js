// controllers/twilio/twilio.controller.js

import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export  const enviarMensaje = async (req, res) => {
const { numero, cliente, equipo } = req.body;
  console.log('Datos recibidos:', { numero, cliente, equipo });
  try {
    const mensaje = await client.messages.create({
      from: 'whatsapp:+14155238886', // sandbox Twilio
      to: `whatsapp:${numero}`,
      body: `Hola ${cliente.nombre} ${cliente.apellido}, gracias por elegir JG Informática. 
      Hemos cargado correctamente su equipo: ${equipo} para su reparación.
      Adjunto nuestras condiciones del servicio técnico: 
      1. Garantía: Ofrecemos garantía en las reparaciones realizadas.
      2. Privacidad: Respetamos la confidencialidad de los datos en su equipo.
      3. Plazos: Nos esforzamos por cumplir con los tiempos acordados para la entrega.
      4. Retiro: El equipo debe ser retirado en el plazo máximo de 60 días tras la reparación o si se el presupuesto es rechazado, caso contrario queda en estado 'abandonado'.
      
      5. Info: Bolivar 1313 - Villa María - Atención de Lunes a Sábados (consultar horarios).
      `
          });

    res.status(200).json({ success: true, sid: mensaje.sid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

