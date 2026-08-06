import { Router } from 'express';
import { ContratoController } from '@/presentation/controllers/ContratoController';

const contratoRoutes = Router();
const c = new ContratoController();

contratoRoutes.get('/', (req, res, next) => c.listar(req, res, next));
contratoRoutes.post('/', (req, res, next) => c.criar(req, res, next));
contratoRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
contratoRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
contratoRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { contratoRoutes };
