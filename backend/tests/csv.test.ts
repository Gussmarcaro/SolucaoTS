import { describe, expect, it } from 'vitest';
import { pareceCabecalho, registrosCsv, textoDeCsv } from '../src/shared/csv';
import { parsePlanoAplicacao } from '../src/infrastructure/parsers/parsePlanoAplicacao';
import { parseCronograma } from '../src/infrastructure/parsers/parseCronograma';
import { parseBensCedidos } from '../src/infrastructure/parsers/parseBensCedidos';

/**
 * Leitura de CSV — **sem banco**, e por isso roda em qualquer lugar.
 *
 * O defeito que trouxe estes testes: o usuário exportou o plano de trabalho do
 * próprio AUDESP e a importação recusou **as 158 linhas**, repetindo "ano
 * inválido (`"2026"`)". O arquivo estava correto; o leitor é que quebrava por
 * `\n` e por `;`, sem entender aspas — então todo campo chegava com as aspas
 * grudadas e a descrição de várias linhas virava registro solto.
 *
 * Errar aqui é caro e silencioso nos dois sentidos: recusando tudo (o caso
 * acima, que ao menos grita) ou **aceitando com o valor errado**, que ninguém
 * descobre até a prestação não fechar.
 */

/** Dois registros da exportação real do AUDESP, com a descrição de 8 linhas. */
const CSV_AUDESP = `"Grupo de despesas";"Categoria de despesas";"Ano";"Mês";"Valor";"Descrição"
"RECURSOS HUMANOS";"VALE ALIMENTAÇÃO";"2026";"Fevereiro";"258,76";""
"SERVIÇOS DE TERCEIROS";"OUTROS SERVIÇOS DE TERCEIROS PESSOA JURÍDICA";"2026";"Fevereiro";"26.935,00";"Outros Serviços de Terceiras
Pessoas Jurídica —
1 Fonoaudiólogas — 40 horas,
1 Psicóloga — 40 horas"
`;

