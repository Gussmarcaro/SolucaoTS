import { describe, expect, it } from 'vitest';
import { lerComunicadosTcesp, lerNoticiasTcesp } from '../src/core/noticia/paginaTcesp';
import {
  ESPERA_FALHA_MS,
  NoticiasUseCase,
  VALIDADE_MS,
} from '../src/application/noticia/NoticiasUseCase';

/**
 * Trecho real da listagem de https://www.tce.sp.gov.br/noticias (26/11/2026).
 * Se o TCESP mudar o tema do site, é aqui que se reescreve o trecho e o leitor.
 */
const TRECHO = `
<div class="view-content"><div class="col-sm-6"><div data-history-node-id="68334" class="ds-1col clearfix">
<div class="listagem-noticia">
<div class="field--label-hidden field--item"> <a href="/6524-tribunal-contas-lanca-17a-edicao-revista-cadernos-epcp" hreflang="zxx">
<img loading="lazy" src="/sites/default/files/x.png" alt="Revista" class="img-responsive" />
</a></div>
<div class="field--label-hidden field--item">
<h2> <a href="/6524-tribunal-contas-lanca-17a-edicao-revista-cadernos-epcp" hreflang="zxx">Tribunal de Contas lança 17ª edição da Revista Cadernos da EPCP</a>
</h2></div>
<div class="field--label-hidden field--item"> 26/11/2026 - O Tribunal de Contas do Estado de S&atilde;o Paulo (TCESP) informa que foi publicada a 17&#170; edição...</div>
</div></div></div>
<div class="col-sm-6"><div class="ds-1col clearfix"><div class="listagem-noticia">
<div class="field--label-hidden field--item">
<h2> <a href="/6523-novo-layout-audesp" hreflang="zxx">Comunicado sobre o &quot;Audesp&quot; Fase V</a></h2></div>
<div class="field--label-hidden field--item">Sem data no começo.</div>
</div></div></div>`;

describe('lerNoticiasTcesp', () => {
  it('reconhece título, link absoluto, data e resumo', () => {
    const [a, b] = lerNoticiasTcesp(TRECHO);
    expect(a.titulo).toBe('Tribunal de Contas lança 17ª edição da Revista Cadernos da EPCP');
    expect(a.link).toBe('https://www.tce.sp.gov.br/6524-tribunal-contas-lanca-17a-edicao-revista-cadernos-epcp');
    expect(a.data).toBe('2026-11-26');
    expect(a.resumo.startsWith('O Tribunal de Contas do Estado de São Paulo')).toBe(true);
    expect(a.resumo).toContain('17ª');
    expect(a.destaque).toBe(false);

    expect(b.titulo).toBe('Comunicado sobre o "Audesp" Fase V');
    expect(b.data).toBeNull();
    expect(b.destaque).toBe(true);
  });

  it('página sem a estrutura esperada devolve lista vazia, sem lançar', () => {
    expect(lerNoticiasTcesp('<html><body>manutenção</body></html>')).toEqual([]);
    expect(lerNoticiasTcesp('')).toEqual([]);
  });

  it('não repete a mesma notícia', () => {
    expect(lerNoticiasTcesp(TRECHO + TRECHO)).toHaveLength(2);
  });
});

