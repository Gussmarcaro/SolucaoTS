import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { IUsuarioRepository } from '@/application/usuario/IUsuarioRepository';
import type {
  ListarUsuariosParams,
  NovoUsuarioDTO,
  Paginado,
  UsuarioAuth,
} from '@/application/usuario/dtos';
import type { Usuario } from '@/core/usuario/Usuario';
import { apenasDigitos } from '@/shared/validators/documento';
import { normalizarTexto } from '@/shared/normalizar';
import { buscaUsuario } from './buscaTexto';
import type { DadosUsuario } from '@/application/usuario/validarUsuario';

/** Colunas do Prisma que retornamos ao domínio (sem senhaHash). */
const selecao = {
  id: true,
  clienteId: true,
  grupoUsuarioId: true,
  nome: true,
  documento: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
  email: true,
  celular: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
  grupoUsuario: { select: { nome: true } },
  cliente: { select: { nome: true } },
} satisfies Prisma.UsuarioSelect;

type UsuarioRow = Prisma.UsuarioGetPayload<{ select: typeof selecao }>;

function toDomain(row: UsuarioRow): Usuario {
  const { grupoUsuario, cliente, ...rest } = row;
  return {
    ...rest,
    orgaoNome: cliente?.nome ?? null,
    grupoNome: grupoUsuario?.nome ?? null,
  };
}

export class PrismaUsuarioRepository implements IUsuarioRepository {
  async buscarPorId(id: string): Promise<Usuario | null> {
    const row = await prisma.usuario.findUnique({ where: { id }, select: selecao });
    return row ? toDomain(row) : null;
  }

  async buscarPorDocumento(documento: string): Promise<Usuario | null> {
    const row = await prisma.usuario.findUnique({
      where: { documento: apenasDigitos(documento) },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const row = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: selecao,
    });
    return row ? toDomain(row) : null;
  }

  async criar(dados: NovoUsuarioDTO): Promise<Usuario> {
    const row = await prisma.usuario.create({
      data: {
        nome: dados.nome,
        documento: dados.documento,
        grupoUsuarioId: dados.grupoUsuarioId,
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
        email: dados.email,
        celular: dados.celular,
        senhaHash: dados.senhaHash,
        buscaTexto: buscaUsuario(dados),
      },
      select: selecao,
    });
    return toDomain(row);
  }

  async atualizar(id: string, dados: DadosUsuario, senhaHash?: string): Promise<Usuario> {
    const row = await prisma.usuario.update({
      where: { id },
      data: {
        nome: dados.nome,
        documento: dados.documento,
        grupoUsuarioId: dados.grupoUsuarioId,
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
        email: dados.email,
        celular: dados.celular,
        buscaTexto: buscaUsuario(dados),
        ...(senhaHash ? { senhaHash } : {}),
      },
      select: selecao,
    });
    return toDomain(row);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Usuario> {
    const row = await prisma.usuario.update({ where: { id }, data: { ativo }, select: selecao });
    return toDomain(row);
  }

  async buscarAuthPorEmail(email: string): Promise<UsuarioAuth | null> {
    const row = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        nome: true,
        email: true,
        senhaHash: true,
        ativo: true,
        clienteId: true,
        suporte: true,
        grupoUsuario: { select: { nome: true } },
      },
    });
    return row ? { ...row, grupoNome: row.grupoUsuario?.nome ?? null } : null;
  }

  async definirResetToken(id: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
    });
  }

  async buscarPorResetTokenHash(
    tokenHash: string,
  ): Promise<{ id: string; resetTokenExpiresAt: Date | null } | null> {
    return prisma.usuario.findFirst({
      where: { resetTokenHash: tokenHash },
      select: { id: true, resetTokenExpiresAt: true },
    });
  }

  async atualizarSenhaELimparReset(id: string, senhaHash: string): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { senhaHash, resetTokenHash: null, resetTokenExpiresAt: null },
    });
  }

  async listar({ filtros, busca, ordem, page, pageSize }: ListarUsuariosParams): Promise<Paginado<Usuario>> {
    const texto = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: v, mode: 'insensitive' } : undefined;
    const digitos = (v?: string): Prisma.StringFilter | undefined =>
      v ? { contains: apenasDigitos(v) } : undefined;

    const where: Prisma.UsuarioWhereInput = {
      nome: texto(filtros.nome),
      documento: digitos(filtros.documento),
      cep: digitos(filtros.cep),
      celular: digitos(filtros.celular),
      logradouro: texto(filtros.logradouro),
      bairro: texto(filtros.bairro),
      cidade: texto(filtros.cidade),
      email: texto(filtros.email),
      uf: filtros.uf ? { equals: filtros.uf.toUpperCase() } : undefined,
      ativo: typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined,
    };

    // Busca global insensível a acento/caixa: casa no campo normalizado (buscaTexto)
    // e, para dígitos, direto nos campos numéricos (documento/CEP/celular).
    if (busca) {
      const t = normalizarTexto(busca);
      const d = apenasDigitos(busca);
      const ors: Prisma.UsuarioWhereInput[] = [];
      if (t) ors.push({ buscaTexto: { contains: t } });
      if (d) ors.push({ documento: { contains: d } }, { cep: { contains: d } }, { celular: { contains: d } });
      if (ors.length) where.OR = ors;
    }

    const [total, rows] = await Promise.all([
      prisma.usuario.count({ where }),
      prisma.usuario.findMany({
        where,
        select: selecao,
        orderBy: ordem
          ? ({ [ordem.campo]: ordem.direcao } as Prisma.UsuarioOrderByWithRelationInput)
          : { criadoEm: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map(toDomain),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
