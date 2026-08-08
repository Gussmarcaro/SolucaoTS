import { readFileSync } from 'node:fs';
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { IValidadorSchema, ResultadoValidacaoSchema } from '@/application/montador/IValidadorSchema';
import { arquivoSchema, tipoAjusteSchema, VERSAO_SCHEMA } from './schemas';

/**
 * Os schemas do TCESP declaram `"$schema": "https://json-schema.org/draft-07/schema"`
 * — https e sem o `#` final. O Ajv registra o meta-schema do draft-07 sob
 * `http://json-schema.org/draft-07/schema#`, então essa URI não resolve e a
 * compilação falha. Registramos o mesmo meta-schema sob o `$id` que eles usam.
 */
const META_DRAFT_07_PADRAO = 'http://json-schema.org/draft-07/schema';
const META_DRAFT_07_TCESP = 'https://json-schema.org/draft-07/schema';

/**
 * Valida o documento contra o JSON Schema oficial do Audesp usando Ajv.
 *
 * Os schemas são compilados sob demanda e guardados em memória — compilar os
 * cinco (≈140 KB cada) no boot atrasaria o start à toa, já que uma instalação
 * costuma usar um ou dois tipos de ajuste.
 */
export class AjvValidadorSchema implements IValidadorSchema {
  private readonly ajv: Ajv;
  private readonly compilados = new Map<string, ValidateFunction>();

  constructor() {
    // `allErrors` para listar tudo de uma vez (o usuário corrige em um passe);
    // `strict: false` porque os schemas do TCESP usam palavras-chave próprias;
    // `multipleOfPrecision` porque os valores em reais são checados com
    // `multipleOf: 0.01` e, em ponto flutuante, 4.56/0.01 = 455.99999… — sem
    // isso até o JSON de exemplo do próprio TCESP seria reprovado.
    this.ajv = new Ajv({ allErrors: true, strict: false, multipleOfPrecision: 2 });
    addFormats(this.ajv);

    const meta = this.ajv.getSchema(META_DRAFT_07_PADRAO)?.schema;
    if (meta && typeof meta === 'object') {
      this.ajv.addMetaSchema({ ...(meta as object), $id: META_DRAFT_07_TCESP }, META_DRAFT_07_TCESP);
    }
  }

  validar(tipoAjuste: string, documento: unknown): ResultadoValidacaoSchema {
    const tipo = tipoAjusteSchema(tipoAjuste);
    if (!tipo) {
      return { validado: false, erros: [], motivo: `não há schema para o tipo de ajuste "${tipoAjuste}"` };
    }

    let validador: ValidateFunction;
    try {
      validador = this.obterValidador(tipo);
    } catch (err) {
      // Não bloqueia o envio — mas o chamador precisa saber que a checagem
      // estrutural não rodou, senão o silêncio vira falsa segurança.
      const motivo = `falha ao compilar o schema ${VERSAO_SCHEMA} de "${tipo}": ${(err as Error).message}`;
      console.error(`[schema] ${motivo}`);
      return { validado: false, erros: [], motivo };
    }

    if (validador(documento)) return { validado: true, erros: [] };
    return { validado: true, erros: this.traduzir(validador.errors ?? []) };
  }

  private obterValidador(tipo: string): ValidateFunction {
    const emCache = this.compilados.get(tipo);
    if (emCache) return emCache;

    const schema = JSON.parse(
      readFileSync(arquivoSchema(tipo as Parameters<typeof arquivoSchema>[0]), 'utf8'),
    ) as Record<string, unknown>;
    const compilado = this.ajv.compile(schema);
    this.compilados.set(tipo, compilado);
    return compilado;
  }

  /**
   * Converte os erros do Ajv em mensagens em português apontando o caminho do
   * campo. Erros repetidos (o Ajv costuma emitir vários por causa raiz) são
   * deduplicados, e o total é limitado para a UI continuar legível.
   */
  private traduzir(erros: ErrorObject[]): string[] {
    const LIMITE = 40;
    const mensagens = new Set<string>();

    for (const e of erros) {
      const campo = caminhoLegivel(e.instancePath);
      let texto: string;

      switch (e.keyword) {
        case 'required':
          texto = `${campo}: falta o campo obrigatório "${String((e.params as { missingProperty: string }).missingProperty)}".`;
          break;
        case 'additionalProperties':
          texto = `${campo}: campo não previsto no schema "${String((e.params as { additionalProperty: string }).additionalProperty)}".`;
          break;
        case 'enum':
          texto = `${campo}: valor fora da lista aceita pelo TCESP.`;
          break;
        case 'type':
          texto = `${campo}: tipo inválido (esperado ${String((e.params as { type: string }).type)}).`;
          break;
        case 'pattern':
          texto = `${campo}: formato inválido (esperado ${String((e.params as { pattern: string }).pattern)}).`;
          break;
        case 'multipleOf':
          texto = `${campo}: valor com casas decimais demais (o TCESP aceita no máximo centavos).`;
          break;
        case 'minimum':
        case 'maximum':
        case 'minLength':
        case 'maxLength':
        case 'minItems':
        case 'minProperties':
        case 'maxProperties':
          texto = `${campo}: ${e.message ?? 'valor fora do limite aceito'}.`;
          break;
        default:
          texto = `${campo}: ${e.message ?? 'valor inválido'}.`;
      }
      mensagens.add(`Schema do TCESP — ${texto}`);
    }

    const lista = [...mensagens];
    if (lista.length > LIMITE) {
      const restantes = lista.length - LIMITE;
      return [...lista.slice(0, LIMITE), `Schema do TCESP — e mais ${restantes} problema(s).`];
    }
    return lista;
  }
}

/** '/documentos_fiscais/0/valor_bruto' → 'documentos_fiscais[0].valor_bruto'. */
function caminhoLegivel(instancePath: string): string {
  if (!instancePath) return 'documento';
  return instancePath
    .split('/')
    .filter(Boolean)
    .map((p, i) => (/^\d+$/.test(p) ? `[${p}]` : i === 0 ? p : `.${p}`))
    .join('');
}
