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
}

const so = (valor: string | null | undefined) => valor?.trim() || null;

/**
 * Busca global da barra superior.
 *
 * Não tem consulta própria: chama o `listar` de cada cadastro com o termo, que é
 * a mesma busca já usada nas grades — normalizada, sem acento e com dígitos
 * tratados. Assim o que a barra encontra é exatamente o que a grade encontraria,
 * e uma melhoria na busca de um cadastro vale aqui de graça.
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

    const [ajustes, prestacoes, entidades, fornecedores, colaboradores, contratos, bens, servidores, orgaos] =
      await Promise.allSettled([
        r.ajustes.listar({ ...pagina, filtros: {} }),
        r.prestacoes.listar({ ...pagina, filtros: {} }),
        r.entidades.listar({ ...pagina, filtros: {} }),
        r.fornecedores.listar({ ...pagina, filtros: {} }),
        r.colaboradores.listar({ ...pagina, filtros: {} }),
        r.contratos.listar({ ...pagina, filtros: {} }),
        r.bens.listar({ ...pagina, filtros: {} }),
        r.servidores.listar({ ...pagina, filtros: {} }),
        r.orgaos.listar({ ...pagina, filtros: {} }),
      ]);

    const itens = <T>(res: PromiseSettledResult<{ data: T[] }>): T[] =>
      res.status === 'fulfilled' ? res.value.data : [];

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
      ...itens(orgaos).map((o): ResultadoBusca => ({
        tipo: 'ORGAO',
        id: o.id,
        titulo: o.nome,
        subtitulo: `mun. ${o.codigoMunicipio} · ent. ${o.codigoEntidade}`,
      })),
    ];
  }
}
