import { Router } from 'express';
import { AuthController } from '@/presentation/controllers/AuthController';

const authRoutes = Router();
const c = new AuthController();

authRoutes.post('/login', (req, res, next) => c.login(req, res, next));
authRoutes.post('/esqueci-senha', (req, res, next) => c.solicitarRecuperacao(req, res, next));
authRoutes.post('/redefinir-senha', (req, res, next) => c.redefinirSenha(req, res, next));

export { authRoutes };
