import { Router } from 'express';
import { AjusteController } from '@/presentation/controllers/AjusteController';
import { TermoAditivoController } from '@/presentation/controllers/TermoAditivoController';
import { EmpenhoController } from '@/presentation/controllers/EmpenhoController';
import { PlanoAplicacaoController } from '@/presentation/controllers/PlanoAplicacaoController';
import { CronogramaController } from '@/presentation/controllers/CronogramaController';
import { BemAjusteController } from '@/presentation/controllers/BemAjusteController';
import { ProgramaController } from '@/presentation/controllers/ProgramaController';
import { uploadCsv } from '@/infrastructure/upload/upload';

const ajusteRoutes = Router();
const c = new AjusteController();
const termos = new TermoAditivoController();
const empenhos = new EmpenhoController();
const plano = new PlanoAplicacaoController();
const cronograma = new CronogramaController();
const bens = new BemAjusteController();
const programas = new ProgramaController();

ajusteRoutes.get('/', (req, res, next) => c.listar(req, res, next));
ajusteRoutes.post('/', (req, res, next) => c.criar(req, res, next));
ajusteRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
ajusteRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));

// --- Termos Aditivos (aninhados ao ajuste) ---
ajusteRoutes.get('/:ajusteId/termos-aditivos', (req, res, next) => termos.listar(req, res, next));
ajusteRoutes.post('/:ajusteId/termos-aditivos', (req, res, next) => termos.criar(req, res, next));
ajusteRoutes.put('/:ajusteId/termos-aditivos/:id', (req, res, next) => termos.atualizar(req, res, next));
ajusteRoutes.delete('/:ajusteId/termos-aditivos/:id', (req, res, next) => termos.excluir(req, res, next));

// --- Empenhos (aninhados ao ajuste) ---
ajusteRoutes.get('/:ajusteId/empenhos', (req, res, next) => empenhos.listar(req, res, next));
ajusteRoutes.post('/:ajusteId/empenhos', (req, res, next) => empenhos.criar(req, res, next));
ajusteRoutes.put('/:ajusteId/empenhos/:id', (req, res, next) => empenhos.atualizar(req, res, next));
ajusteRoutes.delete('/:ajusteId/empenhos/:id', (req, res, next) => empenhos.excluir(req, res, next));

// --- Plano de Aplicação (importação CSV) ---
ajusteRoutes.get('/:ajusteId/plano-aplicacao', (req, res, next) => plano.listar(req, res, next));
ajusteRoutes.post('/:ajusteId/plano-aplicacao/importar', uploadCsv, (req, res, next) => plano.importar(req, res, next));
ajusteRoutes.delete('/:ajusteId/plano-aplicacao', (req, res, next) => plano.limpar(req, res, next));

// --- Cronograma de Desembolso (importação CSV) ---
ajusteRoutes.get('/:ajusteId/cronograma', (req, res, next) => cronograma.listar(req, res, next));
ajusteRoutes.post('/:ajusteId/cronograma/importar', uploadCsv, (req, res, next) => cronograma.importar(req, res, next));
ajusteRoutes.delete('/:ajusteId/cronograma', (req, res, next) => cronograma.limpar(req, res, next));

// --- Bens Cedidos do ajuste (importação CSV) ---
ajusteRoutes.get('/:ajusteId/bens', (req, res, next) => bens.listar(req, res, next));
ajusteRoutes.post('/:ajusteId/bens/importar', uploadCsv, (req, res, next) => bens.importar(req, res, next));
ajusteRoutes.delete('/:ajusteId/bens', (req, res, next) => bens.limpar(req, res, next));

// --- Programas e Metas (plano de metas) ---
ajusteRoutes.get('/:ajusteId/programas', (req, res, next) => programas.listar(req, res, next));
ajusteRoutes.post('/:ajusteId/programas', (req, res, next) => programas.criarPrograma(req, res, next));
ajusteRoutes.put('/:ajusteId/programas/:programaId', (req, res, next) => programas.atualizarPrograma(req, res, next));
ajusteRoutes.delete('/:ajusteId/programas/:programaId', (req, res, next) => programas.excluirPrograma(req, res, next));
ajusteRoutes.post('/:ajusteId/programas/:programaId/metas', (req, res, next) => programas.criarMeta(req, res, next));
ajusteRoutes.put('/:ajusteId/programas/:programaId/metas/:metaId', (req, res, next) => programas.atualizarMeta(req, res, next));
ajusteRoutes.delete('/:ajusteId/programas/:programaId/metas/:metaId', (req, res, next) => programas.excluirMeta(req, res, next));

export { ajusteRoutes };
