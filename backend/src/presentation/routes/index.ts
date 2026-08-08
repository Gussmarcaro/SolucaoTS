import { Router } from 'express';
import { usuarioRoutes } from './usuario.routes';
import { empresaRoutes } from './empresa.routes';
import { entidadeRoutes } from './entidade.routes';
import { fornecedorRoutes } from './fornecedor.routes';
import { colaboradorRoutes } from './colaborador.routes';
import { contratoRoutes } from './contrato.routes';
import { bemCedidoRoutes } from './bemCedido.routes';
import { servidorCedidoRoutes } from './servidorCedido.routes';
import { ajusteRoutes } from './ajuste.routes';
import { prestacaoRoutes } from './prestacao.routes';
import { grupoRoutes } from './grupo.routes';
import { clienteRoutes } from './cliente.routes';
import { dominioRoutes } from './dominio.routes';
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
routes.use('/bens-cedidos', bemCedidoRoutes);
routes.use('/servidores-cedidos', servidorCedidoRoutes);
routes.use('/ajustes', ajusteRoutes);
routes.use('/prestacoes', prestacaoRoutes);
routes.use('/grupos', grupoRoutes);
routes.use('/orgaos', clienteRoutes);
routes.use('/dominios', dominioRoutes);

export { routes };
