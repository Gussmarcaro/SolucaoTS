/**
 * Catálogo de recursos protegidos e as faixas de acesso.
 *
 * "Recurso" é uma tela do sistema do ponto de vista de quem configura — não uma
 * rota nem um model. É o que o administrador reconhece na matriz de permissões.
 */

/** Faixas oferecidas na matriz, da mais restrita à mais ampla. */
export type NivelPermissao = 'SEM_ACESSO' | 'CONSULTA' | 'EDICAO' | 'TOTAL';

/** Ações do enum `AcaoPermissao` do schema. */
export type AcaoPermissao = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE';

/**
 * O que cada faixa concede.
 *
 * A faixa é conceito de interface; o banco guarda ações. Assim a matriz fica
 * simples de operar sem que o modelo de dados perca granularidade — e uma
 * permissão fora das faixas (por exemplo só DELETE) continua representável.
 */
export const ACOES_DO_NIVEL: Record<NivelPermissao, AcaoPermissao[]> = {
  SEM_ACESSO: [],
  CONSULTA: ['READ'],
  EDICAO: ['READ', 'CREATE', 'UPDATE'],
  TOTAL: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
};

/** Caminho inverso: das ações gravadas de volta para a faixa exibida. */
export function nivelDasAcoes(acoes: Iterable<AcaoPermissao>): NivelPermissao {
  const tem = new Set(acoes);
  if (tem.has('DELETE')) return 'TOTAL';
  if (tem.has('CREATE') || tem.has('UPDATE')) return 'EDICAO';
  if (tem.has('READ')) return 'CONSULTA';
  return 'SEM_ACESSO';
}

export interface Recurso {
  /** Identificador gravado em `Permissao.modulo`. */
  id: string;
  rotulo: string;
  /** Seção da matriz, espelhando o menu do sistema. */
  secao: string;
  /**
   * Recurso que aceita transmissão ao TCESP.
   *
   * `APPROVE` é a única ação que não cabe na escala consulta → total: enviar a
   * prestação ao Tribunal não é "editar mais forte", é assinar. Alguém pode ter
   * acesso total ao conteúdo e ainda assim não poder transmitir.
   */
  temAprovacao?: boolean;
  /**
   * Só os grupos administrativos enxergam. Marcar aqui não substitui a
   * permissão — é uma trava a mais, para telas que expõem o sistema inteiro.
   */
  restrito?: boolean;
}

export const RECURSOS: Recurso[] = [
  { id: 'CADASTRO_ENTIDADES', rotulo: 'Entidades / Beneficiárias', secao: 'Cadastro' },
  { id: 'CADASTRO_AJUSTES', rotulo: 'Ajustes Celebrados', secao: 'Cadastro' },
  { id: 'CADASTRO_FORNECEDORES', rotulo: 'Fornecedores / Prestadores', secao: 'Cadastro' },
  { id: 'CADASTRO_CONTRATOS', rotulo: 'Contratos Firmados', secao: 'Cadastro' },
  { id: 'CADASTRO_COLABORADORES', rotulo: 'Colaboradores', secao: 'Cadastro' },
  { id: 'CADASTRO_BENS_CEDIDOS', rotulo: 'Bens Cedidos', secao: 'Cadastro' },
  { id: 'CADASTRO_SERVIDORES_CEDIDOS', rotulo: 'Servidores Cedidos', secao: 'Cadastro' },
  { id: 'CADASTRO_EMPRESAS', rotulo: 'Empresas (suspenso)', secao: 'Cadastro' },
  { id: 'PRESTACAO_CONTAS', rotulo: 'Prestação de Contas', secao: 'Prestação', temAprovacao: true },
  { id: 'TRANSPARENCIA', rotulo: 'Transparência', secao: 'Prestação' },
  { id: 'CONFIG_ORGAOS', rotulo: 'Órgãos Concessores', secao: 'Configurações' },
  { id: 'CONFIG_USUARIOS', rotulo: 'Usuários', secao: 'Configurações' },
  { id: 'CONFIG_GRUPOS', rotulo: 'Grupos e Permissões', secao: 'Configurações', restrito: true },
  { id: 'CONFIG_AUDITORIA', rotulo: 'Auditoria', secao: 'Configurações', restrito: true },
  { id: 'CONFIG_PRIVACIDADE', rotulo: 'Privacidade e LGPD', secao: 'Configurações' },
];

export const RECURSOS_POR_ID = new Map(RECURSOS.map((r) => [r.id, r]));

/**
 * Recurso que nunca pode ser removido de quem administra.
 *
 * Sem esta trava, o primeiro erro de configuração tranca todo mundo para fora
 * da própria tela de permissões, e a saída passa a ser mexer no banco.
 */
export const RECURSO_INDISPENSAVEL = 'CONFIG_GRUPOS';
