// src/config/mailer.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.RESEND_API_KEY) {
  console.warn("⚠️ RESEND_API_KEY no está definido en .env");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export default resend;
