import { Router } from 'express';
import { AjusteController } from '@/presentation/controllers/AjusteController';

const ajusteRoutes = Router();
const c = new AjusteController();

ajusteRoutes.get('/', (req, res, next) => c.listar(req, res, next));
ajusteRoutes.post('/', (req, res, next) => c.criar(req, res, next));
ajusteRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
ajusteRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));

export { ajusteRoutes };
