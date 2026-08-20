import { BusinessError } from '@/shared/errors';
import {
  RECORRENCIAS,
  STATUS,
  TIPOS,
  type Recorrencia,
  type StatusCompromisso,
  type TipoCompromisso,
} from '@/core/compromisso/Compromisso';
import { VISIBILIDADES, type VisibilidadeCompromisso } from '@/core/compromisso/visibilidade';
import type { CriarCompromissoDTO, DadosCompromisso } from './dtos';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Paleta fechada em vez de hex livre: o tema escuro precisa continuar legível. */
export const CORES = ['brand', 'emerald', 'violet', 'amber', 'red', 'sky', 'rose', 'ink'];

/** Antecedências oferecidas na tela; "personalizado" aceita qualquer inteiro. */
export const MAX_MINUTOS_ANTES = 60 * 24 * 30; // 30 dias

function opcionalUuid(valor: unknown, campo: string): string | null {
  const v = typeof valor === 'string' ? valor.trim() : '';
  if (!v) return null;
  if (!UUID.test(v)) throw new BusinessError(`${campo} inválido.`);
  return v;
}

function listaDeUuid(valores: unknown, campo: string): string[] {
  if (!Array.isArray(valores)) return [];
  const out = new Set<string>();
  for (const v of valores) {
    const id = typeof v === 'string' ? v.trim() : '';
    if (!id) continue;
    if (!UUID.test(id)) throw new BusinessError(`${campo}: identificador inválido.`);
    out.add(id);
  }
  return [...out];
}

/**
 * Normaliza e valida um compromisso.
 *
 * Duas regras carregam peso aqui:
 *
 * - **O registro só existe depois de REALIZADO.** Guardar a ata de um encontro
 *   que o próprio sistema considera não realizado deixaria o histórico
 *   afirmando o que foi tratado num evento que não houve.
 * - **RESTRITO exige alguém.** Um compromisso restrito sem participante nem
 *   grupo seria visível só para o criador — ou seja, um particular disfarçado,
 *   com o rótulo errado no lugar onde a regra de segurança é lida.
 */
export function normalizarEValidarCompromisso(input: CriarCompromissoDTO): DadosCompromisso {
  const titulo = input.titulo?.trim() ?? '';
  if (titulo.length < 3) throw new BusinessError('Informe o título do compromisso.');
  if (titulo.length > 200) throw new BusinessError('O título é longo demais (máx. 200).');

  const tipo = (input.tipo?.trim() || 'OUTRO') as TipoCompromisso;
  if (!TIPOS.includes(tipo)) throw new BusinessError('Tipo de compromisso inválido.');

  const status = (input.status?.trim() || 'AGENDADO') as StatusCompromisso;
  if (!STATUS.includes(status)) throw new BusinessError('Situação inválida.');

  const visibilidade = (input.visibilidade?.trim() || 'ORGAO') as VisibilidadeCompromisso;
  if (!VISIBILIDADES.includes(visibilidade)) throw new BusinessError('Visibilidade inválida.');

  const inicioEm = new Date(input.inicioEm ?? '');
  if (Number.isNaN(inicioEm.getTime()))
    throw new BusinessError('Informe a data e a hora de início.');

  const diaInteiro = input.diaInteiro === true;

  let fimEm: Date;
  if (diaInteiro) {
    // Dia inteiro continua sendo um intervalo de instantes: assim a consulta
    // por janela é uma comparação só, sem caso especial.
    fimEm = new Date(inicioEm);
    fimEm.setHours(23, 59, 59, 999);
  } else if (input.fimEm) {
    fimEm = new Date(input.fimEm);
    if (Number.isNaN(fimEm.getTime())) throw new BusinessError('Hora de término inválida.');
    if (fimEm <= inicioEm) throw new BusinessError('O término precisa ser depois do início.');
  } else {
    // Sem término informado, uma hora — o padrão de qualquer agenda.
    fimEm = new Date(inicioEm.getTime() + 60 * 60 * 1000);
  }

  const recorrencia = (input.recorrencia?.trim() || 'NAO_REPETE') as Recorrencia;
  if (!RECORRENCIAS.includes(recorrencia)) throw new BusinessError('Recorrência inválida.');

  let recorrenciaIntervalo: number | null = null;
  if (input.recorrenciaIntervalo != null && input.recorrenciaIntervalo !== '') {
    const n = Number(input.recorrenciaIntervalo);
    if (!Number.isInteger(n) || n < 1 || n > 99)
      throw new BusinessError('Intervalo de repetição inválido.');
    recorrenciaIntervalo = n;
  }

  let recorrenciaAte: Date | null = null;
  if (input.recorrenciaAte) {
    recorrenciaAte = new Date(input.recorrenciaAte);
    if (Number.isNaN(recorrenciaAte.getTime()))
      throw new BusinessError('Data de término da repetição inválida.');
    if (recorrenciaAte < inicioEm)
      throw new BusinessError('A repetição não pode terminar antes de começar.');
  }
  if (recorrencia === 'NAO_REPETE') {
    recorrenciaIntervalo = null;
    recorrenciaAte = null;
  }

  const cor = input.cor?.trim() || null;
  if (cor && !CORES.includes(cor)) throw new BusinessError('Cor inválida.');

  const registro = input.registro?.trim() || null;
  if (registro && status !== 'REALIZADO')
    throw new BusinessError(
      'O registro do que foi tratado só se aplica a compromisso realizado. ' +
        'Marque como Realizado para gravá-lo.',
    );

  const participantes = listaDeUuid(input.participantes, 'Participantes');
  const grupos = listaDeUuid(input.grupos, 'Grupos');

  if (visibilidade === 'RESTRITO' && participantes.length === 0 && grupos.length === 0)
    throw new BusinessError(
      'Compromisso restrito precisa de ao menos um participante ou grupo. ' +
        'Sem ninguém convidado, use "Particular".',
    );

  if (visibilidade === 'PARTICULAR' && (participantes.length > 0 || grupos.length > 0))
    throw new BusinessError(
      'Compromisso particular não tem participantes — ele é visível só para você.',
    );

  const alertas = (Array.isArray(input.alertas) ? input.alertas : []).map((a) => {
    const minutosAntes = Number(a?.minutosAntes);
    if (!Number.isInteger(minutosAntes) || minutosAntes < 0 || minutosAntes > MAX_MINUTOS_ANTES)
      throw new BusinessError('Antecedência de alerta inválida.');
    return { minutosAntes };
  });

  // A mesma antecedência duas vezes é o mesmo lembrete — e a chave única do
  // banco recusaria com uma mensagem que não ajuda ninguém.
  if (new Set(alertas.map((a) => a.minutosAntes)).size !== alertas.length)
    throw new BusinessError('Há lembretes repetidos com a mesma antecedência.');

  return {
    tipo,
    titulo,
    pauta: input.pauta?.trim() || null,
    inicioEm,
    fimEm,
    diaInteiro,
    local: input.local?.trim() || null,
    cor,
    visibilidade,
    recorrencia,
    recorrenciaIntervalo,
    recorrenciaAte,
    ajusteId: opcionalUuid(input.ajusteId, 'Ajuste'),
    responsavelId: opcionalUuid(input.responsavelId, 'Responsável'),
    status,
    registro,
    participantes,
    grupos,
    alertas,
  };
}
