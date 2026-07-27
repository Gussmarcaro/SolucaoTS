import { Router } from 'express';
import { UsuarioController } from '@/presentation/controllers/UsuarioController';

const usuarioRoutes = Router();
const controller = new UsuarioController();

usuarioRoutes.post('/', (req, res, next) => controller.criar(req, res, next));
usuarioRoutes.get('/', (req, res, next) => controller.listar(req, res, next));

export { usuarioRoutes };
