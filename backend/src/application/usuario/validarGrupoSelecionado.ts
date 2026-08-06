import type { IGrupoRepository } from '@/application/grupo/IGrupoRepository';
import { BusinessError } from '@/shared/errors';

/**
 * Valida o grupo escolhido para um usuário:
 * - se não houver grupo, ok (campo é opcional);
 * - se o grupo não mudou em relação ao atual, mantém o vínculo (mesmo inativo);
 * - se for um grupo novo/alterado, ele deve existir e estar **ativo**
 *   (grupo inativo não pode ser selecionado para novos vínculos).
 */
export async function validarGrupoSelecionado(
  grupos: IGrupoRepository,
  grupoUsuarioId: string | null,
  grupoAtualId: string | null,
): Promise<void> {
  if (!grupoUsuarioId) return;
  if (grupoUsuarioId === grupoAtualId) return;

  const grupo = await grupos.buscarPorId(grupoUsuarioId);
  if (!grupo) throw new BusinessError('Grupo de usuários não encontrado.');
  if (!grupo.ativo) throw new BusinessError('Não é possível vincular a um grupo inativo.');
}
