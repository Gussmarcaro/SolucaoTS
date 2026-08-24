import { BusinessError } from '@/shared/errors';
import { FONTE_RECURSO_CODIGOS } from '@/core/dominio/tabelasFaseV';
import { parseDataISO } from '@/shared/datas';
import { apenasDigitos, isCPFValido } from '@/shared/validators/documento';
import type { CriarAjusteDTO, DadosAjuste } from './dtos';
import type { Periodicidade, StatusAjuste, TipoAjuste } from '@/core/ajuste/Ajuste';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TIPOS: TipoAjuste[] = [
  'CONTRATO_GESTAO',
  'CONVENIO',
  'TERMO_COLABORACAO',
  'TERMO_FOMENTO',
  'TERMO_PARCERIA',
];
const PERIODICIDADES: Periodicidade[] = ['ANUAL', 'QUADRIMESTRAL'];
const STATUS: StatusAjuste[] = ['EM_ELABORACAO', 'ENVIADO'];

/** Normaliza e valida os dados do ajuste (reutilizado em criar/atualizar). */
export function normalizarEValidarAjuste(input: CriarAjusteDTO): DadosAjuste {
  const clienteId = input.clienteId?.trim() || null;
  const entidadeBeneficiariaId = input.entidadeBeneficiariaId?.trim() ?? '';
  const codigoAjuste = input.codigoAjuste?.trim() ?? '';
  const objeto = input.objeto?.trim() ?? '';
  const descricaoResumida = input.descricaoResumida?.trim() || null;

  // Espelha o VarChar(80) do schema: cortar no banco viraria erro genérico.
  if (descricaoResumida && descricaoResumida.length > 80)
    throw new BusinessError('A descrição resumida deve ter no máximo 80 caracteres.');

  if (!entidadeBeneficiariaId) throw new BusinessError('Selecione a entidade beneficiária.');
  if (!TIPOS.includes(input.tipoAjuste)) throw new BusinessError('Tipo de ajuste inválido.');
  if (!codigoAjuste) throw new BusinessError('Informe o código do ajuste (TCESP).');
  if (!objeto) throw new BusinessError('Informe o objeto do ajuste.');
  if (!PERIODICIDADES.includes(input.periodicidade))
    throw new BusinessError('Periodicidade inválida.');

  const status = input.status ?? 'EM_ELABORACAO';
  if (!STATUS.includes(status)) throw new BusinessError('Situação inválida.');

  let dataAssinatura: Date;
  try {
    dataAssinatura = parseDataISO(input.dataAssinatura);
  } catch {
    throw new BusinessError('Data de assinatura inválida.');
  }

  let vigenciaInicial: Date | null = null;
  if (input.vigenciaInicial) {
    try {
      vigenciaInicial = parseDataISO(input.vigenciaInicial);
    } catch {
      throw new BusinessError('Início de vigência inválido.');
    }
  }

  let vigenciaFinal: Date | null = null;
  if (input.vigenciaFinal) {
    try {
      vigenciaFinal = parseDataISO(input.vigenciaFinal);
    } catch {
      throw new BusinessError('Fim de vigência inválido.');
    }
    if (vigenciaInicial && vigenciaFinal < vigenciaInicial)
      throw new BusinessError('O fim da vigência não pode ser anterior ao início.');
  }

  const valor =
    typeof input.valorGlobal === 'string' ? Number(input.valorGlobal) : input.valorGlobal;
  if (!Number.isFinite(valor) || valor < 0) throw new BusinessError('Valor global inválido.');

  // ---- Previsão por fontes de recursos ----
  const previsao = (v: number | string | null | undefined, esfera: string): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'string' ? Number(v) : v;
    if (!Number.isFinite(n) || n < 0) throw new BusinessError(`Previsão ${esfera} inválida.`);
    return n;
  };
  /*
   * Fontes de recurso — **obrigatórias**, e é aí que está o ganho.
   *
   * A tabela do TCESP tem 16 fontes, e o pagamento aceita qualquer uma delas:
   * fonte errada não é recusada pelo schema, porque o código existe. O erro só
   * apareceria na análise do Tribunal, depois de transmitido. Declarando as
   * fontes no ajuste, o lançamento passa a escolher entre as que fazem sentido.
   */
  const fontesRecurso = [
    ...new Set(
      (Array.isArray(input.fontesRecurso) ? input.fontesRecurso : []).map((f) => Number(f)),
    ),
  ];
  // Conferido contra a tabela oficial, não só contra "é número": código fora
  // dela seria rejeitado no envio, e o erro apareceria só na transmissão.
  const fora = fontesRecurso.filter((f) => !FONTE_RECURSO_CODIGOS.has(f));
  if (fora.length) throw new BusinessError(`Fonte de recurso inexistente: ${fora.join(', ')}.`);
  if (fontesRecurso.length === 0)
    throw new BusinessError('Informe ao menos uma fonte de recurso do ajuste.');

  // Contas bancárias: opcionais. Restringir o pagamento só faz sentido quando
  // há contas cadastradas — exigi-las trancaria o ajuste de quem ainda não as
  // tem, e o pagamento continua aceitando digitação nesse caso.
  const contasBancarias = (Array.isArray(input.contasBancarias) ? input.contasBancarias : []).map(
    (c) => {
      const banco = Number(c.banco);
      const agencia = Number(c.agencia);
      const conta = String(c.conta ?? '').trim();
      if (!Number.isInteger(banco) || banco <= 0)
        throw new BusinessError('Conta bancária: informe o banco.');
      if (!Number.isInteger(agencia) || agencia <= 0)
        throw new BusinessError('Conta bancária: informe a agência.');
      if (!conta) throw new BusinessError('Conta bancária: informe o número da conta.');
      const tipo = c.contaTipo === undefined || c.contaTipo === null || c.contaTipo === '' ? null : Number(c.contaTipo);
      if (tipo !== null && (!Number.isInteger(tipo) || tipo <= 0))
        throw new BusinessError('Conta bancária: tipo inválido.');
      return { banco, agencia, conta, contaTipo: tipo, apelido: c.apelido?.trim() || null };
    },
  );

  const repetida = contasBancarias.find(
    (c, i) =>
      contasBancarias.findIndex(
        (o) => o.banco === c.banco && o.agencia === c.agencia && o.conta === c.conta,
      ) !== i,
  );
  if (repetida) throw new BusinessError('Há conta bancária repetida no ajuste.');

  const previsaoFederal = previsao(input.previsaoFederal, 'federal');
  const previsaoEstadual = previsao(input.previsaoEstadual, 'estadual');
  const previsaoMunicipal = previsao(input.previsaoMunicipal, 'municipal');

  // ---- Responsável ----
  const responsavelCpf = input.responsavelCpf ? apenasDigitos(input.responsavelCpf) : null;
  if (responsavelCpf && !isCPFValido(responsavelCpf))
    throw new BusinessError('CPF do responsável inválido.');

  const responsavelEmail = input.responsavelEmail?.trim().toLowerCase() || null;
  if (responsavelEmail && !EMAIL_REGEX.test(responsavelEmail))
    throw new BusinessError('E-mail do responsável inválido.');

  const responsavelTelefone = input.responsavelTelefone
    ? apenasDigitos(input.responsavelTelefone)
    : null;
  if (responsavelTelefone && (responsavelTelefone.length < 10 || responsavelTelefone.length > 11))
    throw new BusinessError('Telefone do responsável inválido. Informe DDD + número.');

  const responsavelCep = input.responsavelCep ? apenasDigitos(input.responsavelCep) : null;
  if (responsavelCep && responsavelCep.length !== 8)
    throw new BusinessError('CEP do responsável inválido.');

  const responsavelUf = input.responsavelUf?.trim().toUpperCase() || null;
  if (responsavelUf && !/^[A-Z]{2}$/.test(responsavelUf))
    throw new BusinessError('UF do responsável inválida.');

  /** Data opcional em ISO; `futuroProibido` recusa data adiante de hoje. */
  const dataOpcional = (
    valorIso: string | null | undefined,
    rotulo: string,
    futuroProibido = false,
  ): Date | null => {
    if (!valorIso) return null;
    let d: Date;
    try {
      d = parseDataISO(valorIso);
    } catch {
      throw new BusinessError(`${rotulo} inválida.`);
    }
    if (futuroProibido && d.getTime() > Date.now())
      throw new BusinessError(`${rotulo} não pode ser futura.`);
    return d;
  };

  const responsavelDataNascimento = dataOpcional(
    input.responsavelDataNascimento,
    'Data de nascimento do responsável',
    true,
  );
  const responsavelDataEntrada = dataOpcional(
    input.responsavelDataEntrada,
    'Data de entrada do responsável',
  );
  const responsavelDataSaida = dataOpcional(
    input.responsavelDataSaida,
    'Data de saída do responsável',
  );
  if (
    responsavelDataEntrada &&
    responsavelDataSaida &&
    responsavelDataSaida < responsavelDataEntrada
  )
    throw new BusinessError('A saída do responsável não pode ser anterior à entrada.');

  // ---- Publicação ----
  const publicacaoLink = input.publicacaoLink?.trim() || null;
  // Só http(s): o link vira um `window.open` na tela, e esquemas como
  // `javascript:` executariam script no navegador de quem clicasse.
  if (publicacaoLink && !/^https?:\/\/\S+$/i.test(publicacaoLink))
    throw new BusinessError('O link da publicação deve começar com http:// ou https://.');

  const publicacaoData = dataOpcional(input.publicacaoData, 'Data da publicação');

  return {
    clienteId,
    entidadeBeneficiariaId,
    tipoAjuste: input.tipoAjuste,
    descricaoResumida,
    codigoAjuste,
    numero: input.numero?.trim() || null,
    objeto,
    valorGlobal: valor,
    dataAssinatura,
    vigenciaInicial,
    vigenciaFinal,
    periodicidade: input.periodicidade,
    status,

    previsaoFederal,
    previsaoEstadual,
    previsaoMunicipal,

    fontesRecurso,
    contasBancarias,

    responsavelNome: input.responsavelNome?.trim() || null,
    responsavelCpf,
    responsavelDataNascimento,
    responsavelCep,
    responsavelLogradouro: input.responsavelLogradouro?.trim() || null,
    responsavelNumero: input.responsavelNumero?.trim() || null,
    responsavelComplemento: input.responsavelComplemento?.trim() || null,
    responsavelBairro: input.responsavelBairro?.trim() || null,
    responsavelCidade: input.responsavelCidade?.trim() || null,
    responsavelUf,
    responsavelEmail,
    responsavelTelefone,
    responsavelCargo: input.responsavelCargo?.trim() || null,
    responsavelDataEntrada,
    responsavelDataSaida,

    publicacaoLocal: input.publicacaoLocal?.trim() || null,
    publicacaoLink,
    publicacaoData,
  };
}
