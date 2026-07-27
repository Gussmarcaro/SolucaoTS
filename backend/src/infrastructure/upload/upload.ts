import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { BusinessError } from '@/shared/errors';

/** Diretório onde os logotipos são gravados em disco. */
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
export const LOGOS_DIR = path.join(UPLOADS_DIR, 'logos');

if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });

const MIMES_PERMITIDOS = ['image/png', 'image/jpeg', 'image/jpg'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${randomUUID()}${ext}`);
  },
});

/** Middleware de upload do logotipo (campo "file"), aceitando apenas PNG/JPG até 2 MB. */
export const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!MIMES_PERMITIDOS.includes(file.mimetype)) {
      return cb(new BusinessError('Formato inválido. Envie uma imagem PNG ou JPG.'));
    }
    cb(null, true);
  },
}).single('file');

/** Constrói a URL pública a partir do nome do arquivo salvo. */
export function urlPublicaLogo(filename: string): string {
  return `/uploads/logos/${filename}`;
}
