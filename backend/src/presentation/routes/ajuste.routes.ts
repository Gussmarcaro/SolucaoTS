import { Router } from 'express';
import { AjusteController } from '@/presentation/controllers/AjusteController';
import { TermoAditivoController } from '@/presentation/controllers/TermoAditivoController';
import { EmpenhoController } from '@/presentation/controllers/EmpenhoController';

const ajusteRoutes = Router();
const c = new AjusteController();
const termos = new TermoAditivoController();
const empenhos = new EmpenhoController();

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

export { ajusteRoutes };