describe('registrosCsv', () => {
  it('tira as aspas de cada campo', () => {
    expect(registrosCsv('"a";"b";"c"')).toEqual([['a', 'b', 'c']]);
  });

  it('mantém o separador que está dentro das aspas', () => {
    expect(registrosCsv('"a;b";"c"')).toEqual([['a;b', 'c']]);
  });

  it('mantém a quebra de linha que está dentro das aspas', () => {
    // É o caso da descrição do plano de trabalho: oito linhas, um campo só.
    const r = registrosCsv('"a";"linha 1\nlinha 2";"c"');
    expect(r).toHaveLength(1);
    expect(r[0][1]).toBe('linha 1\nlinha 2');
  });

  it('`""` dentro das aspas é uma aspa literal', () => {
    expect(registrosCsv('"cano de 3"" polegadas";"x"')).toEqual([['cano de 3" polegadas', 'x']]);
  });

  it('aspas no meio de campo solto são texto comum', () => {
    expect(registrosCsv('cano de 3" polegadas;x')).toEqual([['cano de 3" polegadas', 'x']]);
  });

  it('linha em branco não vira registro', () => {
    expect(registrosCsv('a;b\n\n\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('CRLF e arquivo sem quebra final', () => {
    expect(registrosCsv('a;b\r\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('tira o BOM, inclusive o lido como Latin-1', () => {
    expect(registrosCsv('﻿a;b')[0][0]).toBe('a');
    expect(registrosCsv('ï»¿a;b')[0][0]).toBe('a');
  });

  it('linha inteira entre aspas continua sendo lida em colunas', () => {
    // O exemplo de cronograma do TCESP vem assim. Pela regra do CSV isso é um
    // campo só; como nenhum formato nosso tem uma coluna só, ele é reaberto.
    expect(registrosCsv('"2024;ABRIL;5656"')).toEqual([['2024', 'ABRIL', '5656']]);
  });
});

describe('pareceCabecalho', () => {
  it('reconhece o cabeçalho da exportação do AUDESP', () => {
    expect(pareceCabecalho(['Grupo', 'Categoria', 'Ano', 'Mês', 'Valor', 'Descrição'], [2, 4])).toBe(
      true,
    );
  });

  it('não confunde linha de dado com cabeçalho', () => {
    expect(pareceCabecalho(['RECURSOS HUMANOS', 'FGTS', '2026', 'Março', '146,40', ''], [2, 4])).toBe(
      false,
    );
  });

  it('coluna vazia não faz cabeçalho', () => {
    expect(pareceCabecalho(['a', 'b', '', 'd', '', ''], [2, 4])).toBe(false);
  });
});

describe('parsePlanoAplicacao — a exportação do AUDESP', () => {
  const r = parsePlanoAplicacao(CSV_AUDESP);

  it('lê os dois itens, sem nenhum erro', () => {
    expect(r.erros).toEqual([]);
    expect(r.ignoradas).toBe(0);
    expect(r.itens).toHaveLength(2);
  });

  it('conta os registros como a planilha os mostra', () => {
    // Três linhas no Excel (cabeçalho + duas), não as onze do arquivo: a
    // descrição de várias linhas é uma linha só para quem olha a planilha.
    expect(r.totalLinhas).toBe(3);
  });

  it('o grupo vira categoria e a categoria vira subcategoria', () => {
    expect(r.itens[0].categoria).toBe('RECURSOS HUMANOS');
    expect(r.itens[0].subcategoria).toBe('VALE ALIMENTAÇÃO');
  });

  it('o valor em padrão BR chega como número', () => {
    expect(r.itens[0].valor).toBe(258.76);
    expect(r.itens[1].valor).toBe(26935);
  });

  it('o mês por nome vira 1–12 e o ano perde as aspas', () => {
    expect(r.itens[0].ano).toBe(2026);
    expect(r.itens[0].mes).toBe(2);
  });

  it('a descrição de várias linhas chega inteira', () => {
    expect(r.itens[1].descricao).toContain('Outros Serviços de Terceiras');
    expect(r.itens[1].descricao).toContain('1 Psicóloga — 40 horas');
  });

  it('descrição vazia continua nula, não string vazia', () => {
    expect(r.itens[0].descricao).toBeNull();
  });

  it('o formato antigo, sem aspas e sem cabeçalho, continua valendo', () => {
    const antigo = parsePlanoAplicacao(
      'BENS E MATERIAIS PERMANENTES;BENS E EQUIPAMENTOS DE INFORMÁTICA;2024;Janeiro;100;\n' +
        'BENS E MATERIAIS PERMANENTES;OUTROS;2024;Março;300;',
    );
    expect(antigo.erros).toEqual([]);
    expect(antigo.itens).toHaveLength(2);
    expect(antigo.itens[1].mes).toBe(3);
  });

  it('linha ruim no meio do arquivo continua sendo erro', () => {
    const comLixo = parsePlanoAplicacao('"A";"B";"2026";"Janeiro";"10,00";""\n"A";"B";"ano";"x";"y";""');
    expect(comLixo.itens).toHaveLength(1);
    expect(comLixo.erros).toHaveLength(1);
    expect(comLixo.erros[0]).toContain('Linha 2');
  });
});

describe('parseCronograma e parseBensCedidos — mesma leitura', () => {
  it('cronograma: exemplo do TCESP, linha inteira entre aspas', () => {
    const r = parseCronograma('"2024;ABRIL;5656"\n"2024;maio;0,3"\n"2024;6;1.200"');
    expect(r.erros).toEqual([]);
    expect(r.itens).toEqual([
      { ano: 2024, mes: 4, valor: 5656 },
      { ano: 2024, mes: 5, valor: 0.3 },
      { ano: 2024, mes: 6, valor: 1200 },
    ]);
  });

  it('cronograma: exportação com cabeçalho e aspas por campo', () => {
    const r = parseCronograma('"Ano";"Mês";"Valor"\n"2026";"Janeiro";"1.000,50"');
    expect(r.erros).toEqual([]);
    expect(r.itens).toEqual([{ ano: 2026, mes: 1, valor: 1000.5 }]);
  });

  it('bens cedidos: cabeçalho reconhecido, data e valor lidos', () => {
    const r = parseBensCedidos('"Identificador";"Data";"Valor";"Código"\n"1";"01/04/2024";"0";"aaa"');
    expect(r.erros).toEqual([]);
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].identificador).toBe('1');
    expect(r.itens[0].codigo).toBe('aaa');
  });
});

describe('textoDeCsv — o encoding do arquivo enviado', () => {
  it('UTF-8 é lido como UTF-8', () => {
    const buf = Buffer.from('"RECURSOS HUMANOS";"VALE ALIMENTAÇÃO";"2026"', 'utf8');
    expect(textoDeCsv(buf)).toContain('VALE ALIMENTAÇÃO');
  });

  it('Windows-1252 continua sendo lido como latin1', () => {
    // É o encoding do CSV publicado pelo TCESP; lê-lo como UTF-8 quebraria os
    // acentos das rubricas, que foi o motivo de o latin1 estar fixo antes.
    const buf = Buffer.from('MARÇO;ALIMENTAÇÃO', 'latin1');
    expect(textoDeCsv(buf)).toBe('MARÇO;ALIMENTAÇÃO');
  });

  it('o arquivo do AUDESP atravessa inteiro, com acento e travessão', () => {
    const buf = Buffer.from('"SERVIÇOS";"1 Psicóloga — 40 horas";"2026"', 'utf8');
    const campos = registrosCsv(textoDeCsv(buf))[0];
    expect(campos[0]).toBe('SERVIÇOS');
    expect(campos[1]).toBe('1 Psicóloga — 40 horas');
  });
});
