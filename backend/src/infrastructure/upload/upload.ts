import multer from 'multer';
import { BusinessError } from '@/shared/errors';

/**
 * Upload de CSV em memória (campo "file"), até 5 MB. O arquivo NÃO é persistido;
 * o buffer fica em `req.file.buffer` para ser decodificado (Latin-1) e parseado.
 */
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.csv$/i.test(file.originalname)) {
      return cb(new BusinessError('Envie um arquivo .csv.'));
    }
    cb(null, true);
  },
}).single('file');
