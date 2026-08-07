import { Router } from 'express';
import { ClienteController } from '@/presentation/controllers/ClienteController';

const clienteRoutes = Router();
const c = new ClienteController();

clienteRoutes.get('/', (req, res, next) => c.listar(req, res, next));
clienteRoutes.post('/', (req, res, next) => c.criar(req, res, next));
clienteRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
clienteRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
clienteRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { clienteRoutes };
