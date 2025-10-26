// import { spawn } from 'child_process';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import dns from 'dns';
// dns.setDefaultResultOrder('ipv4first');

// // Reemplazo de __dirname
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);


// // Microservicios
// const services = [
//   { name: 'ms-general.js', port: 7001 },
//   {name: 'ms-twilio.js', port: 7002 }
// ];

// services.forEach(service => {
//   const servicePath = path.join(__dirname, 'microservices', service.name);

//   const child = spawn('node', [servicePath], {
//     env: { ...process.env, PORT: service.port },
//     stdio: 'inherit',
//     shell: true // recomendable para Windows/macOS
//   });

//   child.on('close', code => {
//     console.log(`✅ ${service.name} finalizó con código ${code}`);
//   });

//   child.on('error', err => {
//     console.error(`❌ Error al iniciar ${service.name}:`, err);
//   });
// });

// src/app.js
// src/app.js
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Preferir IPv4 también en el proceso padre (extra, además del NODE_OPTIONS)
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Microservicios a levantar como procesos hijos
const services = [
  { name: 'ms-general.js', port: 7001 },
  { name: 'ms-twilio.js',  port: 7002 },
];

services.forEach(service => {
  const servicePath = path.join(__dirname, 'microservices', service.name);

  const child = spawn('node', [servicePath], {
    env: {
      ...process.env,
      PORT: service.port,
      // Asegura que cada hijo también reciba la preferencia por IPv4
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --dns-result-order=ipv4first`,
    },
    stdio: 'inherit',
    shell: true, // práctico en macOS/Windows
  });

  child.on('close', code => {
    console.log(`✅ ${service.name} finalizó con código ${code}`);
  });

  child.on('error', err => {
    console.error(`❌ Error al iniciar ${service.name}:`, err);
  });
});
