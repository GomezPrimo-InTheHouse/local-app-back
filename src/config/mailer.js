import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true para 465, false para 587
  auth: {
    user: process.env.SMTP_USER, // tu correo (o usuario SMTP)
    pass: process.env.SMTP_PASS, // contraseña de app (en Gmail) o pass SMTP
  },
});

// opcional: verificar conexión al iniciar
transporter.verify((err, success) => {
  if (err) {
    console.error("Error verificando transporter de nodemailer:", err);
  } else {
    console.log("📧 Nodemailer listo para enviar correos");
  }
});

export default transporter;
