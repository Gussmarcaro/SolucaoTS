import { Router } from 'express';
import { usuarioRoutes } from './usuario.routes';
import { empresaRoutes } from './empresa.routes';
import { entidadeRoutes } from './entidade.routes';
import { fornecedorRoutes } from './fornecedor.routes';
import { colaboradorRoutes } from './colaborador.routes';
import { contratoRoutes } from './contrato.routes';
import { authRoutes } from './auth.routes';

const routes = Router();

routes.get('/health', (_req, res) => res.json({ status: 'ok' }));
routes.use('/auth', authRoutes);
routes.use('/usuarios', usuarioRoutes);
routes.use('/empresas', empresaRoutes);
routes.use('/entidades', entidadeRoutes);
routes.use('/fornecedores', fornecedorRoutes);
routes.use('/colaboradores', colaboradorRoutes);
routes.use('/contratos', contratoRoutes);

export { routes };
