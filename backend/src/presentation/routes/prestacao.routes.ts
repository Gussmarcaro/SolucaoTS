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
import { BemPrestacaoController } from '@/presentation/controllers/BemPrestacaoController';
import { ServidorPrestacaoController } from '@/presentation/controllers/ServidorPrestacaoController';
import { RelatorioAtividadeController } from '@/presentation/controllers/RelatorioAtividadeController';
import { ContratoPrestacaoController } from '@/presentation/controllers/ContratoPrestacaoController';
import { MontadorController } from '@/presentation/controllers/MontadorController';
import { TransmissaoController } from '@/presentation/controllers/TransmissaoController';
import { CertidoesPrestacaoController } from '@/presentation/controllers/CertidoesPrestacaoController';
import { DeclaratoriosController } from '@/presentation/controllers/DeclaratoriosController';
import { AjustesSaldoController } from '@/presentation/controllers/AjustesSaldoController';

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

// Montagem do documento JSON (prévia)
const montador = new MontadorController();
prestacaoRoutes.get('/:prestacaoId/json', (req, res, next) => montador.gerar(req, res, next));

// Transmissão à API do TCESP (Fase D) — default de ambiente = PILOTO
const transmissao = new TransmissaoController();
prestacaoRoutes.post('/:prestacaoId/transmitir', (req, res, next) => transmissao.transmitir(req, res, next));
prestacaoRoutes.post('/:prestacaoId/consultar-status', (req, res, next) => transmissao.consultar(req, res, next));

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
bloco('bens', new BemPrestacaoController());
bloco('servidores-cedidos', new ServidorPrestacaoController());
bloco('relatorio-atividades', new RelatorioAtividadeController());
bloco('contratos', new ContratoPrestacaoController());

// --- Blocos singleton (1:1 com a prestação) ---
const certidoes = new CertidoesPrestacaoController();
prestacaoRoutes.get('/:prestacaoId/dados-gerais', (req, res, next) => certidoes.obterDadosGerais(req, res, next));
prestacaoRoutes.put('/:prestacaoId/dados-gerais', (req, res, next) => certidoes.salvarDadosGerais(req, res, next));
prestacaoRoutes.get('/:prestacaoId/responsaveis', (req, res, next) => certidoes.obterResponsaveis(req, res, next));
prestacaoRoutes.put('/:prestacaoId/responsaveis', (req, res, next) => certidoes.salvarResponsaveis(req, res, next));

const declaratorios = new DeclaratoriosController();
prestacaoRoutes.get('/:prestacaoId/declaracoes', (req, res, next) => declaratorios.obterDeclaracoes(req, res, next));
prestacaoRoutes.put('/:prestacaoId/declaracoes', (req, res, next) => declaratorios.salvarDeclaracoes(req, res, next));
prestacaoRoutes.get('/:prestacaoId/parecer-conclusivo', (req, res, next) => declaratorios.obterParecer(req, res, next));
prestacaoRoutes.put('/:prestacaoId/parecer-conclusivo', (req, res, next) => declaratorios.salvarParecer(req, res, next));
prestacaoRoutes.get('/:prestacaoId/transparencia', (req, res, next) => declaratorios.obterTransparencia(req, res, next));
prestacaoRoutes.put('/:prestacaoId/transparencia', (req, res, next) => declaratorios.salvarTransparencia(req, res, next));
prestacaoRoutes.get('/:prestacaoId/demonstracoes-contabeis', (req, res, next) => declaratorios.obterDemonstracoes(req, res, next));
prestacaoRoutes.put('/:prestacaoId/demonstracoes-contabeis', (req, res, next) => declaratorios.salvarDemonstracoes(req, res, next));
prestacaoRoutes.get('/:prestacaoId/publicacao-parecer-ata', (req, res, next) => declaratorios.obterPublicacaoParecerAta(req, res, next));
prestacaoRoutes.put('/:prestacaoId/publicacao-parecer-ata', (req, res, next) => declaratorios.salvarPublicacaoParecerAta(req, res, next));
prestacaoRoutes.get('/:prestacaoId/publicacao-rel-atividades', (req, res, next) => declaratorios.obterPublicacaoRelAtividades(req, res, next));
prestacaoRoutes.put('/:prestacaoId/publicacao-rel-atividades', (req, res, next) => declaratorios.salvarPublicacaoRelAtividades(req, res, next));
prestacaoRoutes.get('/:prestacaoId/prestacao-entidade', (req, res, next) => declaratorios.obterPrestacaoEntidade(req, res, next));
prestacaoRoutes.put('/:prestacaoId/prestacao-entidade', (req, res, next) => declaratorios.salvarPrestacaoEntidade(req, res, next));
prestacaoRoutes.get('/:prestacaoId/relatorio-final', (req, res, next) => declaratorios.obterRelatorioFinal(req, res, next));
prestacaoRoutes.put('/:prestacaoId/relatorio-final', (req, res, next) => declaratorios.salvarRelatorioFinal(req, res, next));
prestacaoRoutes.get('/:prestacaoId/regulamento-compras', (req, res, next) => declaratorios.obterRegulamentoCompras(req, res, next));
prestacaoRoutes.put('/:prestacaoId/regulamento-compras', (req, res, next) => declaratorios.salvarRegulamentoCompras(req, res, next));
prestacaoRoutes.get('/:prestacaoId/extrato-fisico-financeiro', (req, res, next) => declaratorios.obterExtrato(req, res, next));
prestacaoRoutes.put('/:prestacaoId/extrato-fisico-financeiro', (req, res, next) => declaratorios.salvarExtrato(req, res, next));
prestacaoRoutes.get('/:prestacaoId/termo-bens-cedidos', (req, res, next) => declaratorios.obterTermoBens(req, res, next));
prestacaoRoutes.put('/:prestacaoId/termo-bens-cedidos', (req, res, next) => declaratorios.salvarTermoBens(req, res, next));

const ajustesSaldo = new AjustesSaldoController();
prestacaoRoutes.get('/:prestacaoId/ajustes-saldo', (req, res, next) => ajustesSaldo.obter(req, res, next));
prestacaoRoutes.put('/:prestacaoId/ajustes-saldo', (req, res, next) => ajustesSaldo.salvar(req, res, next));

export { prestacaoRoutes };
