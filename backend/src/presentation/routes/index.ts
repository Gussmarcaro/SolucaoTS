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
import { auditoriaRoutes } from './auditoria.routes';
import { BuscaController } from '@/presentation/controllers/BuscaController';
import { LgpdController } from '@/presentation/controllers/LgpdController';
import { AssistenteController } from '@/presentation/controllers/AssistenteController';
import { autenticar } from '@/presentation/middlewares/autenticar';
import { exigirGrupo } from '@/presentation/middlewares/exigirGrupo';

const routes = Router();

// --- Públicas ---
routes.get('/health', (_req, res) => res.json({ status: 'ok' }));
routes.use('/auth', authRoutes);

// Daqui para baixo tudo exige JWT. O middleware também abre o contexto da
// requisição, de onde saem a autoria dos registros e a trilha de auditoria.
routes.use(autenticar);

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
routes.use('/auditoria', auditoriaRoutes);

// Busca global da barra superior — percorre todos os cadastros de uma vez.
const busca = new BuscaController();
routes.get('/busca', (req, res, next) => busca.buscar(req, res, next));

// Assistente da Fase V — responde a partir da documentação embarcada.
const assistente = new AssistenteController();
routes.get('/assistente/status', (req, res) => assistente.status(req, res));
routes.post('/assistente', (req, res, next) => assistente.responder(req, res, next));

// LGPD — registro das operações de tratamento (art. 37). Aberta a qualquer
// usuário autenticado: cada um gera o registro do próprio acesso.
const lgpd = new LgpdController();
routes.post('/lgpd/acesso-dados', (req, res, next) => lgpd.acessoDados(req, res, next));
// O relatório do titular cruza todos os cadastros de uma vez — fica restrito a
// quem administra, como a trilha de auditoria.
routes.get(
  '/lgpd/titular',
  exigirGrupo('Administrador', 'Suporte'),
  (req, res, next) => lgpd.titular(req, res, next),
);

export { routes };
