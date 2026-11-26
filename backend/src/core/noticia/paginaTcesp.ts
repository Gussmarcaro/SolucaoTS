/**
 * Leitura das páginas públicas do TCESP: as notícias
 * (https://www.tce.sp.gov.br/noticias) e os comunicados
 * (https://www.tce.sp.gov.br/audesp/comunicados).
 *
 * **Por que as páginas e não um RSS.** O TCESP não publica feed. O Google
 * Notícias tem um que traz as mesmas manchetes, mas a licença dele só permite
 * uso pessoal e não comercial, e o sistema é um produto vendido. As páginas do
 * Tribunal são públicas e oficiais, e são a fonte primária do que importa aqui
 * — os comunicados, sobretudo, não chegam ao Google Notícias.
 *
 * **O preço.** Ler HTML é frágil: se o Tribunal mudar o tema do site, a leitura
 * volta vazia. Por isso estas funções nunca lançam. Elas devolvem o que
 * reconheceram, e o caso de uso trata a lista vazia como falha. O teste
 * `noticiasTcesp.test.ts` guarda trechos reais das páginas para avisar quando
 * a estrutura deixar de bater.
 */

export interface Noticia {
  titulo: string;
  /** Endereço absoluto no site do TCESP. */
  link: string;
  /** Resumo da notícia; nos comunicados, vazio — a listagem não traz. */
  resumo: string;
  /** `aaaa-mm-dd`, ou nulo quando a data não veio. */
  data: string | null;
  /** Só nos comunicados: "Audesp", "SDG"… */
  area: string | null;
  /** Só nos comunicados: "50/2026". */
  numero: string | null;
  /**
   * Fala de Audesp, Fase V, terceiro setor ou repasses — o assunto do sistema.
   * A tela realça essas e permite filtrar só por elas.
   */
  destaque: boolean;
}

const BASE = 'https://www.tce.sp.gov.br';
const ASSUNTO = /audesp|fase v\b|terceiro setor|repasse|mrosc|13\.019/i;

/** Entidades que o Drupal de fato emite nos títulos e resumos. */
function decodificar(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Acentos do português por nome (&atilde;, &ccedil;, &Eacute;…).
    .replace(/&([a-zA-Z])(acute|grave|tilde|circ|cedil|uml);/g, (todo, letra: string, sinal: string) => {
      const marca = { acute: '́', grave: '̀', tilde: '̃', circ: '̂', cedil: '̧', uml: '̈' }[sinal];
      return marca ? (letra + marca).normalize('NFC') : todo;
    })
    .replace(/&ordf;/g, 'ª')
    .replace(/&ordm;/g, 'º')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function texto(html: string): string {
  return decodificar(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function absoluto(href: string): string | null {
  const link = /^https?:\/\//i.test(href) ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
  return link.startsWith(BASE) ? link : null;
}

/**
 * Notícias. Cada uma tem esta forma (Drupal):
 *
 *     <div class="listagem-noticia"> … <h2> <a href="/6524-…">Título</a></h2>
 *       … <div class="field--item"> 26/11/2026 - Resumo…</div>
 */
export function lerNoticiasTcesp(html: string): Noticia[] {
  const vistas = new Set<string>();
  const noticias: Noticia[] = [];

  for (const bloco of html.split(/class="listagem-noticia"/).slice(1)) {
    const titulo = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(bloco);
    if (!titulo) continue;
    const link = absoluto(titulo[1]);
    if (!link || vistas.has(link)) continue;

    // O resumo é o primeiro `field--item` depois do título, e começa pela data.
    const depois = bloco.slice(titulo.index + titulo[0].length);
    const campo = /<div[^>]*field--item[^>]*>([\s\S]*?)<\/div>/i.exec(depois);
    let resumo = campo ? texto(campo[1]) : '';

    let data: string | null = null;
    const d = /^(\d{2})\/(\d{2})\/(\d{4})\s*[-–]\s*/.exec(resumo);
    if (d) {
      data = `${d[3]}-${d[2]}-${d[1]}`;
      resumo = resumo.slice(d[0].length);
    }

    const t = texto(titulo[2]);
    if (!t) continue;
    vistas.add(link);
    noticias.push({
      titulo: t,
      link,
      resumo,
      data,
      area: null,
      numero: null,
      destaque: ASSUNTO.test(`${t} ${resumo}`),
    });
  }
  return noticias;
}

/**
 * Comunicados. Cada um é um `<li>` com o link e, logo abaixo, a linha
 * "Área: Audesp   Nº: 50/2026   Publicação: <time datetime="2026-11-19T…">".
 */
export function lerComunicadosTcesp(html: string): Noticia[] {
  const vistas = new Set<string>();
  const itens: Noticia[] = [];

  for (const bloco of html.split(/<li[\s>]/i).slice(1)) {
    const a = /<a[^>]*href="([^"]*\/comunicado\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(bloco);
    if (!a) continue;
    const link = absoluto(a[1]);
    if (!link || vistas.has(link)) continue;

    const t = texto(a[2]);
    if (!t) continue;

    const linha = texto(bloco.slice(a.index + a[0].length));
    const area = /Área:\s*(.+?)(?=\s+Nº:|\s+Publicação:|$)/i.exec(linha)?.[1]?.trim() || null;
    const numero = /Nº:\s*([\d./-]+)/i.exec(linha)?.[1] ?? null;
    const data = /datetime="(\d{4}-\d{2}-\d{2})/i.exec(bloco)?.[1] ?? null;

    vistas.add(link);
    itens.push({
      titulo: t,
      link,
      resumo: '',
      data,
      area,
      numero,
      destaque: area?.toLowerCase() === 'audesp' || ASSUNTO.test(t),
    });
  }
  return itens;
}
