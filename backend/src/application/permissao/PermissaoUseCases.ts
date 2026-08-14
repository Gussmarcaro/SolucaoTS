import { BusinessError } from '@/shared/errors';
import {
  ACOES_DO_NIVEL,
  RECURSOS,
  RECURSOS_POR_ID,
  RECURSO_INDISPENSAVEL,
  nivelDasAcoes,
  type AcaoPermissao,
  type NivelPermissao,
} from '@/core/permissao/Recurso';

/** O que a matriz mostra e grava para um recurso. */
export interface AcessoDoRecurso {
  recursoId: string;
  nivel: NivelPermissao;
  /** Transmitir ao TCESP — só nos recursos que aceitam. */
  aprovacao?: boolean;
}

export interface IPermissaoRepository {
  /** recurso → ações concedidas ao grupo. */
  concessoes(grupoId: string): Promise<Map<string, Set<AcaoPermissao>>>;
  /** Substitui as concessões do grupo pelas informadas. */
  substituir(grupoId: string, acoes: { recursoId: string; acao: AcaoPermissao }[]): Promise<void>;
  nomeDoGrupo(grupoId: string): Promise<string | null>;
}

/** Grupos que não podem perder o acesso à própria tela de permissões. */
const GRUPOS_ADMIN = ['administrador', 'suporte'];

const normalizar = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

export class PermissaoUseCases {
  constructor(private readonly repo: IPermissaoRepository) {}

  /** Catálogo para montar a matriz na tela. */
  recursos() {
    return RECURSOS;
  }

  /** Acesso atual do grupo, já traduzido das ações para as faixas. */
  async doGrupo(grupoId: string): Promise<AcessoDoRecurso[]> {
    const concessoes = await this.repo.concessoes(grupoId);
    return RECURSOS.map((r) => {
      const acoes = concessoes.get(r.id) ?? new Set<AcaoPermissao>();
      return {
        recursoId: r.id,
        nivel: nivelDasAcoes(acoes),
        ...(r.temAprovacao ? { aprovacao: acoes.has('APPROVE') } : {}),
      };
    });
  }

  /**
   * Grava a matriz de um grupo.
   *
   * Substitui tudo em vez de aplicar diferenças: a tela envia o estado
   * completo, e comparar item a item abriria espaço para uma permissão sobrar
   * de uma configuração anterior — numa tela de acesso, sobra é falha.
   */
  async salvar(grupoId: string, acessos: AcessoDoRecurso[]): Promise<void> {
    const nome = await this.repo.nomeDoGrupo(grupoId);
    if (!nome) throw new BusinessError('Grupo não encontrado.');

    const porRecurso = new Map(acessos.map((a) => [a.recursoId, a]));

    // Trava contra auto-bloqueio: sem ela, tirar o acesso do Administrador à
    // tela de permissões tranca todo mundo para fora dela em definitivo, e a
    // correção passa a exigir mexer direto no banco.
    if (GRUPOS_ADMIN.includes(normalizar(nome))) {
      const indispensavel = porRecurso.get(RECURSO_INDISPENSAVEL);
      if (!indispensavel || indispensavel.nivel !== 'TOTAL')
        throw new BusinessError(
          `O grupo ${nome} precisa manter acesso total a ${RECURSOS_POR_ID.get(RECURSO_INDISPENSAVEL)?.rotulo}: ` +
            'sem isso ninguém conseguiria voltar a configurar permissões.',
        );
    }

    const linhas: { recursoId: string; acao: AcaoPermissao }[] = [];
    for (const acesso of acessos) {
      const recurso = RECURSOS_POR_ID.get(acesso.recursoId);
      if (!recurso) throw new BusinessError(`Recurso desconhecido: ${acesso.recursoId}`);

      for (const acao of ACOES_DO_NIVEL[acesso.nivel] ?? [])
        linhas.push({ recursoId: acesso.recursoId, acao });

      // Transmitir exige, no mínimo, poder ver o que se transmite.
      if (recurso.temAprovacao && acesso.aprovacao) {
        if (acesso.nivel === 'SEM_ACESSO')
          throw new BusinessError(
            `Para transmitir ${recurso.rotulo} ao TCESP o grupo precisa ao menos de consulta.`,
          );
        linhas.push({ recursoId: acesso.recursoId, acao: 'APPROVE' });
      }
    }

    await this.repo.substituir(grupoId, linhas);
  }
}
