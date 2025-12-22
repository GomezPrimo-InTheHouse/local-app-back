import { Resend } from "resend";

export default async function mailer({
  venta,
  detalles = [],
  cliente,
  resumen,
  meta,
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const from =
    process.env.MAIL_FROM?.trim() ||
    "JG Informática <onboarding@resend.dev>";

  const to =
    process.env.MAIL_TO?.trim() ||
    "juliangomezprimo@gmail.com";

  const htmlDetalles = detalles.length
    ? `
      <ul>
        ${detalles
          .map(
            (d) => `
              <li>
                Producto #${d.producto_id} — 
                Cantidad: ${d.cantidad} — 
                $${d.precio_unitario}
              </li>
            `
          )
          .join("")}
      </ul>
    `
    : "<p>Sin detalles</p>";

  return resend.emails.send({
    from,
    to: [to],
    subject: `🧾 Venta web creada #${venta?.id ?? "N/A"}`,
    html: `
      <h2>Venta web creada</h2>

      <h3>Datos de la venta</h3>
      <p><b>ID:</b> ${venta?.id}</p>
      
      <p><b>Fecha:</b> ${venta?.fecha}</p>
      <p><b>Canal:</b> ${venta?.canal}</p>
      <p><b>Monto abonado:</b> $${venta?.monto_abonado}</p>
      <p><b>Saldo:</b> $${venta?.saldo}</p>

      <h3>Cliente</h3>
      <p>
        ${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}<br/>
        DNI: ${cliente?.dni ?? "-"}<br/>
        Email: ${cliente?.email ?? "-"}<br/>
        Tel: ${cliente?.celular ?? "-"}
      </p>

      <h3>Productos</h3>
      ${htmlDetalles}

      <h3>Resumen</h3>
      <p>Total bruto: $${resumen?.total_bruto}</p>
      <p>Descuento: $${resumen?.descuento}</p>
      <p><b>Total final: $${resumen?.total_final}</b></p>

      <hr/>
      <small>
        Items: ${meta?.cantidad_items} |
        Venta ID: ${meta?.venta_id}
      </small>
    `,
  });
}
