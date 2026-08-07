import type { ITcespGateway } from '@/application/transmissao/ITcespGateway';
import type { Ambiente, Credenciais, Inconformidade, ResultadoEnvio, StatusConsulta } from '@/application/transmissao/dtos';
import { BusinessError } from '@/shared/errors';

const BASE_URL: Record<Ambiente, string> = {
  PILOTO: 'https://audesp-piloto.tce.sp.gov.br',
  PRODUCAO: 'https://audesp.tce.sp.gov.br',
};

/** Rota de envio por tipo de ajuste (paths oficiais do manual Fase V). */
const ROTA_ENVIO: Record<string, string> = {
  CONTRATO_GESTAO: '/f5/enviar-prestacao-contas-contrato-gestao',
  CONVENIO: '/f5/enviar-prestacao-contas-convenio',
  TERMO_COLABORACAO: '/f5/enviar-prestacao-contas-termo-colaboracao',
  TERMO_FOMENTO: '/f5/enviar-prestacao-contas-termo_fomento',
  TERMO_PARCERIA: '/f5/enviar-prestacao-contas-termo-parceria',
};

async function corpo(resp: Response): Promise<{ json: unknown; texto: string }> {
  const texto = await resp.text();
  try {
    return { json: texto ? JSON.parse(texto) : null, texto };
  } catch {
    return { json: null, texto };
  }
}

/** Procura recursivamente um valor por nomes de chave candidatos. */
function extrair(obj: unknown, chaves: string[]): string | null {
  if (obj == null) return null;
  if (typeof obj !== 'object') return null;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (chaves.includes(k.toLowerCase()) && (typeof v === 'string' || typeof v === 'number'))
      return String(v);
  }
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (v && typeof v === 'object') {
      const achou = extrair(v, chaves);
      if (achou) return achou;
    }
  }
  return null;
}

/** Normaliza a lista de inconformidades a partir de formatos comuns da API. */
function extrairInconformidades(json: unknown): Inconformidade[] {
  const candidatos = ['inconformidades', 'erros', 'errors', 'mensagens', 'inconsistencias'];
  const raiz = json as Record<string, unknown> | null;
  let lista: unknown = null;
  if (raiz) for (const c of candidatos) if (Array.isArray(raiz[c])) { lista = raiz[c]; break; }
  if (!Array.isArray(lista)) return [];
  return lista.map((it) => {
    if (typeof it === 'string') return { mensagem: it };
    const o = (it ?? {}) as Record<string, unknown>;
    return {
      campo: (o.campo ?? o.field ?? o.caminho ?? null) as string | null,
      mensagem: String(o.mensagem ?? o.message ?? o.descricao ?? JSON.stringify(o)),
    };
  });
}

/**
 * Adapter HTTP da API RESTful do Audesp (Fase V).
 * ATENÇÃO: os formatos exatos de resposta (token, protocolo, estado) não são
 * públicos — a extração aqui é defensiva e DEVE ser validada contra o ambiente
 * PILOTO antes de produção.
 */
export class TcespHttpGateway implements ITcespGateway {
  async autenticar(ambiente: Ambiente, credenciais: Credenciais): Promise<string> {
    const resp = await fetch(`${BASE_URL[ambiente]}/login`, {
      method: 'POST',
      headers: { 'x-authorization': `${credenciais.usuario}:${credenciais.senha}` },
    });
    const { json, texto } = await corpo(resp);
    if (!resp.ok)
      throw new BusinessError(`Falha na autenticação Audesp (HTTP ${resp.status}). ${texto.slice(0, 300)}`);

    // Fallback p/ texto puro só quando a resposta NÃO é JSON (json == null).
    const token = extrair(json, ['token', 'access_token', 'accesstoken', 'jwt']) ?? (json == null ? texto.trim() || null : null);
    if (!token) throw new BusinessError('Autenticação Audesp não retornou token.');
    return token;
  }

  async enviar(params: {
    ambiente: Ambiente;
    token: string;
    tipoAjuste: string;
    documento: unknown;
  }): Promise<ResultadoEnvio> {
    const rota = ROTA_ENVIO[params.tipoAjuste];
    if (!rota) throw new BusinessError(`Tipo de ajuste sem rota de envio: ${params.tipoAjuste}.`);

    const arquivo = new Blob([JSON.stringify(params.documento)], { type: 'application/json' });
    const form = new FormData();
    form.append('documentoJSON', arquivo, 'prestacao.json');

    const resp = await fetch(`${BASE_URL[params.ambiente]}${rota}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${params.token}` },
      body: form,
    });
    const { json, texto } = await corpo(resp);
    const protocolo = extrair(json, ['protocolo', 'numeroprotocolo', 'protocol', 'numero']) ?? null;
    const mensagem = extrair(json, ['mensagem', 'message', 'erro', 'error']) ?? (resp.ok ? null : texto.slice(0, 300));

    return { protocolo, aceito: resp.ok && !!protocolo, mensagem, bruto: json ?? texto };
  }

  async consultar(params: { ambiente: Ambiente; token: string; protocolo: string }): Promise<StatusConsulta> {
    const url = `${BASE_URL[params.ambiente]}/f5/consulta?protocolo=${encodeURIComponent(params.protocolo)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${params.token}` } });
    const { json, texto } = await corpo(resp);
    if (!resp.ok)
      throw new BusinessError(`Falha ao consultar protocolo (HTTP ${resp.status}). ${texto.slice(0, 300)}`);

    const estado = extrair(json, ['estado', 'status', 'situacao']) ?? (texto.trim() || null);
    return { estado, inconformidades: extrairInconformidades(json), bruto: json ?? texto };
  }
}
