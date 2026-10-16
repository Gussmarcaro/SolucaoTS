import type { RequestHandler } from 'express';
import multer from 'multer';
import { BusinessError } from '@/shared/errors';
import { comContexto } from '@/shared/contexto';

/**
 * Devolve a requisição ao contexto depois do upload.
 *
 * ## O defeito que isto conserta
 *
 * O `AsyncLocalStorage` aberto por `autenticar` **não sobrevive ao multer**, e
 * a razão está no Node, não aqui: o corpo multipart é lido do socket, e os
 * eventos que entregam esses pedaços nascem no contexto da **conexão** — que é
 * anterior a qualquer `run` nosso. Tudo que vem depois do upload continua,
 * portanto, fora do contexto: `tenantAtual()` devolve nulo numa requisição que
 * tem órgão, usuário e token perfeitamente válidos.
 *
 * O sintoma foi a importação de OFX respondendo **500**: `tenantObrigatorio`
 * recusava gravar `LancamentoExtrato` "sem órgão no contexto", enquanto a
 * própria linha de log da requisição trazia o órgão — porque aquela lê de
 * `req.usuario`, e não do contexto.
 *
 * ## Por que o conserto fica aqui, e não na rota
 *
 * Envolver cada rota de upload é confiar em que ninguém esqueça na próxima. É
 * o mesmo argumento das extensions de auditoria e de tenant: a regra vale para
 * **todo** caminho que use upload, inclusive o que for escrito amanhã.
 *
 * A reentrada usa o contexto que `autenticar` guardou em `req.contexto` — o
 * mesmo objeto, não uma cópia remontada aqui, que poderia divergir dele.
 *
 * Isto também devolve o carimbo de autoria: sem contexto, a extension de
 * auditoria gravava anexo sem `criadoPor`, calada.
 */
function devolverAoContexto(middleware: RequestHandler): RequestHandler {
  return (req, res, next) =>
    middleware(req, res, (erro?: unknown) => {
      // Erro do multer (tipo recusado, tamanho estourado) segue direto: ele
      // vai ao errorHandler, que não depende do contexto.
      if (erro) return next(erro);
      const ctx = req.contexto;
      if (!ctx) return next();
      comContexto(ctx, () => next());
    });
}

/**
 * Upload de CSV em memória (campo "file"), até 5 MB. O arquivo NÃO é persistido;
 * o buffer fica em `req.file.buffer` para ser decodificado (Latin-1) e parseado.
 */
export const uploadCsv = devolverAoContexto(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!/\.csv$/i.test(file.originalname)) {
        return cb(new BusinessError('Envie um arquivo .csv.'));
      }
      cb(null, true);
    },
  }).single('file'),
);

/**
 * Upload do PDF do estatuto (campo "arquivo"), até 5 MB. Também fica em memória:
 * o buffer vai direto para o banco, porque o disco do Render é efêmero.
 */
export const uploadPdf = devolverAoContexto(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname)) {
        return cb(new BusinessError('Envie um arquivo .pdf.'));
      }
      cb(null, true);
    },
  }).single('arquivo'),
);

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
export const uploadAnexo = devolverAoContexto(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok =
        file.mimetype === 'application/pdf' || /^image\/(jpeg|png|webp|heic|heif)$/i.test(file.mimetype);
      if (!ok) return cb(new BusinessError('Envie um PDF ou uma imagem (JPG, PNG).'));
      cb(null, true);
    },
  }).single('arquivo'),
);

/**
 * Upload da foto do usuário (campo "arquivo"), até 1 MB.
 *
 * O teto aqui é **maior** que o da regra de negócio (512 KB), e de propósito:
 * o multer corta a requisição com um erro genérico quando estoura, enquanto o
 * caso de uso recusa dizendo o tamanho e o que fazer. Este limite é a barreira
 * bruta contra upload absurdo; a mensagem útil vem do outro.
 *
 * Sem HEIC: é o formato padrão do iPhone, mas o Chrome não o desenha — aceitá-lo
 * gravaria uma foto que boa parte dos usuários veria como imagem quebrada. A
 * tela converte para JPEG no recorte, antes de enviar.
 */
export const uploadFoto = devolverAoContexto(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.mimetype)) {
        return cb(new BusinessError('Envie uma imagem JPG, PNG ou WebP.'));
      }
      cb(null, true);
    },
  }).single('arquivo'),
);

export const uploadOfx = devolverAoContexto(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!/\.(ofx|qfx)$/i.test(file.originalname)) {
        return cb(new BusinessError('Envie um arquivo .ofx.'));
      }
      cb(null, true);
    },
  }).single('file'),
);
