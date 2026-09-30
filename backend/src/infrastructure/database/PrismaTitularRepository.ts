import { prisma } from './prisma';
import { paraDataISO } from '@/shared/datas';
import type {
  ITitularRepository,
  OcorrenciaTitular,
} from '@/application/lgpd/ConsultarTitularUseCase';

const iso = (d: Date | null) => (d ? paraDataISO(d) : null);

/**
 * Varredura por CPF em todos os cadastros que guardam pessoa física.
 *
 * As consultas correm em paralelo e cada uma devolve só o que interessa ao
 * relatório do titular — nada de `select` aberto, para o relatório não virar um
 * despejo do registro inteiro.
 */
export class PrismaTitularRepository implements ITitularRepository {
  async ocorrenciasPorCpf(cpf: string): Promise<OcorrenciaTitular[]> {
    const [
      usuarios,
      fornecedores,
      colaboradores,
      servidores,
      diretoria,
      conselhos,
      ajustes,
      empregados,
      servidoresPrestacao,
      empenhos,
      documentosFiscais,
    ] = await Promise.all([
      prisma.usuario.findMany({
        where: { documento: cpf },
        // `fotoAtualizadaEm` entra aqui porque **fotografia é dado pessoal**, e
        // o relatório do titular tem de declarar o que o sistema guarda dele.
        // Vai como carimbo, nunca como imagem: o relatório diz *que existe uma
        // foto*, não a devolve — um relatório de acesso que carrega o rosto da
        // pessoa vira o vazamento que ele deveria prevenir.
        select: {
          id: true,
          nome: true,
          email: true,
          celular: true,
          cidade: true,
          uf: true,
          fotoAtualizadaEm: true,
          ativo: true,
        },
      }),
      prisma.fornecedor.findMany({
        where: { documento: cpf, documentoTipo: 'CPF' },
        select: { id: true, nome: true, email: true, cidade: true, uf: true, ativo: true },
      }),
      prisma.colaborador.findMany({
        where: { cpf },
        select: { id: true, nome: true, cargo: true, cbo: true, cns: true, dataAdmissao: true, ativo: true },
      }),
      prisma.servidorCedidoCadastro.findMany({
        where: { cpf },
        select: { id: true, nome: true, cargoPublico: true, funcaoEntidade: true, ativo: true },
      }),
      prisma.membroDiretoria.findMany({
        where: { cpf },
        select: { id: true, nome: true, cargo: true, email: true, telefone: true, dataEntrada: true },
      }),
      prisma.membroConselho.findMany({
        where: { cpf },
        select: { id: true, nome: true, tipoConselho: true, cargo: true, email: true, dataEntrada: true },
      }),
      prisma.ajuste.findMany({
        where: { responsavelCpf: cpf },
        select: { id: true, codigoAjuste: true, responsavelNome: true, responsavelCargo: true, responsavelEmail: true },
      }),
      prisma.relacaoEmpregado.findMany({
        where: { cpf },
        select: { id: true, cbo: true, cns: true, dataAdmissao: true, salarioContratual: true, prestacaoId: true },
      }),
      prisma.servidorCedido.findMany({
        where: { cpf },
        select: { id: true, cargoPublico: true, funcaoEntidade: true, prestacaoId: true },
      }),
      prisma.empenhoPrestacao.findMany({
        where: { cpfOrdenadorDespesa: cpf },
        select: { id: true, numero: true, dataEmissao: true, prestacaoId: true },
      }),
      prisma.documentoFiscal.findMany({
        where: { credorNumeroDoc: cpf, credorTipoDoc: 'CPF' },
        select: { id: true, numero: true, credorNome: true, dataEmissao: true, prestacaoId: true },
      }),
    ]);

    /*
     * Histórico de acessos do titular.
     *
     * Não entra na varredura acima porque `SessaoAcesso` não guarda CPF — é
     * chegada pelo `usuarioId` de quem a varredura já encontrou. Precisa
     * constar: "quando esta pessoa entrou no sistema, de onde e em que
     * navegador" é dado pessoal dela, e um relatório de titular que o omitisse
     * declararia menos do que o sistema de fato guarda.
     *
     * Vai como **resumo**, nunca como lista: devolver cada logon com IP faria
     * o relatório crescer sem limite e transformaria um pedido de transparência
     * num despejo. Quem quiser o detalhe tem a tela do histórico.
     */
    const acessos = usuarios.length
      ? await prisma.sessaoAcesso.groupBy({
          by: ['usuarioId'],
          where: { usuarioId: { in: usuarios.map((u) => u.id) } },
          _count: { _all: true },
          _max: { logonEm: true },
        })
      : [];
    const acessoPorUsuario = new Map(acessos.map((a) => [a.usuarioId, a]));

    return [
      ...usuarios.flatMap((u): OcorrenciaTitular[] => {
        const a = acessoPorUsuario.get(u.id);
        if (!a) return [];
        return [
          {
            origem: 'Histórico de acessos',
            entidade: 'SessaoAcesso',
            registroId: u.id,
            descricao: u.nome,
            dados: {
              acessos: String(a._count._all),
              ultimoAcesso: a._max.logonEm ? a._max.logonEm.toISOString() : '—',
              registrado: 'data e hora de entrada e saída, endereço de origem e navegador',
            },
          },
        ];
      }),
      ...usuarios.map((u): OcorrenciaTitular => ({
        origem: 'Usuário do sistema',
        entidade: 'Usuario',
        registroId: u.id,
        descricao: u.nome,
        dados: { nome: u.nome, email: u.email, celular: u.celular, cidade: `${u.cidade}/${u.uf}`, ativo: String(u.ativo) },
      })),
      ...fornecedores.map((f): OcorrenciaTitular => ({
        origem: 'Fornecedor / Prestador',
        entidade: 'Fornecedor',
        registroId: f.id,
        descricao: f.nome,
        dados: { nome: f.nome, email: f.email, cidade: `${f.cidade}/${f.uf}`, ativo: String(f.ativo) },
      })),
      ...colaboradores.map((c): OcorrenciaTitular => ({
        origem: 'Colaborador',
        entidade: 'Colaborador',
        registroId: c.id,
        descricao: c.nome,
        dados: {
          nome: c.nome,
          cargo: c.cargo,
          cbo: c.cbo,
          cns: c.cns,
          admissao: iso(c.dataAdmissao),
          ativo: String(c.ativo),
        },
      })),
      ...servidores.map((s): OcorrenciaTitular => ({
        origem: 'Servidor cedido (cadastro)',
        entidade: 'ServidorCedidoCadastro',
        registroId: s.id,
        descricao: s.nome,
        dados: { nome: s.nome, cargoPublico: s.cargoPublico, funcaoEntidade: s.funcaoEntidade, ativo: String(s.ativo) },
      })),
      ...diretoria.map((m): OcorrenciaTitular => ({
        origem: 'Membro da diretoria',
        entidade: 'MembroDiretoria',
        registroId: m.id,
        descricao: m.nome,
        dados: { nome: m.nome, cargo: m.cargo, email: m.email, telefone: m.telefone, entrada: iso(m.dataEntrada) },
      })),
      ...conselhos.map((m): OcorrenciaTitular => ({
        origem: 'Membro de conselho',
        entidade: 'MembroConselho',
        registroId: m.id,
        descricao: m.nome,
        dados: { nome: m.nome, conselho: m.tipoConselho, cargo: m.cargo, email: m.email, entrada: iso(m.dataEntrada) },
      })),
      ...ajustes.map((a): OcorrenciaTitular => ({
        origem: 'Responsável pelo ajuste',
        entidade: 'Ajuste',
        registroId: a.id,
        descricao: `Ajuste ${a.codigoAjuste}`,
        dados: { nome: a.responsavelNome, cargo: a.responsavelCargo, email: a.responsavelEmail },
      })),
      ...empregados.map((e): OcorrenciaTitular => ({
        origem: 'Relação de empregados (prestação)',
        entidade: 'RelacaoEmpregado',
        registroId: e.id,
        descricao: `Prestação ${e.prestacaoId}`,
        dados: {
          cbo: e.cbo,
          cns: e.cns,
          admissao: iso(e.dataAdmissao),
          salarioContratual: Number(e.salarioContratual),
        },
      })),
      ...servidoresPrestacao.map((s): OcorrenciaTitular => ({
        origem: 'Servidores cedidos (prestação)',
        entidade: 'ServidorCedido',
        registroId: s.id,
        descricao: `Prestação ${s.prestacaoId}`,
        dados: { cargoPublico: s.cargoPublico, funcaoEntidade: s.funcaoEntidade },
      })),
      ...empenhos.map((e): OcorrenciaTitular => ({
        origem: 'Ordenador de despesa (empenho)',
        entidade: 'EmpenhoPrestacao',
        registroId: e.id,
        descricao: `Empenho ${e.numero}`,
        dados: { numero: e.numero, emissao: iso(e.dataEmissao) },
      })),
      ...documentosFiscais.map((d): OcorrenciaTitular => ({
        origem: 'Credor de documento fiscal',
        entidade: 'DocumentoFiscal',
        registroId: d.id,
        descricao: `Documento ${d.numero}`,
        dados: { credorNome: d.credorNome, emissao: iso(d.dataEmissao) },
      })),
    ];
  }
}
