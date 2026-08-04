import { Router } from 'express';
import { UsuarioController } from '@/presentation/controllers/UsuarioController';

const usuarioRoutes = Router();
const controller = new UsuarioController();

usuarioRoutes.post('/', (req, res, next) => controller.criar(req, res, next));
usuarioRoutes.get('/', (req, res, next) => controller.listar(req, res, next));
usuarioRoutes.get('/:id', (req, res, next) => controller.buscar(req, res, next));
usuarioRoutes.put('/:id', (req, res, next) => controller.atualizar(req, res, next));
usuarioRoutes.patch('/:id/status', (req, res, next) => controller.definirAtivo(req, res, next));

export { usuarioRoutes };
