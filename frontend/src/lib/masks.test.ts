import { describe, expect, it } from 'vitest';
import {
  apenasDigitos,
  dataBr,
  formatarMoeda,
  mascaraCpfCnpj,
  mascaraMoeda,
  moedaParaNumero,
  numeroParaMascaraMoeda,
  tipoDocumento,
} from './masks';

/**
 * Máscaras e conversão de moeda.
 *
 * Aqui o erro não é estético: `moedaParaNumero` é o que transforma o que o
 * usuário digitou no valor que vai para a prestação de contas. Uma casa
 * decimal a mais ou a menos passa despercebida na tela e vira divergência no
 * TCESP.
 */

describe('moeda', () => {
  it('vai e volta sem perder valor', () => {
    // A ida-e-volta é a propriedade que interessa: o formulário preenche com
    // `numeroParaMascaraMoeda` e lê de volta com `moedaParaNumero`.
    for (const n of [0, 0.01, 1, 1500, 1522632.45, 999999.99]) {
      expect(moedaParaNumero(numeroParaMascaraMoeda(n)), String(n)).toBe(n);
    }
  });

  it('lê o padrão brasileiro digitado', () => {
    expect(moedaParaNumero('1.522.632,45')).toBe(1522632.45);
    expect(moedaParaNumero('0,01')).toBe(0.01);
    expect(moedaParaNumero('R$ 1.500,00')).toBe(1500);
  });

  it('campo vazio é zero, não NaN', () => {
    // NaN aqui vaza para o payload e o backend recusa com mensagem obscura.
    expect(moedaParaNumero('')).toBe(0);
    expect(moedaParaNumero('abc')).toBe(0);
  });

  it('a máscara trata a digitação como centavos', () => {
    expect(mascaraMoeda('1')).toBe('0,01');
    expect(mascaraMoeda('150')).toBe('1,50');
    expect(mascaraMoeda('152263245')).toBe('1.522.632,45');
    expect(mascaraMoeda('')).toBe('');
  });

  it('centavos não se perdem no arredondamento', () => {
    // 0.1 + 0.2 e afins: o campo guarda centavos inteiros de propósito.
    expect(numeroParaMascaraMoeda(1234.56)).toBe('1.234,56');
    expect(numeroParaMascaraMoeda(0.1 + 0.2)).toBe('0,30');
  });

  it('formata para exibição em BRL', () => {
    expect(formatarMoeda(1500)).toMatch(/R\$\s?1\.500,00/);
    expect(formatarMoeda(0)).toMatch(/R\$\s?0,00/);
  });
});

describe('documento', () => {
  it('mascara conforme o tamanho', () => {
    expect(mascaraCpfCnpj('52998224725')).toBe('529.982.247-25');
    expect(mascaraCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('mascara parcialmente enquanto se digita', () => {
    expect(mascaraCpfCnpj('529')).toBe('529');
    expect(mascaraCpfCnpj('529982')).toBe('529.982');
  });

  it('reconhece o tipo pelo tamanho', () => {
    expect(tipoDocumento('52998224725')).toBe('CPF');
    expect(tipoDocumento('11222333000181')).toBe('CNPJ');
  });

  it('apenasDigitos descarta o resto', () => {
    expect(apenasDigitos('529.982.247-25')).toBe('52998224725');
    expect(apenasDigitos('abc')).toBe('');
  });
});

describe('data', () => {
  it('converte ISO para o formato brasileiro', () => {
    expect(dataBr('2026-08-19')).toBe('19/08/2026');
  });

  it('vazio vira travessão em vez de "Invalid Date"', () => {
    expect(dataBr(null)).toBe('—');
    expect(dataBr(undefined)).toBe('—');
    expect(dataBr('')).toBe('—');
  });

  it('não desloca o dia por fuso horário', () => {
    // O erro clássico: `new Date('2026-01-01')` é UTC e, em GMT-3, exibe 31/12.
    expect(dataBr('2026-01-01')).toBe('01/01/2026');
    expect(dataBr('2026-12-31')).toBe('31/12/2026');
  });
});
