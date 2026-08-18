import { describe, expect, it } from 'vitest';
import { isCnpjValido, isCpfValido, isDocumentoValido, isEmailValido, isSenhaForte } from './validators';

/**
 * Validação de documento — aritmética de dígito verificador.
 *
 * É o tipo de código que erra em silêncio: um peso trocado aceita documento
 * inválido, o cadastro segue normal, e o erro só aparece na **rejeição do
 * TCESP**, meses depois, quando a prestação já foi transmitida.
 *
 * Os números usados são gerados pelo próprio algoritmo (não são de pessoas
 * reais) — o que se prova aqui é a conta, não um cadastro.
 */

describe('CPF', () => {
  it('aceita dígitos verificadores corretos', () => {
    for (const cpf of ['52998224725', '11144477735', '12345678909']) {
      expect(isCpfValido(cpf), cpf).toBe(true);
    }
  });

  it('aceita com máscara', () => {
    expect(isCpfValido('529.982.247-25')).toBe(true);
  });

  it('recusa o último dígito trocado', () => {
    // O caso que mais importa: um erro de digitação, não um lixo qualquer.
    expect(isCpfValido('52998224724')).toBe(false);
  });

  it('recusa o penúltimo dígito trocado', () => {
    expect(isCpfValido('52998224715')).toBe(false);
  });

  it('recusa todos os dígitos iguais', () => {
    // Passam na conta dos verificadores, mas não existem. Sem a regra
    // explícita, "111.111.111-11" entraria no cadastro.
    for (const cpf of ['00000000000', '11111111111', '99999999999']) {
      expect(isCpfValido(cpf), cpf).toBe(false);
    }
  });

  it('recusa tamanho errado', () => {
    expect(isCpfValido('5299822472')).toBe(false);
    expect(isCpfValido('529982247251')).toBe(false);
    expect(isCpfValido('')).toBe(false);
  });
});

describe('CNPJ', () => {
  it('aceita dígitos verificadores corretos', () => {
    for (const cnpj of ['11222333000181', '11444777000161']) {
      expect(isCnpjValido(cnpj), cnpj).toBe(true);
    }
  });

  it('aceita com máscara', () => {
    expect(isCnpjValido('11.222.333/0001-81')).toBe(true);
  });

  it('recusa dígito verificador trocado', () => {
    expect(isCnpjValido('11222333000182')).toBe(false);
    expect(isCnpjValido('11222333000171')).toBe(false);
  });

  it('recusa todos os dígitos iguais', () => {
    expect(isCnpjValido('00000000000000')).toBe(false);
    expect(isCnpjValido('11111111111111')).toBe(false);
  });

  it('recusa tamanho errado', () => {
    expect(isCnpjValido('1122233300018')).toBe(false);
    expect(isCnpjValido('112223330001811')).toBe(false);
  });
});

describe('documento pelo tamanho', () => {
  it('escolhe a validação certa', () => {
    expect(isDocumentoValido('52998224725')).toBe(true);
    expect(isDocumentoValido('11222333000181')).toBe(true);
    expect(isDocumentoValido('52998224724')).toBe(false);
  });
});

describe('e-mail', () => {
  it('aceita os formatos usuais', () => {
    expect(isEmailValido('fulano@prefeitura.sp.gov.br')).toBe(true);
    expect(isEmailValido('  espaco@teste.com  ')).toBe(true);
  });

  it('recusa o que não tem arroba ou domínio', () => {
    for (const e of ['fulano', 'fulano@', '@dominio.com', 'fulano@dominio', 'a b@c.com']) {
      expect(isEmailValido(e), e).toBe(false);
    }
  });
});

describe('força de senha', () => {
  it('exige tamanho, maiúscula, número e especial', () => {
    expect(isSenhaForte('SenhaForte1!')).toBe(true);
    expect(isSenhaForte('senhaforte1!')).toBe(false); // sem maiúscula
    expect(isSenhaForte('SenhaForte!')).toBe(false); // sem número
    expect(isSenhaForte('SenhaForte1')).toBe(false); // sem especial
    expect(isSenhaForte('Sf1!')).toBe(false); // curta
  });
});
