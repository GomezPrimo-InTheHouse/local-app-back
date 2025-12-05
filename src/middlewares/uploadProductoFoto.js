// // src/middlewares/uploadProductoFoto.js
// const multer = require('multer');

// const storage = multer.memoryStorage();

// const uploadProductoFoto = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
// });

// module.exports = uploadProductoFoto;

// middlewares/uploadProductoFoto.js
import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadProductoFoto = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export default uploadProductoFoto;