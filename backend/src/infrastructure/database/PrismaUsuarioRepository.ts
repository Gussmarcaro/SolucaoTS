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

/** Colunas do Prisma que retornamos ao domínio (sem senhaHash). */
const selecao = {
  id: true,
  clienteId: true,
  nome: true,
  documento: true,
  documentoTipo: true,
  cep: true,
  logradouro: true,
  bairro: true,
  cidade: true,
  uf: true,
  email: true,
  celular: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.UsuarioSelect;

type UsuarioRow = Prisma.UsuarioGetPayload<{ select: typeof selecao }>;

function toDomain(row: UsuarioRow): Usuario {
  return { ...row, documentoTipo: row.documentoTipo as 'CPF' | 'CNPJ' };
}

export class PrismaUsuarioRepository implements IUsuarioRepository {
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
        documentoTipo: dados.documentoTipo,
        cep: dados.cep,
        logradouro: dados.logradouro,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
        email: dados.email,
        celular: dados.celular,
        senhaHash: dados.senhaHash,
      },
      select: selecao,
    });
    return toDomain(row);
  }

  async buscarAuthPorEmail(email: string): Promise<UsuarioAuth | null> {
    const row = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, nome: true, email: true, senhaHash: true, ativo: true },
    });
    return row;
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

  async listar({ filtros, page, pageSize }: ListarUsuariosParams): Promise<Paginado<Usuario>> {
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
    };

    const [total, rows] = await Promise.all([
      prisma.usuario.count({ where }),
      prisma.usuario.findMany({
        where,
        select: selecao,
        orderBy: { criadoEm: 'desc' },
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
