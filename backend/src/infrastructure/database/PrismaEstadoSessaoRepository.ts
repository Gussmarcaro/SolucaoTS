import type { EstadoUsuario, IEstadoSessaoRepository } from '@/application/sessao/VerificarSessaoUseCase';
import { prisma } from './prisma';

/**
 * Consultas de identidade, feitas antes de existir contexto de órgão na
 * requisição — o usuário é procurado pelo id do token, sem recorte de tenant,
 * do mesmo jeito que o login faz.
 */
export class PrismaEstadoSessaoRepository implements IEstadoSessaoRepository {
  async usuario(id: string): Promise<EstadoUsuario | null> {
    const u = await prisma.usuario.findUnique({
      where: { id },
      select: { ativo: true, suporte: true, grupoUsuario: { select: { nome: true } } },
    });
    return u ? { ativo: u.ativo, suporte: u.suporte, grupoNome: u.grupoUsuario?.nome ?? null } : null;
  }

  async sessaoEncerrada(sessaoId: string): Promise<boolean> {
    const s = await prisma.sessaoAcesso.findUnique({ where: { id: sessaoId }, select: { logoutEm: true } });
    return !!s?.logoutEm;
  }
}
