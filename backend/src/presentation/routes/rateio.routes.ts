import { Router } from 'express';
import { RateioController } from '@/presentation/controllers/RateioController';

const rateioRoutes = Router();
const c = new RateioController();

// Antes de '/:id', senão 'ajustes-vigentes' seria lido como um id.
rateioRoutes.get('/ajustes-vigentes', (req, res, next) => c.ajustesVigentes(req, res, next));

rateioRoutes.get('/', (req, res, next) => c.listar(req, res, next));
rateioRoutes.post('/', (req, res, next) => c.criar(req, res, next));
rateioRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
rateioRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
rateioRoutes.patch('/:id/ativo', (req, res, next) => c.definirAtivo(req, res, next));
rateioRoutes.delete('/:id', (req, res, next) => c.excluir(req, res, next));

export { rateioRoutes };
