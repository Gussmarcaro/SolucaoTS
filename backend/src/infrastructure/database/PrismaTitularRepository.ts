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
        select: { id: true, nome: true, email: true, celular: true, cidade: true, uf: true, ativo: true },
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

    return [
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
