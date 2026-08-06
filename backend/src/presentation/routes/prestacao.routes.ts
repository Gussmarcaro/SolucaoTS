import { Router } from 'express';
import { PrestacaoController } from '@/presentation/controllers/PrestacaoController';

const prestacaoRoutes = Router();
const c = new PrestacaoController();

prestacaoRoutes.get('/', (req, res, next) => c.listar(req, res, next));
prestacaoRoutes.post('/', (req, res, next) => c.criar(req, res, next));
prestacaoRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
prestacaoRoutes.delete('/:id', (req, res, next) => c.excluir(req, res, next));

export { prestacaoRoutes };
