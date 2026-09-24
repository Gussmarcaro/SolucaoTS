import type { ResultadoBusca } from '@/core/busca/ResultadoBusca';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { IEntidadeRepository } from '@/application/entidade/IEntidadeRepository';
import type { IFornecedorRepository } from '@/application/fornecedor/IFornecedorRepository';
import type { IColaboradorRepository } from '@/application/colaborador/IColaboradorRepository';
import type { IContratoRepository } from '@/application/contrato/IContratoRepository';
import type { IBemCedidoRepository } from '@/application/bemCedido/IBemCedidoRepository';
import type { IServidorCedidoRepository } from '@/application/servidorCedido/IServidorCedidoRepository';
import type { IClienteRepository } from '@/application/cliente/IClienteRepository';
import type { IDocumentoFiscalRepository } from '@/application/documentoFiscal/IDocumentoFiscalRepository';
import type { IPagamentoRepository } from '@/application/pagamento/IPagamentoRepository';
import type { IContaBancariaRepository } from '@/application/contaBancaria/IContaBancariaRepository';
import type { IGuiaRecolhimentoRepository } from '@/application/guiaRecolhimento/IGuiaRecolhimentoRepository';

/** Abaixo disso a busca devolve ruído: "a" casaria com quase tudo. */
export const MINIMO_CARACTERES = 2;

/** Itens por tipo. O suficiente para reconhecer o que se procura sem rolar. */
const POR_TIPO = 5;

interface Repositorios {
  ajustes: IAjusteRepository;
  prestacoes: IPrestacaoRepository;
  entidades: IEntidadeRepository;
  fornecedores: IFornecedorRepository;
  colaboradores: IColaboradorRepository;
  contratos: IContratoRepository;
  bens: IBemCedidoRepository;
  servidores: IServidorCedidoRepository;
  orgaos: IClienteRepository;
  despesas: IDocumentoFiscalRepository;
  pagamentos: IPagamentoRepository;
  contas: IContaBancariaRepository;
  guias: IGuiaRecolhimentoRepository;
}

const so = (valor: string | null | undefined) => valor?.trim() || null;

/**
 * Busca global da barra superior.
 *
 * **Cadastros** não têm consulta própria: a busca chama o `listar` de cada um
 * com o termo, que é a mesma busca já usada nas grades — normalizada, sem
 * acento e com dígitos tratados. Assim o que a barra encontra é exatamente o
 * que a grade encontraria, e uma melhoria na busca de um cadastro vale aqui de
 * graça.
 *
 * **Lançamentos** entraram por método próprio (`buscarGlobal`), porque cada um
 * tem `listar` de formato diferente e nenhum aceita termo — torcer os quatro
 * para caber na assinatura dos cadastros daria uma interface que tela nenhuma
 * usa.
 *
 * O critério para entrar é ter **identificador próprio**, algo que alguém tem
 * na mão e digita: número da nota, apelido da conta, número da guia, número da
 * transação do pagamento.
 *
 * `Receita` continua fora por não ter nenhum — é tipo + valor, e se encontra
 * pelo ajuste. A conciliação bancária também, por outro motivo: é a maior
 * tabela do sistema, o texto dela vem do banco ("TED RECEBIDA"), e o trajeto
 * real até uma linha de extrato começa na tela de Conciliação. Uma busca que
 * devolve o que ninguém procurava ensina a não usá-la, e aí perde-se também o
 * que ela fazia bem.
 *
 * As consultas correm em paralelo com `allSettled`: um cadastro fora do ar
 * derruba só a própria seção, não a busca inteira.
 */
export class BuscarGlobalUseCase {
  constructor(private readonly repos: Repositorios) {}

