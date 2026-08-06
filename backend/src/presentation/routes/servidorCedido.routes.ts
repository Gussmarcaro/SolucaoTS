import { Router } from 'express';
import { ServidorCedidoController } from '@/presentation/controllers/ServidorCedidoController';

const servidorCedidoRoutes = Router();
const c = new ServidorCedidoController();

servidorCedidoRoutes.get('/', (req, res, next) => c.listar(req, res, next));
servidorCedidoRoutes.post('/', (req, res, next) => c.criar(req, res, next));
servidorCedidoRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
servidorCedidoRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
servidorCedidoRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { servidorCedidoRoutes };
