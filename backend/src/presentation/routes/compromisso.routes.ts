import { Router } from 'express';
import { CompromissoController } from '@/presentation/controllers/CompromissoController';

const compromissoRoutes = Router();
const c = new CompromissoController();

// Antes de '/:id', senão 'resumo' seria lido como um id.
compromissoRoutes.get('/resumo', (req, res, next) => c.resumo(req, res, next));

compromissoRoutes.get('/', (req, res, next) => c.listar(req, res, next));
compromissoRoutes.post('/', (req, res, next) => c.criar(req, res, next));
compromissoRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
compromissoRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
compromissoRoutes.patch('/:id/status', (req, res, next) => c.definirStatus(req, res, next));
compromissoRoutes.patch('/:id/horario', (req, res, next) => c.mover(req, res, next));
compromissoRoutes.delete('/:id', (req, res, next) => c.excluir(req, res, next));

export { compromissoRoutes };
