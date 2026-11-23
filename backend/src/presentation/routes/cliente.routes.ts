import { Router } from 'express';
import { ClienteController } from '@/presentation/controllers/ClienteController';
import { DocumentoController } from '@/presentation/controllers/DocumentoController';

const clienteRoutes = Router();
const c = new ClienteController();

/*
 * ANEXO PC-02 — Termo de Consentimento (contas bancárias).
 *
 * Antes de `/:id`, senão "documentos" seria lido como id de órgão. Não leva
 * id nenhum de propósito: o termo é do órgão de quem está logado, e o recorte
 * vem da extension — pedir o id abriria caminho para gerar o termo alheio.
 */
const documentos = new DocumentoController();
clienteRoutes.get('/documentos/termo-consentimento', (req, res, next) => documentos.termoConsentimento(req, res, next));

clienteRoutes.get('/', (req, res, next) => c.listar(req, res, next));
clienteRoutes.post('/', (req, res, next) => c.criar(req, res, next));
clienteRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
clienteRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
clienteRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { clienteRoutes };
