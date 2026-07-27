import { Router } from 'express';
import { EmpresaController } from '@/presentation/controllers/EmpresaController';
import { uploadLogo } from '@/infrastructure/upload/upload';

const empresaRoutes = Router();
const c = new EmpresaController();

empresaRoutes.get('/', (req, res, next) => c.listar(req, res, next));
empresaRoutes.post('/', (req, res, next) => c.criar(req, res, next));
empresaRoutes.get('/:id', (req, res, next) => c.buscar(req, res, next));
empresaRoutes.put('/:id', (req, res, next) => c.atualizar(req, res, next));
empresaRoutes.patch('/:id/status', (req, res, next) => c.definirAtivo(req, res, next));
// Upload de logo associado a uma empresa existente.
empresaRoutes.post('/:id/logo', uploadLogo, (req, res, next) => c.uploadLogo(req, res, next));

export { empresaRoutes };
