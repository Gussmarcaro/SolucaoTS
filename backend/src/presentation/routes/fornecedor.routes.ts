import { Router } from 'express';
import { FornecedorController } from '@/presentation/controllers/FornecedorController';

const fornecedorRoutes = Router();
const c = new FornecedorController();

fornecedorRoutes.get('/', (req, res, next) => c.listar(req, res, next));
fornecedorRoutes.post('/', (req, res, next) => c.criar(req, res, next));
fornecedorRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
fornecedorRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
fornecedorRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { fornecedorRoutes };
