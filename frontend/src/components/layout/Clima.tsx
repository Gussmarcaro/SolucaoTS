import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';

/**
 * O tempo na cidade de quem está logado.
 *
 * **De onde vem a cidade.** Do cadastro do usuário, não da entidade
 * beneficiária: um órgão tem várias OSCs, em cidades diferentes, e escolher uma
 * delas seria arbitrário. O órgão em si não tem cidade — só o `codigoMunicipio`
 * do TCESP, que é um número, não um nome. A cidade do usuário é a única sempre
 * preenchida, e é a que responde à pergunta certa: quem olha a barra quer o
 * tempo onde **ele** está.
 *
 * **Open-Meteo**, sem chave e sem cadastro. Não é só conveniência: uma chave de
 * API no frontend é uma chave pública, e guardá-la no servidor exigiria uma
 * rota de proxy só para o clima. Aqui não há segredo a proteger, e o que sai do
 * navegador é o nome de uma cidade — nada que identifique alguém.
 *
 * **Falha em silêncio, sempre.** Rede fora, cidade que a API não conhece,
 * resposta estranha: o componente não renderiza nada. Um aviso de erro na barra
 * superior por causa do clima competiria com o sino de prazos legais, que é o
 * que aquele espaço existe para mostrar.
 */

/** Coordenadas não mudam. Uma vez resolvidas, ficam. */
const CHAVE_LUGAR = '@SolucaoTS:clima:lugar';
/** A previsão, sim: recarregar a tela a cada minuto não justifica nova consulta. */
const CHAVE_TEMPO = '@SolucaoTS:clima:tempo';
const VALIDADE_MIN = 30;

interface Lugar {
  cidade: string;
  lat: number;
  lon: number;
}

interface Tempo {
  chave: string;
  emC: number;
  codigo: number;
  dia: boolean;
  em: number;
}

/** Lê do armazenamento sem deixar a tela quebrar em aba anônima. */
function ler<T>(chave: string): T | null {
  try {
    const cru = localStorage.getItem(chave);
    return cru ? (JSON.parse(cru) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: só perde o cache, tudo continua funcionando */
  }
}

/**
 * Códigos WMO → ícone e descrição.
 *
 * A tabela é do padrão da Organização Meteorológica Mundial, que a Open-Meteo
 * devolve. São dezenas de códigos; agrupá-los por faixa é o que mantém isto
 * legível — a diferença entre "chuva moderada" e "chuva forte" não muda o
 * ícone, e na barra superior não muda decisão nenhuma.
 */
function aparencia(codigo: number, dia: boolean): { Icone: LucideIcon; texto: string } {
  if (codigo === 0) return { Icone: dia ? Sun : Moon, texto: 'Céu limpo' };
  if (codigo <= 2) return { Icone: dia ? Sun : Moon, texto: 'Parcialmente nublado' };
  if (codigo === 3) return { Icone: Cloud, texto: 'Nublado' };
  if (codigo <= 48) return { Icone: CloudFog, texto: 'Névoa' };
  if (codigo <= 57) return { Icone: CloudDrizzle, texto: 'Garoa' };
  if (codigo <= 67) return { Icone: CloudRain, texto: 'Chuva' };
  if (codigo <= 77) return { Icone: CloudSnow, texto: 'Neve' };
  if (codigo <= 82) return { Icone: CloudRain, texto: 'Pancadas de chuva' };
  if (codigo <= 86) return { Icone: CloudSnow, texto: 'Pancadas de neve' };
  return { Icone: CloudLightning, texto: 'Tempestade' };
}

/** Resolve a cidade em coordenadas — uma vez por cidade, para sempre. */
async function coordenadas(cidade: string, uf: string, sinal: AbortSignal): Promise<Lugar | null> {
  const guardado = ler<Lugar>(CHAVE_LUGAR);
  if (guardado?.cidade === `${cidade}/${uf}`) return guardado;

  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(cidade)}&country=BR&count=1&language=pt`;
  const r = await fetch(url, { signal: sinal });
  if (!r.ok) return null;

  const json = (await r.json()) as { results?: { latitude: number; longitude: number }[] };
  const achado = json.results?.[0];
  if (!achado) return null;

  const lugar: Lugar = { cidade: `${cidade}/${uf}`, lat: achado.latitude, lon: achado.longitude };
  gravar(CHAVE_LUGAR, lugar);
  return lugar;
}

async function previsao(lugar: Lugar, sinal: AbortSignal): Promise<Tempo | null> {
  const chave = `${lugar.lat.toFixed(2)},${lugar.lon.toFixed(2)}`;
  const guardado = ler<Tempo>(CHAVE_TEMPO);
  if (guardado?.chave === chave && Date.now() - guardado.em < VALIDADE_MIN * 60_000) {
    return guardado;
  }

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lugar.lat}&longitude=${lugar.lon}` +
    '&current=temperature_2m,weather_code,is_day&timezone=auto';
  const r = await fetch(url, { signal: sinal });
  if (!r.ok) return null;

  const json = (await r.json()) as {
    current?: { temperature_2m: number; weather_code: number; is_day: number };
  };
  const atual = json.current;
  if (!atual || typeof atual.temperature_2m !== 'number') return null;

  const tempo: Tempo = {
    chave,
    emC: Math.round(atual.temperature_2m),
    codigo: atual.weather_code,
    dia: atual.is_day === 1,
    em: Date.now(),
  };
  gravar(CHAVE_TEMPO, tempo);
  return tempo;
}

export function Clima({ cidade, uf }: { cidade?: string | null; uf?: string | null }) {
  const [tempo, setTempo] = useState<Tempo | null>(null);

  useEffect(() => {
    if (!cidade?.trim() || !uf?.trim()) return;
    const controlador = new AbortController();

    (async () => {
      try {
        const lugar = await coordenadas(cidade.trim(), uf.trim(), controlador.signal);
        if (!lugar) return;
        const t = await previsao(lugar, controlador.signal);
        if (t) setTempo(t);
      } catch {
        // Inclui o `abort` da desmontagem. Silêncio é o comportamento certo:
        // ver a barra sem o clima é melhor que vê-la com um erro.
      }
    })();

    return () => controlador.abort();
  }, [cidade, uf]);

  if (!tempo) return null;

  const { Icone, texto } = aparencia(tempo.codigo, tempo.dia);

  return (
    // Some abaixo de `md`: no celular a barra disputa espaço com o essencial —
    // busca, sino e perfil —, e o clima é o primeiro a poder sair.
    <span
      title={`${texto} em ${cidade} · ${tempo.emC}°C`}
      className="hidden items-center gap-1.5 rounded-xl px-2 py-1 text-ink-500 dark:text-ink-400 md:inline-flex"
    >
      <Icone className="h-[18px] w-[18px]" />
      <span className="text-[13px] font-medium tabular-nums">{tempo.emC}°</span>
      <span className="hidden max-w-[110px] truncate text-[11px] text-ink-400 lg:inline">
        {cidade}
      </span>
    </span>
  );
}
