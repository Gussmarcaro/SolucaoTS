import { Router } from 'express';
import { usuarioRoutes } from './usuario.routes';
import { empresaRoutes } from './empresa.routes';
import { authRoutes } from './auth.routes';

const routes = Router();

routes.get('/health', (_req, res) => res.json({ status: 'ok' }));
routes.use('/auth', authRoutes);
routes.use('/usuarios', usuarioRoutes);
routes.use('/empresas', empresaRoutes);

export { routes };
