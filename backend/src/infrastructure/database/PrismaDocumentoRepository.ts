import { prisma } from './prisma';
import type { IDocumentoRepository } from '@/application/documento/DocumentoUseCases';
import type { DadosTermoConsentimento } from '@/core/documento/termoConsentimento';
import {
  pessoa,
  SEM_PESSOA,
  type DadosTermoCiencia,
  type TipoAjusteTcn,
} from '@/core/documento/termoCiencia';
import { valorGlobalEfetivo } from '@/core/planoAplicacao/totalDoPlano';
import { tenantAtual } from '@/shared/contexto';
import { BusinessError } from '@/shared/errors';

/**
 * De onde sai cada linha dos documentos gerados.
 *
 * O recorte por órgão vem da extension: `Cliente` e `Ajuste` são raízes de
 * tenant, então `findFirst` sem `where` já devolve o órgão de quem pediu, e um
 * id de ajuste de outro órgão simplesmente não existe. É por isso que nenhuma
 * consulta aqui passa `clienteId` à mão.
 */
export class PrismaDocumentoRepository implements IDocumentoRepository {
  /**
   * O nome do município do órgão, tirado da tabela oficial do Audesp.
   *
   * Pelo **código do município**, e não pelo par município+entidade: o par
   * pode estar errado no cadastro (é o que `conferir:orgaos` existe para
   * achar), e o nome da cidade não depende de qual entidade dela é o órgão.
   * `findFirst` basta — todas as entidades do município trazem o mesmo nome.
   */
  private async municipioDe(codigoMunicipio: number): Promise<string | null> {
    const linha = await prisma.entidadeAudesp.findFirst({
      where: { codigoMunicipio },
      select: { nomeMunicipio: true },
    });
    return linha?.nomeMunicipio ?? null;
  }

  async dadosDoOrgao(): Promise<DadosTermoConsentimento | null> {
    /*
     * O órgão tem de estar **escolhido**, e não só filtrado.
     *
     * Sem órgão no contexto — o usuário de Suporte antes de escolher qual
     * atender — a extension não filtra nada, e um `findFirst` sem `where`
     * devolveria o primeiro órgão do banco: um termo assinável com o nome de
     * um órgão que ninguém pediu. Por isso a busca é pelo id do contexto, e a
     * falta dele é dita ao usuário em vez de adivinhada.
     */
    const orgaoId = tenantAtual();
    if (!orgaoId)
      throw new BusinessError(
        'Selecione um órgão no topo da tela para gerar o Termo de Consentimento.',
      );
    const orgao = await prisma.cliente.findUnique({
      where: { id: orgaoId },
      select: {
        nome: true,
        cnpj: true,
        codigoMunicipio: true,
        autoridadeNome: true,
        autoridadeCargo: true,
        autoridadeCpf: true,
      },
    });
    if (!orgao) return null;

    return {
      orgaoNome: orgao.nome,
      orgaoCnpj: orgao.cnpj,
      municipio: await this.municipioDe(orgao.codigoMunicipio),
      responsavelNome: orgao.autoridadeNome,
      responsavelCargo: orgao.autoridadeCargo,
      responsavelCpf: orgao.autoridadeCpf,
    };
  }

