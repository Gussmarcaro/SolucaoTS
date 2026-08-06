import { Router } from 'express';
import { BemCedidoController } from '@/presentation/controllers/BemCedidoController';

const bemCedidoRoutes = Router();
const c = new BemCedidoController();

bemCedidoRoutes.get('/', (req, res, next) => c.listar(req, res, next));
bemCedidoRoutes.post('/', (req, res, next) => c.criar(req, res, next));
bemCedidoRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
bemCedidoRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
bemCedidoRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { bemCedidoRoutes };
