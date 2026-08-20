import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { ICompromissoRepository } from '@/application/compromisso/ICompromissoRepository';
import type { DadosCompromisso, ListarCompromissosParams } from '@/application/compromisso/dtos';
import type { Compromisso, ResumoAgenda } from '@/core/compromisso/Compromisso';
import { expandirRecorrencia } from '@/core/compromisso/Compromisso';
import type { Espectador } from '@/core/compromisso/visibilidade';

const selecao = {
  id: true,
  tipo: true,
  titulo: true,
  pauta: true,
  inicioEm: true,
  fimEm: true,
  diaInteiro: true,
  local: true,
  cor: true,
  visibilidade: true,
  recorrencia: true,
  recorrenciaIntervalo: true,
  recorrenciaAte: true,
  status: true,
  registro: true,
  ajusteId: true,
  responsavelId: true,
  criadoPor: true,
  criadoEm: true,
  atualizadoEm: true,
  ajuste: {
    select: { codigoAjuste: true, entidadeBeneficiaria: { select: { razaoSocial: true } } },
  },
  responsavel: { select: { nome: true } },
  participantes: { select: { usuarioId: true, usuario: { select: { nome: true } } } },
  grupos: { select: { grupoId: true, grupo: { select: { nome: true } } } },
  alertas: { select: { id: true, minutosAntes: true, canal: true } },
  _count: { select: { tarefas: true } },
} satisfies Prisma.CompromissoSelect;

type Row = Prisma.CompromissoGetPayload<{ select: typeof selecao }>;

