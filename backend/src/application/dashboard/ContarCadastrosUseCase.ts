import {
  RECURSO_DO_CADASTRO,
  type ChaveCadastro,
  type Contagem,
  type IContagemRepository,
  type IPermissoesLeitor,
} from './IContagemRepository';

const TODOS = Object.keys(RECURSO_DO_CADASTRO) as ChaveCadastro[];

/**
 * Contagem dos cadastros, **recortada pelo que o grupo pode ler**.
 *
 * Esse recorte é um aperto, não só uma economia. Hoje os seis números aparecem
 * para qualquer usuário: a grade de KPIs do Dashboard não consultava permissão
 * nenhuma, então quem não tem acesso a Colaboradores mesmo assim ficava sabendo
 * quantos existem. Não é vazamento grave — é contagem, sem conteúdo —, mas é
 * informação sobre uma tela que a pessoa não deveria nem procurar, e a regra da
 * casa é que quem não tem acesso não vê o item.
 *
 * O filtro acontece **no servidor**, e não escondendo o número na tela: filtro
 * de interface é sugestão, e a rota continuaria respondendo a quem a chamasse
 * direto.
 */
export class ContarCadastrosUseCase {
  constructor(
    private readonly repo: IContagemRepository,
    private readonly permissoes: IPermissoesLeitor,
  ) {}

  async execute(grupoNome: string | null): Promise<Contagem[]> {
    const legiveis = await this.permissoes.recursosLegiveis(grupoNome);

    // `null` é "grupo nunca configurado", que neste RBAC libera tudo. Tratá-lo
    // como conjunto vazio devolveria zero cadastros para quem tem acesso a
    // todos — o oposto exato da regra.
    const permitidos =
      legiveis === null ? TODOS : TODOS.filter((c) => legiveis.has(RECURSO_DO_CADASTRO[c]));

    if (permitidos.length === 0) return [];
    return this.repo.contar(permitidos);
  }
}