/** Trecho real de https://www.tce.sp.gov.br/audesp/comunicados (26/11/2026). */
const COMUNICADOS = `
<ul><li>
<div class="views-field views-field-nothing"><span class="field-content">
<div class="destaca">Comunicado</div> <br> <a href="/legislacao/comunicado/alteracao-datas-sessoes-camaras-e-tribunal-pleno" hreflang="pt-br">Alteração de datas de Sessões de Câmaras e Tribunal Pleno</a> &nbsp;&nbsp;&nbsp; </span></div>
<div class="views-field views-field-nothing-1"><span class="field-content">Área: SDG &nbsp;&nbsp;&nbsp; Nº: 58/2026 &nbsp;&nbsp;&nbsp; Publicação: <time datetime="2026-11-23T12:00:00Z">23/11/2026</time> &nbsp;&nbsp;&nbsp; </span></div>
</li>
<li>
<div class="views-field views-field-nothing"><span class="field-content">
<div class="destaca">Comunicado</div> <br> <a href="/legislacao/comunicado/consulta-situacao-entrega-fase-v-repasses-ao-terceiro-setor" hreflang="pt-br">Consulta à Situação de entrega na Fase V - Repasses ao Terceiro Setor</a> &nbsp;&nbsp;&nbsp; </span></div>
<div class="views-field views-field-nothing-1"><span class="field-content">Área: Audesp &nbsp;&nbsp;&nbsp; Nº: 50/2026 &nbsp;&nbsp;&nbsp; Publicação: <time datetime="2026-11-19T12:00:00Z">19/11/2026</time> &nbsp;&nbsp;&nbsp; </span></div>
</li>
<li><a href="/politica-privacidade">política de privacidade</a></li></ul>`;

describe('lerComunicadosTcesp', () => {
  it('reconhece título, área, número e data de publicação', () => {
    const [a, b, ...resto] = lerComunicadosTcesp(COMUNICADOS);
    expect(resto).toHaveLength(0);
    expect(a).toMatchObject({
      titulo: 'Alteração de datas de Sessões de Câmaras e Tribunal Pleno',
      link: 'https://www.tce.sp.gov.br/legislacao/comunicado/alteracao-datas-sessoes-camaras-e-tribunal-pleno',
      area: 'SDG',
      numero: '58/2026',
      data: '2026-11-23',
      destaque: false,
    });
    expect(b).toMatchObject({ area: 'Audesp', numero: '50/2026', data: '2026-11-19', destaque: true });
  });

  it('página sem comunicados devolve lista vazia', () => {
    expect(lerComunicadosTcesp('<ul><li>nada</li></ul>')).toEqual([]);
  });
});

describe('NoticiasUseCase', () => {
  function montar(respostas: (string | Error)[]) {
    let t = 1_000_000;
    let visitas = 0;
    const caso = new NoticiasUseCase(
      {
        async baixar() {
          const r = respostas[Math.min(visitas++, respostas.length - 1)];
          if (r instanceof Error) throw r;
          return r;
        },
      },
      lerNoticiasTcesp,
      () => t,
    );
    return { caso, avancar: (ms: number) => (t += ms), visitas: () => visitas };
  }

  it('guarda a leitura por meia hora', async () => {
    const m = montar([TRECHO]);
    expect((await m.caso.execute()).itens).toHaveLength(2);
    m.avancar(VALIDADE_MS - 1);
    await m.caso.execute();
    expect(m.visitas()).toBe(1);
    m.avancar(1);
    await m.caso.execute();
    expect(m.visitas()).toBe(2);
  });

  it('se o site cair, mantém a última lista e marca desatualizado', async () => {
    const m = montar([TRECHO, new Error('fora do ar')]);
    await m.caso.execute();
    m.avancar(VALIDADE_MS);
    const r = await m.caso.execute();
    expect(r.itens).toHaveLength(2);
    expect(r.desatualizado).toBe(true);
    // Não insiste a cada requisição: espera antes de tentar de novo.
    await m.caso.execute();
    expect(m.visitas()).toBe(2);
    m.avancar(ESPERA_FALHA_MS);
    await m.caso.execute();
    expect(m.visitas()).toBe(3);
  });

  it('página mudada não troca a lista boa por uma vazia', async () => {
    const m = montar([TRECHO, '<html>novo tema</html>']);
    await m.caso.execute();
    m.avancar(VALIDADE_MS);
    expect((await m.caso.execute()).itens).toHaveLength(2);
  });

  it('nunca deu certo: lista vazia, sem erro', async () => {
    const r = await montar([new Error('sem rede')]).caso.execute();
    expect(r).toEqual({ itens: [], lidoEm: null, desatualizado: true });
  });
});
