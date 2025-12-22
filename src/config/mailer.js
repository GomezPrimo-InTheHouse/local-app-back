// src/utils/mailerResend.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const mailer = async ({
  venta_id,
  total_final,
  cliente_id,
  cantidad_items,
}) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  return resend.emails.send({
    from: process.env.MAIL_FROM,
    to: [process.env.MAIL_TO || "juliangomezprimo@gmail.com"],
    subject: `🧾 Venta web creada #${venta_id}`,
    html: `
      <h2>Venta web creada</h2>
      <p><b>Venta ID:</b> ${venta_id}</p>
      <p><b>Cliente ID:</b> ${cliente_id}</p>
      <p><b>Items:</b> ${cantidad_items}</p>
      <h3>Total: $${total_final}</h3>
    `,
  });
};
export default mailer;