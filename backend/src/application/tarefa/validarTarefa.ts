import { BusinessError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';
import {
  PRIORIDADES,
  STATUS,
  type PrioridadeTarefa,
  type StatusTarefa,
} from '@/core/tarefa/Tarefa';
import type { CriarTarefaDTO, DadosTarefa } from './dtos';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function opcionalUuid(valor: unknown, campo: string): string | null {
  const v = typeof valor === 'string' ? valor.trim() : '';
  if (!v) return null;
  if (!UUID.test(v)) throw new BusinessError(`${campo} inválido.`);
  return v;
}

/**
 * Normaliza e valida os dados da tarefa (reutilizado em criar/atualizar).
 *
 * `concluidaEm` não é informado por quem chama: ele é consequência do status.
 * Deixar a data entrar pelo payload permitiria registrar conclusão numa tarefa
 * pendente — e é justamente essa data que prova, no sino, que a providência
 * foi tomada.
 */
export function normalizarEValidarTarefa(
  input: CriarTarefaDTO,
  anterior?: { status: StatusTarefa; concluidaEm: Date | null },
): DadosTarefa {
  const titulo = input.titulo?.trim() ?? '';
  if (titulo.length < 3) throw new BusinessError('Informe o título da tarefa.');
  if (titulo.length > 200) throw new BusinessError('O título é longo demais (máx. 200).');

  const descricao = input.descricao?.trim() || null;

  const prioridade = (input.prioridade?.trim() || 'MEDIA') as PrioridadeTarefa;
  if (!PRIORIDADES.includes(prioridade)) throw new BusinessError('Prioridade inválida.');

  const status = (input.status?.trim() || 'PENDENTE') as StatusTarefa;
  if (!STATUS.includes(status)) throw new BusinessError('Status inválido.');

  let prazoLegal: Date;
  try {
    prazoLegal = parseDataISO(input.prazoLegal);
  } catch {
    throw new BusinessError('Informe o prazo da tarefa (data válida).');
  }

  // Conclusão: carimba na virada e preserva o carimbo enquanto continuar
  // concluída, para uma edição de texto não reescrever a data do feito.
  const concluida = status === 'CONCLUIDA';
  const concluidaEm = concluida ? (anterior?.concluidaEm ?? new Date()) : null;

  return {
    titulo,
    descricao,
    prioridade,
    status,
    prazoLegal,
    ajusteId: opcionalUuid(input.ajusteId, 'Ajuste'),
    responsavelId: opcionalUuid(input.responsavelId, 'Responsável'),
    origemAlerta: input.origemAlerta?.trim() || null,
    concluidaEm,
  };
}