  async execute(termo: string): Promise<ResultadoBusca[]> {
    const busca = termo?.trim() ?? '';
    if (busca.length < MINIMO_CARACTERES) return [];

    const pagina = { busca, page: 1, pageSize: POR_TIPO };
    const r = this.repos;

    // A ordem dos nomes segue a das consultas abaixo, uma a uma. É posicional:
    // trocar a ordem de uma sem trocar a outra liga o resultado errado ao tipo
    // errado — foi o que o typecheck pegou na primeira versão disto.
    const [ajustes, prestacoes, entidades, fornecedores, colaboradores, contratos, bens, servidores, despesas, pagamentos, contas, guias, orgaos] =
      await Promise.allSettled([
        r.ajustes.listar({ ...pagina, filtros: {} }),
        r.prestacoes.listar({ ...pagina, filtros: {} }),
        r.entidades.listar({ ...pagina, filtros: {} }),
        r.fornecedores.listar({ ...pagina, filtros: {} }),
        r.colaboradores.listar({ ...pagina, filtros: {} }),
        r.contratos.listar({ ...pagina, filtros: {} }),
        r.bens.listar({ ...pagina, filtros: {} }),
        r.servidores.listar({ ...pagina, filtros: {} }),
        // Os lançamentos têm método próprio: os três têm `listar` de formatos
        // diferentes, e torcer os três para caber na assinatura dos cadastros
        // daria uma interface que nenhuma tela usa.
        r.despesas.buscarGlobal(busca, POR_TIPO),
        r.pagamentos.buscarGlobal(busca, POR_TIPO),
        r.contas.buscarGlobal(busca, POR_TIPO),
        r.guias.buscarGlobal(busca, POR_TIPO),
        r.orgaos.listar({ ...pagina, filtros: {} }),
      ]);

    const itens = <T>(res: PromiseSettledResult<{ data: T[] }>): T[] =>
      res.status === 'fulfilled' ? res.value.data : [];

    // Os lançamentos devolvem a lista direta; os cadastros, uma página com
    // `data`. Dois auxiliares em vez de um formato só: embrulhar o retorno dos
    // lançamentos num objeto de paginação fingiria uma paginação que eles não
    // têm — a busca pede as cinco primeiras e pronto.
    const lista = <T>(res: PromiseSettledResult<T[]>): T[] =>
      res.status === 'fulfilled' ? res.value : [];

    return [
      ...itens(ajustes).map((a): ResultadoBusca => ({
        tipo: 'AJUSTE',
        id: a.id,
        titulo: so(a.descricaoResumida) ?? a.codigoAjuste,
        subtitulo: so(a.descricaoResumida) ? `${a.codigoAjuste} · ${a.entidadeNome}` : a.entidadeNome,
      })),
      ...itens(prestacoes).map((p): ResultadoBusca => ({
        tipo: 'PRESTACAO',
        id: p.id,
        titulo: `${p.ajusteCodigo} · exercício ${p.ano}`,
        subtitulo: p.entidadeNome,
      })),
      ...itens(entidades).map((e): ResultadoBusca => ({
        tipo: 'ENTIDADE',
        id: e.id,
        titulo: e.razaoSocial,
        subtitulo: so(e.nomeFantasia) ?? e.cnpj,
      })),
      ...itens(fornecedores).map((f): ResultadoBusca => ({
        tipo: 'FORNECEDOR',
        id: f.id,
        titulo: f.nome,
        subtitulo: f.documento,
      })),
      ...itens(colaboradores).map((c): ResultadoBusca => ({
        tipo: 'COLABORADOR',
        id: c.id,
        titulo: c.nome,
        subtitulo: c.cargo,
      })),
      ...itens(contratos).map((c): ResultadoBusca => ({
        tipo: 'CONTRATO',
        id: c.id,
        titulo: `Contrato ${c.numero}`,
        subtitulo: c.credorNome,
      })),
      ...itens(bens).map((b): ResultadoBusca => ({
        tipo: 'BEM_CEDIDO',
        id: b.id,
        titulo: b.descricao,
        subtitulo: `${b.tipo} · ${b.identificador}`,
      })),
      ...itens(servidores).map((s): ResultadoBusca => ({
        tipo: 'SERVIDOR_CEDIDO',
        id: s.id,
        titulo: s.nome,
        subtitulo: s.cargoPublico,
      })),
      // O título é o **número da nota**, porque é por ele que se procura: quem
      // tem o papel na mão quer confirmar se ele já foi lançado.
      ...lista(despesas).map((d): ResultadoBusca => ({
        tipo: 'DESPESA',
        id: d.id,
        titulo: `Nota ${d.numero}`,
        subtitulo: so(d.credorNome) ?? d.credorNumeroDoc,
      })),
      /*
       * O pagamento se identifica pelo **valor e pela data**, não pelo número
       * da transação — esse é a chave de busca, não o rótulo. Quem digitou o
       * número do TED já o conhece; o que ele quer ver é quanto saiu, quando, e
       * de qual nota.
       */
      ...lista(pagamentos).map((p): ResultadoBusca => ({
        tipo: 'PAGAMENTO',
        id: p.id,
        titulo: `${p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${p.dataPagamento.split('-').reverse().join('/')}`,
        subtitulo: p.documentoNumero ? `Nota ${p.documentoNumero}` : 'Folha ordinária',
      })),
      // O apelido primeiro, e os números como apoio: a conta é reconhecida por
      // "Repasse Saúde", não por "001 / 1234 / 56789-0".
      ...lista(contas).map((c): ResultadoBusca => ({
        tipo: 'CONTA_BANCARIA',
        id: c.id,
        titulo: so(c.apelido) ?? `Conta ${c.conta}`,
        subtitulo: `${c.banco} · ag. ${c.agencia} · c/ ${c.conta}`,
      })),
      ...lista(guias).map((g): ResultadoBusca => ({
        tipo: 'GUIA_RECOLHIMENTO',
        id: g.id,
        titulo: `${g.tipo} · ${String(g.mes).padStart(2, '0')}/${g.ano}`,
        subtitulo: so(g.numeroDocumento) ?? 'Sem número de documento',
      })),
      ...itens(orgaos).map((o): ResultadoBusca => ({
        tipo: 'ORGAO',
        id: o.id,
        titulo: o.nome,
        subtitulo: `mun. ${o.codigoMunicipio} · ent. ${o.codigoEntidade}`,
      })),
    ];
  }
}
