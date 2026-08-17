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
import { tarefaRoutes } from './tarefa.routes';
import { grupoRoutes } from './grupo.routes';
import { clienteRoutes } from './cliente.routes';
import { dominioRoutes } from './dominio.routes';
import { authRoutes } from './auth.routes';
import { auditoriaRoutes } from './auditoria.routes';
import { BuscaController } from '@/presentation/controllers/BuscaController';
import { LgpdController } from '@/presentation/controllers/LgpdController';
import { AssistenteController } from '@/presentation/controllers/AssistenteController';
import { AlertaController } from '@/presentation/controllers/AlertaController';
import { AutoriaController } from '@/presentation/controllers/AutoriaController';
import { TransparenciaController } from '@/presentation/controllers/TransparenciaController';
import { PermissaoController } from '@/presentation/controllers/PermissaoController';
import { autenticar } from '@/presentation/middlewares/autenticar';
import { exigirGrupo } from '@/presentation/middlewares/exigirGrupo';
import { exigirPermissao } from '@/presentation/middlewares/exigirPermissao';

const routes = Router();

// --- Públicas ---
routes.get('/health', (_req, res) => res.json({ status: 'ok' }));
routes.use('/auth', authRoutes);

// Daqui para baixo tudo exige JWT. O middleware também abre o contexto da
// requisição, de onde saem a autoria dos registros e a trilha de auditoria.
routes.use(autenticar);

/*
 * Daqui para baixo, cada família de rotas passa por `exigirPermissao`. A ação
 * exigida sai do método HTTP — GET consulta, DELETE exclui, o resto grava.
 *
 * Recurso não declarado significa **bloqueado**: uma rota nova sem permissão
 * não responde a ninguém, em vez de responder a todos. `verificar:permissoes`
 * reprova o que ficar de fora, para o erro aparecer no desenvolvimento e não
 * como acesso indevido em produção.
 */
routes.use('/usuarios', exigirPermissao('CONFIG_USUARIOS'), usuarioRoutes);
routes.use('/empresas', exigirPermissao('CADASTRO_EMPRESAS'), empresaRoutes);
routes.use('/entidades', exigirPermissao('CADASTRO_ENTIDADES'), entidadeRoutes);
routes.use('/fornecedores', exigirPermissao('CADASTRO_FORNECEDORES'), fornecedorRoutes);
routes.use('/colaboradores', exigirPermissao('CADASTRO_COLABORADORES'), colaboradorRoutes);
routes.use('/contratos', exigirPermissao('CADASTRO_CONTRATOS'), contratoRoutes);
routes.use('/bens-cedidos', exigirPermissao('CADASTRO_BENS_CEDIDOS'), bemCedidoRoutes);
routes.use('/servidores-cedidos', exigirPermissao('CADASTRO_SERVIDORES_CEDIDOS'), servidorCedidoRoutes);
routes.use('/ajustes', exigirPermissao('CADASTRO_AJUSTES'), ajusteRoutes);
routes.use('/prestacoes', exigirPermissao('PRESTACAO_CONTAS'), prestacaoRoutes);
routes.use('/tarefas', exigirPermissao('FISCALIZACAO'), tarefaRoutes);
routes.use('/grupos', exigirPermissao('CONFIG_GRUPOS'), grupoRoutes);
routes.use('/orgaos', exigirPermissao('CONFIG_ORGAOS'), clienteRoutes);
routes.use('/auditoria', exigirPermissao('CONFIG_AUDITORIA'), auditoriaRoutes);

// Tabelas de domínio (CBO, classificação econômica): catálogo oficial só de
// leitura, que todo formulário consulta. Barrar aqui quebraria o preenchimento
// de quem tem acesso legítimo à tela, sem proteger nada — o conteúdo é público.
routes.use('/dominios', dominioRoutes);

// Matriz de permissões. Fica sob o mesmo recurso da tela de grupos: quem
// administra grupos administra o que eles podem fazer.
const permissoes = new PermissaoController();
routes.get('/permissoes/recursos', exigirPermissao('CONFIG_GRUPOS'), (req, res, next) =>
  permissoes.recursos(req, res, next),
);
routes.get('/permissoes/:grupoId', exigirPermissao('CONFIG_GRUPOS'), (req, res, next) =>
  permissoes.doGrupo(req, res, next),
);
routes.put('/permissoes/:grupoId', exigirPermissao('CONFIG_GRUPOS'), (req, res, next) =>
  permissoes.salvar(req, res, next),
);

// O que o usuário logado pode fazer — alimenta o menu e os botões da interface.
routes.get('/permissoes/eu/resumo', (req, res, next) => permissoes.minhas(req, res, next));

// Busca global da barra superior — percorre todos os cadastros de uma vez.
const busca = new BuscaController();
routes.get('/busca', (req, res, next) => busca.buscar(req, res, next));

// Quem incluiu o registro — uma rota para todos os cadastros que têm o campo.
const autoria = new AutoriaController();
routes.get('/autoria/:entidade/:id', (req, res, next) => autoria.consultar(req, res, next));

// Transparência — relação de parcerias para publicação (Lei 13.019, art. 10).
const transparencia = new TransparenciaController();
routes.get('/transparencia', exigirPermissao('TRANSPARENCIA'), (req, res, next) =>
  transparencia.listar(req, res, next),
);

// Alertas do sino — prazos legais e pendências, calculados a cada consulta.
const alertas = new AlertaController();
routes.get('/alertas', (req, res, next) => alertas.listar(req, res, next));

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
// Duas travas em série, de propósito: a permissão dá o controle fino ao
// administrador, e o grupo é o piso que a matriz não consegue baixar.
routes.get(
  '/lgpd/titular',
  exigirGrupo('Administrador', 'Suporte'),
  exigirPermissao('CONFIG_PRIVACIDADE'),
  (req, res, next) => lgpd.titular(req, res, next),
);

export { routes };
