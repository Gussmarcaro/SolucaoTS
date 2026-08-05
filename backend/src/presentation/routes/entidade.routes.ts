import { Router } from 'express';
import { EntidadeController } from '@/presentation/controllers/EntidadeController';

const entidadeRoutes = Router();
const c = new EntidadeController();

entidadeRoutes.get('/', (req, res, next) => c.listar(req, res, next));
entidadeRoutes.post('/', (req, res, next) => c.criar(req, res, next));
entidadeRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
entidadeRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
entidadeRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { entidadeRoutes };
