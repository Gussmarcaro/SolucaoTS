import { Router } from 'express';
import { EntidadeController } from '@/presentation/controllers/EntidadeController';
import { EntidadeComplementosController } from '@/presentation/controllers/EntidadeComplementosController';
import { uploadPdf } from '@/infrastructure/upload/upload';

const entidadeRoutes = Router();
const c = new EntidadeController();
const comp = new EntidadeComplementosController();

entidadeRoutes.get('/', (req, res, next) => c.listar(req, res, next));
entidadeRoutes.post('/', (req, res, next) => c.criar(req, res, next));
entidadeRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
entidadeRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
entidadeRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

// Estatuto (PDF)
entidadeRoutes.post('/:id/estatuto', uploadPdf, (req, res, next) => c.enviarEstatuto(req, res, next));
entidadeRoutes.get('/:id/estatuto', (req, res, next) => c.baixarEstatuto(req, res, next));
entidadeRoutes.delete('/:id/estatuto', (req, res, next) => c.removerEstatuto(req, res, next));

// --- Diretoria (aninhada à entidade) ---
entidadeRoutes.get('/:entidadeId/diretoria', (req, res, next) => comp.listarDiretoria(req, res, next));
entidadeRoutes.post('/:entidadeId/diretoria', (req, res, next) => comp.criarDiretoria(req, res, next));
entidadeRoutes.put('/:entidadeId/diretoria/:id', (req, res, next) => comp.atualizarDiretoria(req, res, next));
entidadeRoutes.delete('/:entidadeId/diretoria/:id', (req, res, next) => comp.excluirDiretoria(req, res, next));

// --- Atas de eleição da diretoria (vários PDFs por entidade) ---
entidadeRoutes.get('/:entidadeId/atas-diretoria', (req, res, next) => comp.listarAtas(req, res, next));
entidadeRoutes.post('/:entidadeId/atas-diretoria', uploadPdf, (req, res, next) => comp.enviarAta(req, res, next));
entidadeRoutes.get('/:entidadeId/atas-diretoria/:id', (req, res, next) => comp.baixarAta(req, res, next));
entidadeRoutes.delete('/:entidadeId/atas-diretoria/:id', (req, res, next) => comp.excluirAta(req, res, next));

// --- Conselhos (aninhados à entidade) ---
entidadeRoutes.get('/:entidadeId/conselhos', (req, res, next) => comp.listarConselhos(req, res, next));
entidadeRoutes.post('/:entidadeId/conselhos', (req, res, next) => comp.criarConselho(req, res, next));
entidadeRoutes.put('/:entidadeId/conselhos/:id', (req, res, next) => comp.atualizarConselho(req, res, next));
entidadeRoutes.delete('/:entidadeId/conselhos/:id', (req, res, next) => comp.excluirConselho(req, res, next));
entidadeRoutes.post('/:entidadeId/conselhos/:id/ata', uploadPdf, (req, res, next) => comp.enviarAtaConselho(req, res, next));
entidadeRoutes.get('/:entidadeId/conselhos/:id/ata', (req, res, next) => comp.baixarAtaConselho(req, res, next));
entidadeRoutes.delete('/:entidadeId/conselhos/:id/ata', (req, res, next) => comp.removerAtaConselho(req, res, next));

// --- Regularidade fiscal / cadastral ---
entidadeRoutes.get('/:entidadeId/regularidade', (req, res, next) => comp.listarDocumentos(req, res, next));
entidadeRoutes.post('/:entidadeId/regularidade', (req, res, next) => comp.criarDocumento(req, res, next));
entidadeRoutes.put('/:entidadeId/regularidade/:id', (req, res, next) => comp.atualizarDocumento(req, res, next));
entidadeRoutes.delete('/:entidadeId/regularidade/:id', (req, res, next) => comp.excluirDocumento(req, res, next));
entidadeRoutes.post('/:entidadeId/regularidade/:id/arquivo', uploadPdf, (req, res, next) => comp.enviarArquivoDocumento(req, res, next));
entidadeRoutes.get('/:entidadeId/regularidade/:id/arquivo', (req, res, next) => comp.baixarArquivoDocumento(req, res, next));
entidadeRoutes.delete('/:entidadeId/regularidade/:id/arquivo', (req, res, next) => comp.removerArquivoDocumento(req, res, next));

export { entidadeRoutes };
