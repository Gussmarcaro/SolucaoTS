import { Router } from 'express';
import { ColaboradorController } from '@/presentation/controllers/ColaboradorController';

const colaboradorRoutes = Router();
const c = new ColaboradorController();

colaboradorRoutes.get('/', (req, res, next) => c.listar(req, res, next));
colaboradorRoutes.post('/', (req, res, next) => c.criar(req, res, next));
colaboradorRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
colaboradorRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
colaboradorRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { colaboradorRoutes };
