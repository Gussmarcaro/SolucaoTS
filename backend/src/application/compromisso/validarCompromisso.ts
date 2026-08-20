import { BusinessError } from '@/shared/errors';
import {
  STATUS,
  TIPOS,
  type StatusCompromisso,
  type TipoCompromisso,
} from '@/core/compromisso/Compromisso';
import type { CriarCompromissoDTO, DadosCompromisso } from './dtos';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function opcionalUuid(valor: unknown, campo: string): string | null {
  const v = typeof valor === 'string' ? valor.trim() : '';
  if (!v) return null;
  if (!UUID.test(v)) throw new BusinessError(`${campo} inválido.`);
  return v;
}

/**
 * Normaliza e valida um compromisso.
 *
 * A regra que dá sentido ao módulo está no fim: **o registro só existe depois
 * de realizado**. Guardar a ata de uma reunião ainda marcada como agendada
 * deixaria o histórico dizendo o que foi tratado num encontro que, pelo próprio
 * sistema, ainda não aconteceu.
 */
export function normalizarEValidarCompromisso(input: CriarCompromissoDTO): DadosCompromisso {
  const titulo = input.titulo?.trim() ?? '';
  if (titulo.length < 3) throw new BusinessError('Informe o título do compromisso.');
  if (titulo.length > 200) throw new BusinessError('O título é longo demais (máx. 200).');

  const tipo = (input.tipo?.trim() || 'OUTRO') as TipoCompromisso;
  if (!TIPOS.includes(tipo)) throw new BusinessError('Tipo de compromisso inválido.');

  const status = (input.status?.trim() || 'AGENDADO') as StatusCompromisso;
  if (!STATUS.includes(status)) throw new BusinessError('Situação inválida.');

  // Aceita 'YYYY-MM-DDTHH:mm' (o que o input datetime-local envia) e ISO cheio.
  const inicioEm = new Date(input.inicioEm ?? '');
  if (Number.isNaN(inicioEm.getTime()))
    throw new BusinessError('Informe a data e a hora do compromisso.');

  let duracaoMinutos: number | null = null;
  const d = input.duracaoMinutos;
  if (d !== undefined && d !== null && d !== '') {
    const n = typeof d === 'string' ? Number(d) : d;
    if (!Number.isFinite(n) || n <= 0 || n > 24 * 60)
      throw new BusinessError('Duração inválida (em minutos).');
    duracaoMinutos = Math.trunc(n);
  }

  const registro = input.registro?.trim() || null;
  if (registro && status !== 'REALIZADO')
    throw new BusinessError(
      'O registro do que foi tratado só se aplica a compromisso realizado. ' +
        'Marque como Realizado para gravá-lo.',
    );

  return {
    tipo,
    titulo,
    pauta: input.pauta?.trim() || null,
    inicioEm,
    duracaoMinutos,
    local: input.local?.trim() || null,
    participantes: input.participantes?.trim() || null,
    ajusteId: opcionalUuid(input.ajusteId, 'Ajuste'),
    responsavelId: opcionalUuid(input.responsavelId, 'Responsável'),
    status,
    registro,
  };
}
