import { Router } from 'express';
import { PrestacaoController } from '@/presentation/controllers/PrestacaoController';
import { DocumentoFiscalController } from '@/presentation/controllers/DocumentoFiscalController';
import { PagamentoController } from '@/presentation/controllers/PagamentoController';
import { ReceitaController } from '@/presentation/controllers/ReceitaController';
import { DisponibilidadeController } from '@/presentation/controllers/DisponibilidadeController';
import { DescontoController } from '@/presentation/controllers/DescontoController';
import { DevolucaoController } from '@/presentation/controllers/DevolucaoController';
import { GlosaController } from '@/presentation/controllers/GlosaController';
import { EmpregadoController } from '@/presentation/controllers/EmpregadoController';
import { EmpenhoPrestacaoController } from '@/presentation/controllers/EmpenhoPrestacaoController';
import { RepasseController } from '@/presentation/controllers/RepasseController';

const prestacaoRoutes = Router();
const c = new PrestacaoController();
const docs = new DocumentoFiscalController();
const pagamentos = new PagamentoController();
const receitas = new ReceitaController();
const disponibilidades = new DisponibilidadeController();
const descontos = new DescontoController();
const devolucoes = new DevolucaoController();

/** Registra as 4 rotas CRUD de um bloco simples aninhado à prestação. */
function bloco(
  path: string,
  ctrl: {
    listar: (req: any, res: any, next: any) => unknown;
    criar: (req: any, res: any, next: any) => unknown;
    atualizar: (req: any, res: any, next: any) => unknown;
    excluir: (req: any, res: any, next: any) => unknown;
  },
) {
  prestacaoRoutes.get(`/:prestacaoId/${path}`, (req, res, next) => ctrl.listar(req, res, next));
  prestacaoRoutes.post(`/:prestacaoId/${path}`, (req, res, next) => ctrl.criar(req, res, next));
  prestacaoRoutes.put(`/:prestacaoId/${path}/:id`, (req, res, next) => ctrl.atualizar(req, res, next));
  prestacaoRoutes.delete(`/:prestacaoId/${path}/:id`, (req, res, next) => ctrl.excluir(req, res, next));
}

prestacaoRoutes.get('/', (req, res, next) => c.listar(req, res, next));
prestacaoRoutes.post('/', (req, res, next) => c.criar(req, res, next));
prestacaoRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
prestacaoRoutes.delete('/:id', (req, res, next) => c.excluir(req, res, next));

// --- Documentos Fiscais (bloco) ---
prestacaoRoutes.get('/:prestacaoId/documentos-fiscais', (req, res, next) => docs.listar(req, res, next));
prestacaoRoutes.post('/:prestacaoId/documentos-fiscais', (req, res, next) => docs.criar(req, res, next));
prestacaoRoutes.put('/:prestacaoId/documentos-fiscais/:id', (req, res, next) => docs.atualizar(req, res, next));
prestacaoRoutes.delete('/:prestacaoId/documentos-fiscais/:id', (req, res, next) => docs.excluir(req, res, next));

// --- Pagamentos (bloco) ---
prestacaoRoutes.get('/:prestacaoId/pagamentos', (req, res, next) => pagamentos.listar(req, res, next));
prestacaoRoutes.post('/:prestacaoId/pagamentos', (req, res, next) => pagamentos.criar(req, res, next));
prestacaoRoutes.put('/:prestacaoId/pagamentos/:id', (req, res, next) => pagamentos.atualizar(req, res, next));
prestacaoRoutes.delete('/:prestacaoId/pagamentos/:id', (req, res, next) => pagamentos.excluir(req, res, next));

// --- Blocos simples ---
bloco('receitas', receitas);
bloco('disponibilidades', disponibilidades);
bloco('descontos', descontos);
bloco('devolucoes', devolucoes);
bloco('glosas', new GlosaController());
bloco('empregados', new EmpregadoController());
bloco('empenhos', new EmpenhoPrestacaoController());
bloco('repasses', new RepasseController());

export { prestacaoRoutes };