function toDomain(row: Row): Compromisso {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    pauta: row.pauta,
    inicioEm: row.inicioEm.toISOString(),
    fimEm: row.fimEm.toISOString(),
    diaInteiro: row.diaInteiro,
    local: row.local,
    cor: row.cor,
    visibilidade: row.visibilidade,
    recorrencia: row.recorrencia,
    recorrenciaIntervalo: row.recorrenciaIntervalo,
    recorrenciaAte: row.recorrenciaAte?.toISOString() ?? null,
    status: row.status,
    registro: row.registro,
    ajusteId: row.ajusteId,
    ajusteCodigo: row.ajuste?.codigoAjuste ?? null,
    entidadeNome: row.ajuste?.entidadeBeneficiaria?.razaoSocial ?? null,
    responsavelId: row.responsavelId,
    responsavelNome: row.responsavel?.nome ?? null,
    participantes: row.participantes.map((p) => ({ id: p.usuarioId, nome: p.usuario.nome })),
    grupos: row.grupos.map((g) => ({ id: g.grupoId, nome: g.grupo.nome })),
    alertas: row.alertas,
    tarefas: row._count.tarefas,
    criadoPor: row.criadoPor,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

/**
 * A regra de visibilidade, em SQL.
 *
 * É a tradução do `podeVer` do core — e a **única** que protege de fato, porque
 * roda no banco. Se as duas divergirem, `verificar:agenda` é onde aparece: ele
 * exercita os mesmos casos contra a função pura.
 *
 * `PARTICULAR` não aparece em nenhum ramo além do primeiro: só o criador o
 * alcança, e é isso que faz "nem administrador vê" ser verdade no SQL, não
 * apenas na tela.
 */
function filtroDeVisibilidade(quem: Espectador): Prisma.CompromissoWhereInput {
  const ramos: Prisma.CompromissoWhereInput[] = [
    { criadoPor: quem.usuarioId },
    { visibilidade: 'ORGAO' },
    { visibilidade: 'RESTRITO', participantes: { some: { usuarioId: quem.usuarioId } } },
  ];
  if (quem.grupoId)
    ramos.push({ visibilidade: 'RESTRITO', grupos: { some: { grupoId: quem.grupoId } } });
  return { OR: ramos };
}

/** Vínculos e alertas são substituídos por inteiro — ver `gravarVinculos`. */
function dadosDoCompromisso(d: DadosCompromisso) {
  return {
    tipo: d.tipo,
    titulo: d.titulo,
    pauta: d.pauta,
    inicioEm: d.inicioEm,
    fimEm: d.fimEm,
    diaInteiro: d.diaInteiro,
    local: d.local,
    cor: d.cor,
    visibilidade: d.visibilidade,
    recorrencia: d.recorrencia,
    recorrenciaIntervalo: d.recorrenciaIntervalo,
    recorrenciaAte: d.recorrenciaAte,
    ajusteId: d.ajusteId,
    responsavelId: d.responsavelId,
    status: d.status,
    registro: d.registro,
  };
}

export class PrismaCompromissoRepository implements ICompromissoRepository {
  async grupoDoUsuario(usuarioId: string): Promise<string | null> {
    const u = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { grupoUsuarioId: true },
    });
    return u?.grupoUsuarioId ?? null;
  }

  async buscarVisivel(id: string, quem: Espectador): Promise<Compromisso | null> {
    // O filtro entra **na consulta**: "não é seu" e "não existe" produzem a
    // mesma resposta, sem o código de cima precisar decidir isso.
    const row = await prisma.compromisso.findFirst({
      where: { AND: [{ id }, filtroDeVisibilidade(quem)] },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async buscarParaAutorizacao(id: string) {
    const row = await prisma.compromisso.findUnique({
      where: { id },
      select: {
        id: true,
        visibilidade: true,
        criadoPor: true,
        responsavelId: true,
        participantes: { select: { usuarioId: true } },
        grupos: { select: { grupoId: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      visibilidade: row.visibilidade,
      criadoPor: row.criadoPor,
      responsavelId: row.responsavelId,
      participantesIds: row.participantes.map((p) => p.usuarioId),
      gruposIds: row.grupos.map((g) => g.grupoId),
    };
  }

  async criar(d: DadosCompromisso): Promise<Compromisso> {
    const row = await prisma.compromisso.create({
      data: {
        ...dadosDoCompromisso(d),
        participantes: { create: d.participantes.map((usuarioId) => ({ usuarioId })) },
        grupos: { create: d.grupos.map((grupoId) => ({ grupoId })) },
        alertas: { create: d.alertas },
      },
      select: selecao,
    });
    return toDomain(row);
  }

  /**
   * Atualiza substituindo os vínculos por inteiro.
   *
   * Calcular o diff de participantes daria uma linha de auditoria mais fina,
   * mas trocaria uma operação previsível por três (incluir, remover, manter) —
   * e a trilha já registra o antes e o depois do compromisso. Alertas seguem a
   * mesma regra; recriar zera `enviadoEm`, o que é correto: mudou o lembrete,
   * ele volta a valer.
   */
  async atualizar(id: string, d: DadosCompromisso): Promise<Compromisso> {
    const [, , , row] = await prisma.$transaction([
      prisma.compromissoParticipante.deleteMany({ where: { compromissoId: id } }),
      prisma.compromissoGrupo.deleteMany({ where: { compromissoId: id } }),
      prisma.compromissoAlerta.deleteMany({ where: { compromissoId: id } }),
      prisma.compromisso.update({
        where: { id },
        data: {
          ...dadosDoCompromisso(d),
          participantes: { create: d.participantes.map((usuarioId) => ({ usuarioId })) },
          grupos: { create: d.grupos.map((grupoId) => ({ grupoId })) },
          alertas: { create: d.alertas },
        },
        select: selecao,
      }),
    ]);
    return toDomain(row);
  }

  async excluir(id: string): Promise<void> {
    await prisma.compromisso.delete({ where: { id } });
  }

  async ajusteExiste(ajusteId: string): Promise<boolean> {
    return (await prisma.ajuste.count({ where: { id: ajusteId } })) > 0;
  }

  async usuariosExistem(ids: string[]): Promise<boolean> {
    const unicos = [...new Set(ids)];
    return (await prisma.usuario.count({ where: { id: { in: unicos } } })) === unicos.length;
  }

  async gruposExistem(ids: string[]): Promise<boolean> {
    const unicos = [...new Set(ids)];
    return (await prisma.grupoUsuario.count({ where: { id: { in: unicos } } })) === unicos.length;
  }

  async contarTarefas(id: string): Promise<number> {
    return prisma.tarefa.count({ where: { compromissoId: id } });
  }

  async listar({ filtros, espectador, limite }: ListarCompromissosParams): Promise<Compromisso[]> {
    const de = filtros.de!;
    const ate = filtros.ate!;

    const where: Prisma.CompromissoWhereInput = {
      AND: [
        filtroDeVisibilidade(espectador),
        {
          tipo: filtros.tipo,
          status: filtros.status,
          ajusteId: filtros.ajusteId,
          responsavelId: filtros.responsavelId,
          participantes: filtros.participanteId
            ? { some: { usuarioId: filtros.participanteId } }
            : undefined,
          grupos: filtros.grupoId ? { some: { grupoId: filtros.grupoId } } : undefined,
        },
        {
          // Duas formas de tocar a janela: o compromisso em si cai nela, ou é
          // recorrente e começou antes, podendo repetir dentro. O segundo ramo
          // é o que a expansão abaixo resolve.
          OR: [
            { recorrencia: 'NAO_REPETE', inicioEm: { lte: ate }, fimEm: { gte: de } },
            {
              recorrencia: { not: 'NAO_REPETE' },
              inicioEm: { lte: ate },
              OR: [{ recorrenciaAte: null }, { recorrenciaAte: { gte: de } }],
            },
          ],
        },
      ],
    };

    if (filtros.pendentesDeRegistro) {
      (where.AND as Prisma.CompromissoWhereInput[]).push({
        status: 'AGENDADO',
        inicioEm: { lt: new Date() },
      });
    }

    if (filtros.busca) {
      const t = filtros.busca;
      (where.AND as Prisma.CompromissoWhereInput[]).push({
        OR: [
          { titulo: { contains: t, mode: 'insensitive' } },
          { pauta: { contains: t, mode: 'insensitive' } },
          { local: { contains: t, mode: 'insensitive' } },
          { ajuste: { codigoAjuste: { contains: t, mode: 'insensitive' } } },
        ],
      });
    }

    const rows = await prisma.compromisso.findMany({
      where,
      select: selecao,
      orderBy: { inicioEm: 'asc' },
      take: limite,
    });

    // Expansão da recorrência: cada linha vira uma ou mais ocorrências dentro
    // da janela. Feita aqui, e não no banco, porque a regra de calendário
    // (meses de 31 dias, fevereiro) é aritmética de data, não de SQL.
    const saida: Compromisso[] = [];
    for (const row of rows) {
      const base = toDomain(row);
      const ocorrencias = expandirRecorrencia(
        {
          inicioEm: row.inicioEm,
          fimEm: row.fimEm,
          recorrencia: row.recorrencia,
          recorrenciaIntervalo: row.recorrenciaIntervalo,
          recorrenciaAte: row.recorrenciaAte,
        },
        { de, ate },
      );
      for (const o of ocorrencias) {
        const ehOriginal = o.inicioEm.getTime() === row.inicioEm.getTime();
        saida.push({
          ...base,
          inicioEm: o.inicioEm.toISOString(),
          fimEm: o.fimEm.toISOString(),
          ocorrencia: !ehOriginal,
        });
      }
    }

    return saida.sort((a, b) => a.inicioEm.localeCompare(b.inicioEm));
  }

  async resumo(quem: Espectador, agora: Date): Promise<ResumoAgenda> {
    const inicioDoDia = new Date(agora);
    inicioDoDia.setHours(0, 0, 0, 0);
    const fimDoDia = new Date(agora);
    fimDoDia.setHours(23, 59, 59, 999);

    const meu = filtroDeVisibilidade(quem);
    const contar = (extra: Prisma.CompromissoWhereInput) =>
      prisma.compromisso.count({ where: { AND: [meu, extra] } });

    // As contagens ignoram a recorrência de propósito: contar repetições
    // futuras de uma reunião semanal "sem fim" daria um número sem significado.
    const [proximos, hoje, pendentesDeRegistro, realizados] = await Promise.all([
      contar({ status: 'AGENDADO', inicioEm: { gte: agora } }),
      contar({ status: 'AGENDADO', inicioEm: { gte: inicioDoDia, lte: fimDoDia } }),
      contar({ status: 'AGENDADO', inicioEm: { lt: agora } }),
      contar({ status: 'REALIZADO' }),
    ]);

    return { proximos, hoje, pendentesDeRegistro, realizados };
  }
}
