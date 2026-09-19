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

/**
 * Upload do PDF do estatuto (campo "arquivo"), até 5 MB. Também fica em memória:
 * o buffer vai direto para o banco, porque o disco do Render é efêmero.
 */
export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname)) {
      return cb(new BusinessError('Envie um arquivo .pdf.'));
    }
    cb(null, true);
  },
}).single('arquivo');

/**
 * Upload do extrato OFX (campo "file"), até 10 MB, em memória.
 *
 * Limite maior que o do CSV porque extrato de conta movimentada, num ano
 * inteiro, passa de 5 MB — e recusá-lo mandaria o usuário fatiar o arquivo à
 * mão, que é justamente o trabalho que a importação existe para poupar.
 *
 * Sem conferência de MIME: o tipo que o navegador declara para .ofx varia
 * demais entre sistemas (`application/x-ofx`, `text/plain`, vazio), e recusar
 * pelo MIME barraria arquivo bom. Quem confere de verdade é o parser, que
 * responde "o arquivo é um extrato OFX?" quando não acha transação nenhuma.
 */
/**
 * Upload de anexo da despesa/pagamento (campo "arquivo"), até 5 MB.
 *
 * Aceita **PDF e imagem**, diferente do `uploadPdf`. Recibo e comprovante de
 * transferência chegam quase sempre como foto do celular ou print do
 * internet banking; exigir PDF obrigaria o usuário a converter o arquivo antes
 * de anexá-lo — trabalho que ele faria fora do sistema, ou não faria.
 */
export const uploadAnexo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'application/pdf' || /^image\/(jpeg|png|webp|heic|heif)$/i.test(file.mimetype);
    if (!ok) return cb(new BusinessError('Envie um PDF ou uma imagem (JPG, PNG).'));
    cb(null, true);
  },
}).single('arquivo');

export const uploadOfx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.(ofx|qfx)$/i.test(file.originalname)) {
      return cb(new BusinessError('Envie um arquivo .ofx.'));
    }
    cb(null, true);
  },
}).single('file');
