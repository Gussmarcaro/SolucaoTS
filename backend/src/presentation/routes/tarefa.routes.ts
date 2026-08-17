import { Router } from 'express';
import { TarefaController } from '@/presentation/controllers/TarefaController';

const tarefaRoutes = Router();
const c = new TarefaController();

// Antes de '/:id', senão 'resumo' é lido como um id.
tarefaRoutes.get('/resumo', (req, res, next) => c.resumo(req, res, next));

tarefaRoutes.get('/', (req, res, next) => c.listar(req, res, next));
tarefaRoutes.post('/', (req, res, next) => c.criar(req, res, next));
tarefaRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
tarefaRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
tarefaRoutes.patch('/:id/status', (req, res, next) => c.definirStatus(req, res, next));
tarefaRoutes.delete('/:id', (req, res, next) => c.excluir(req, res, next));

export { tarefaRoutes };
