import type { SessaoAcesso, SituacaoSessao } from '@/core/sessao/Sessao';
import type { Paginado } from '@/application/auditoria/IAuditoriaRepository';
import type { ColunaAcesso, FiltrosAcesso, ISessaoRepository } from './ISessaoRepository';
import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';

const SITUACOES: SituacaoSessao[] = ['ABERTA', 'ENCERRADA', 'ENCERRADA_INESPERADAMENTE'];
const COLUNAS: ColunaAcesso[] = ['logonEm', 'logoutEm', 'usuarioNome'];
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Consulta do histórico de acessos.
 *
 * Só leitura, como a trilha de auditoria — e pelo mesmo motivo: a tabela é
 * alimentada pelo login e pelo middleware de autenticação, e um histórico que
 * a tela pudesse corrigir deixaria de valer como histórico.
 */
export class ConsultarAcessosUseCase {
  constructor(private readonly repo: ISessaoRepository) {}

  async listar(params: {
    usuarioId?: string;
    situacao?: string;
    de?: string;
    ate?: string;
    ordenarPor?: string;
    ordem?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<SessaoAcesso>> {
    const filtros: FiltrosAcesso = {};
    if (params.usuarioId?.trim()) filtros.usuarioId = params.usuarioId.trim();
    if (params.situacao && SITUACOES.includes(params.situacao as SituacaoSessao)) {
      filtros.situacao = params.situacao as SituacaoSessao;
    }
    if (params.de && DATA_ISO.test(params.de)) filtros.de = params.de;
    if (params.ate && DATA_ISO.test(params.ate)) filtros.ate = params.ate;

    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    // Coluna desconhecida cai no padrão em vez de virar erro: a ordenação é
    // conveniência, e recusar a consulta inteira por causa dela deixaria a tela
    // vazia por um detalhe que ninguém digitou.
    const ordenarPor = COLUNAS.includes(params.ordenarPor as ColunaAcesso)
      ? (params.ordenarPor as ColunaAcesso)
      : 'logonEm';
    // Mais recente primeiro é o padrão: a primeira pergunta da tela é "quem
    // está no sistema agora?".
    const descendente = params.ordem !== 'asc';

    return this.repo.listar({ filtros, ordenarPor, descendente, page, pageSize });
  }

  /**
   * Quem aparece no filtro de usuário.
   *
   * Vem de quem **já acessou**, e não do cadastro inteiro: aqui, diferente do
   * filtro de cadastros da auditoria, escolher alguém que nunca entrou só
   * devolveria uma lista vazia — a opção não acrescenta pergunta nenhuma.
   */
  async usuarios(): Promise<{ id: string; nome: string }[]> {
    return this.repo.usuariosComAcesso();
  }
}
