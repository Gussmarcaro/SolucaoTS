import { Router } from 'express';
import { EmpresaController } from '@/presentation/controllers/EmpresaController';

const empresaRoutes = Router();
const c = new EmpresaController();

empresaRoutes.get('/', (req, res, next) => c.listar(req, res, next));
empresaRoutes.post('/', (req, res, next) => c.criar(req, res, next));
empresaRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
empresaRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
empresaRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));

export { empresaRoutes };
