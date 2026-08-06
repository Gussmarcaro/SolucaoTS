import { BusinessError } from '@/shared/errors';
import type { CriarGrupoDTO, DadosGrupo } from './dtos';

/** Normaliza e valida os dados do grupo (reutilizado em criar/atualizar). */
export function normalizarEValidarGrupo(input: CriarGrupoDTO): DadosGrupo {
  const nome = input.nome?.trim() ?? '';
  if (nome.length < 2) throw new BusinessError('Informe o nome do grupo.');

  return {
    nome,
    descricao: input.descricao?.trim() || null,
    ativo: input.ativo ?? true,
  };
}
