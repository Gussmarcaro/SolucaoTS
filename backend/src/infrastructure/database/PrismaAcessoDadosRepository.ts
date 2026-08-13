import { prisma } from './prisma';
import { contextoAtual } from '@/shared/contexto';
import type { IAcessoDadosRepository } from '@/application/lgpd/RegistrarAcessoDadosUseCase';

/**
 * Grava o acesso a dados pessoais na mesma tabela da trilha de alterações.
 *
 * O autor e a rota saem do contexto da requisição, como no resto da auditoria —
 * o caso de uso não precisa receber o usuário e a regra de dependência
 * continua intacta.
 */
export class PrismaAcessoDadosRepository implements IAcessoDadosRepository {
  async registrar({ entidade, descricao }: { entidade: string; descricao: string }): Promise<void> {
    const ctx = contextoAtual();
    await prisma.registroAuditoria.create({
      data: {
        usuarioId: ctx?.usuarioId ?? null,
        usuarioNome: ctx?.usuarioNome ?? '(sistema)',
        entidade,
        // Não é o acesso a um registro específico, e sim à listagem; o id fica
        // com a marca da tela para a trilha não sugerir um registro que não foi.
        registroId: '(listagem)',
        registroDescricao: descricao,
        acao: 'VISUALIZACAO',
        alteracoes: {},
        rota: ctx?.rota ?? null,
      },
    });
  }
}