  async dadosDoTermoCiencia(
    ajusteId: string,
    prestacaoId?: string,
  ): Promise<DadosTermoCiencia | null> {
    const ajuste = await prisma.ajuste.findUnique({
      where: { id: ajusteId },
      select: {
        tipoAjuste: true,
        numero: true,
        codigoAjuste: true,
        objeto: true,
        valorGlobal: true,
        responsavelNome: true,
        responsavelCargo: true,
        responsavelCpf: true,
        termosAditivos: { select: { valorAcrescido: true, valorSuprimido: true } },
        cliente: {
          select: {
            nome: true,
            codigoMunicipio: true,
            autoridadeNome: true,
            autoridadeCargo: true,
            autoridadeCpf: true,
            ordenadorNome: true,
            ordenadorCargo: true,
            ordenadorCpf: true,
          },
        },
        entidadeBeneficiaria: {
          select: {
            razaoSocial: true,
            /*
             * O presidente em exercício — quem assina pela entidade.
             *
             * Pelo **cargo**, e não pelo primeiro da lista: a diretoria tem
             * tesoureiro e secretário, e assinar com o nome errado é o defeito
             * que faz o termo voltar. `dataSaida: null` é o membro vigente;
             * `contains` pega "Presidente", "PRESIDENTE" e "Diretor
             * Presidente".
             *
             * Sem presidente cadastrado a folha sai com a linha em branco e a
             * tela diz onde preencher — nunca com o nome de outro membro, que
             * seria um chute num documento que alguém assina.
             */
            membrosDiretoria: {
              where: { cargo: { contains: 'presiden', mode: 'insensitive' }, dataSaida: null },
              select: { nome: true, cargo: true, cpf: true },
              orderBy: { dataEntrada: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!ajuste) return null;

    /*
     * Termo que instrui prestação de contas: a nota (1) do modelo manda pôr o
     * valor **repassado** e o exercício, no lugar do valor do ajuste.
     *
     * `RepassePrestacao` não é raiz de tenant — alcança o órgão pelo pai. A
     * soma parte do `prestacaoId` já conferido contra o ajuste (que é raiz),
     * então não há como somar repasse de outro órgão.
     */
    let valorRepassado: number | null = null;
    let exercicio: number | null = null;
    if (prestacaoId) {
      const prestacao = await prisma.prestacaoContas.findFirst({
        where: { id: prestacaoId, ajusteId },
        select: { ano: true },
      });
      if (prestacao) {
        exercicio = prestacao.ano;
        const soma = await prisma.repassePrestacao.aggregate({
          where: { prestacaoId },
          _sum: { valorRepasse: true },
        });
        valorRepassado = Number(soma._sum.valorRepasse ?? 0);
      }
    }

    const c = ajuste.cliente;
    const presidente = ajuste.entidadeBeneficiaria.membrosDiretoria[0];

    return {
      tipoAjuste: ajuste.tipoAjuste as TipoAjusteTcn,
      orgaoNome: c.nome,
      municipio: await this.municipioDe(c.codigoMunicipio),
      entidadeNome: ajuste.entidadeBeneficiaria.razaoSocial,
      // O número de origem é o que o modelo pede; o código do TCESP é reserva
      // para o ajuste que ainda não teve número próprio digitado.
      numeroAjuste: ajuste.numero?.trim() || ajuste.codigoAjuste,
      objeto: ajuste.objeto,
      valorAjuste: valorGlobalEfetivo(
        Number(ajuste.valorGlobal),
        ajuste.termosAditivos.map((t) => ({
          valorAcrescido: t.valorAcrescido === null ? null : Number(t.valorAcrescido),
          valorSuprimido: t.valorSuprimido === null ? null : Number(t.valorSuprimido),
        })),
      ),
      valorRepassado,
      exercicio,
      autoridadeOrgao: pessoa(
        c.autoridadeNome,
        c.autoridadeCargo,
        c.autoridadeCpf,
        'Cadastro do Órgão Concessor',
      ),
      ordenadorOrgao: pessoa(
        c.ordenadorNome,
        c.ordenadorCargo,
        c.ordenadorCpf,
        'Cadastro do Órgão Concessor',
      ),
      autoridadeEntidade: presidente
        ? pessoa(presidente.nome, presidente.cargo, presidente.cpf, 'Diretoria da entidade')
        : SEM_PESSOA,
      responsavelAjuste: pessoa(
        ajuste.responsavelNome,
        ajuste.responsavelCargo,
        ajuste.responsavelCpf,
        'Responsável pelo Ajuste',
      ),
    };
  }
}
