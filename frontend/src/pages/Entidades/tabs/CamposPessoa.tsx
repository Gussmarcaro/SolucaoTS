import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { UF_OPTIONS } from '@/lib/ufs';
import { apenasDigitos, mascaraCelular, mascaraCep, mascaraCpf } from '@/lib/masks';
import { isCpfValido, isEmailValido } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { consultarCep } from '@/services/viacep.service';
import type { PessoaVinculada } from '@/types/entidadeComplementos';

/**
 * Campos de pessoa compartilhados por Diretoria e Conselhos — mesmos rótulos,
 * máscaras e busca de CEP do cadastro de Usuários.
 */
export type EstadoPessoa = {
  nome: string;
  cpf: string;
  dataNascimento: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  telefone: string;
  cargo: string;
  dataEntrada: string;
  dataSaida: string;
};

export type ErrosPessoa = Partial<Record<keyof EstadoPessoa, string>>;

export function pessoaInicial(p?: Partial<PessoaVinculada> | null): EstadoPessoa {
  return {
    nome: p?.nome ?? '',
    cpf: p?.cpf ?? '',
    dataNascimento: p?.dataNascimento ?? '',
    cep: p?.cep ?? '',
    logradouro: p?.logradouro ?? '',
    numero: p?.numero ?? '',
    complemento: p?.complemento ?? '',
    bairro: p?.bairro ?? '',
    cidade: p?.cidade ?? '',
    uf: p?.uf ?? '',
    email: p?.email ?? '',
    telefone: p?.telefone ?? '',
    cargo: p?.cargo ?? '',
    dataEntrada: p?.dataEntrada ?? '',
    dataSaida: p?.dataSaida ?? '',
  };
}

/** Espelha as validações do backend, para o erro aparecer sem ida ao servidor. */
export function validarPessoa(v: EstadoPessoa): ErrosPessoa {
  const erros: ErrosPessoa = {};
  if (v.nome.trim().length < 3) erros.nome = 'Informe o nome completo.';
  if (v.cpf && !isCpfValido(v.cpf)) erros.cpf = 'CPF inválido.';
  if (v.email && !isEmailValido(v.email)) erros.email = 'E-mail inválido.';
  if (v.telefone && apenasDigitos(v.telefone).length < 10) erros.telefone = 'Telefone inválido.';
  if (v.cep && apenasDigitos(v.cep).length !== 8) erros.cep = 'CEP inválido.';
  if (v.dataSaida && v.dataEntrada && v.dataSaida < v.dataEntrada)
    erros.dataSaida = 'A saída não pode ser anterior à entrada.';
  return erros;
}

/** Converte o estado da tela no formato do payload (nulos em vez de vazios). */
export function pessoaPayload(v: EstadoPessoa) {
  return {
    nome: v.nome.trim(),
    cpf: v.cpf ? apenasDigitos(v.cpf) : null,
    dataNascimento: v.dataNascimento || null,
    cep: v.cep ? apenasDigitos(v.cep) : null,
    logradouro: v.logradouro.trim() || null,
    numero: v.numero.trim() || null,
    complemento: v.complemento.trim() || null,
    bairro: v.bairro.trim() || null,
    cidade: v.cidade.trim() || null,
    uf: v.uf || null,
    email: v.email.trim().toLowerCase() || null,
    telefone: v.telefone ? apenasDigitos(v.telefone) : null,
    cargo: v.cargo.trim() || null,
    dataEntrada: v.dataEntrada || null,
    dataSaida: v.dataSaida || null,
  };
}

interface Props {
  valores: EstadoPessoa;
  erros: ErrosPessoa;
  set: (campo: keyof EstadoPessoa, valor: string) => void;
  /** Preenche vários campos de uma vez (usado pela busca de CEP). */
  preencher: (parcial: Partial<EstadoPessoa>) => void;
}

export function CamposPessoa({ valores, erros, set, preencher }: Props) {
  const [buscandoCep, setBuscandoCep] = useState(false);

  async function handleCepBlur() {
    if (apenasDigitos(valores.cep).length !== 8) return;
    setBuscandoCep(true);
    try {
      const endereco = await consultarCep(valores.cep);
      if (!endereco) return;
      preencher({
        logradouro: endereco.logradouro || valores.logradouro,
        bairro: endereco.bairro || valores.bairro,
        cidade: endereco.cidade || valores.cidade,
        uf: endereco.uf || valores.uf,
      });
    } catch {
      /* CEP indisponível não bloqueia o cadastro — o endereço pode ser digitado */
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
      <div className="sm:col-span-5">
        <Input label="Nome *" name="nome" value={valores.nome} onChange={(e) => set('nome', capitalizarNome(e.target.value))} error={erros.nome} />
      </div>
      <div className="sm:col-span-3">
        <Input label="CPF" name="cpf" value={mascaraCpf(valores.cpf)} onChange={(e) => set('cpf', e.target.value)} error={erros.cpf} placeholder="000.000.000-00" inputMode="numeric" />
      </div>
      <div className="sm:col-span-4">
        <Input label="Data de Nascimento" name="dataNascimento" type="date" value={valores.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} />
      </div>

      <div className="sm:col-span-2">
        <Input
          label="CEP"
          name="cep"
          value={mascaraCep(valores.cep)}
          onChange={(e) => set('cep', e.target.value)}
          onBlur={handleCepBlur}
          error={erros.cep}
          placeholder="00000-000"
          inputMode="numeric"
          rightSlot={buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        />
      </div>
      <div className="sm:col-span-8">
        <Input label="Endereço" name="logradouro" value={valores.logradouro} onChange={(e) => set('logradouro', e.target.value)} placeholder="Rua, Avenida..." />
      </div>
      <div className="sm:col-span-2">
        <Input label="Número" name="numero" value={valores.numero} onChange={(e) => set('numero', e.target.value)} placeholder="nº" />
      </div>

      <div className="sm:col-span-3">
        <Input label="Complemento" name="complemento" value={valores.complemento} onChange={(e) => set('complemento', e.target.value)} placeholder="Apto, bloco..." />
      </div>
      <div className="sm:col-span-3">
        <Input label="Bairro" name="bairro" value={valores.bairro} onChange={(e) => set('bairro', e.target.value)} />
      </div>
      <div className="sm:col-span-4">
        <Input label="Cidade" name="cidade" value={valores.cidade} onChange={(e) => set('cidade', e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Select label="UF" name="uf" value={valores.uf} onChange={(e) => set('uf', e.target.value)} options={UF_OPTIONS} placeholder="—" />
      </div>

      <div className="sm:col-span-5">
        <Input label="E-mail" name="email" type="email" value={valores.email} onChange={(e) => set('email', e.target.value)} error={erros.email} />
      </div>
      <div className="sm:col-span-3">
        <Input label="Telefone / Celular" name="telefone" value={mascaraCelular(valores.telefone)} onChange={(e) => set('telefone', e.target.value)} error={erros.telefone} placeholder="(00) 00000-0000" inputMode="numeric" />
      </div>
      <div className="sm:col-span-4">
        <Input label="Função / Cargo" name="cargo" value={valores.cargo} onChange={(e) => set('cargo', e.target.value)} />
      </div>
    </div>
  );
}

/** Painel "Vigência" — igual nas duas abas. */
export function PainelVigencia({ valores, erros, set }: Omit<Props, 'preencher'>) {
  return (
    <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700">
      <legend className="px-1 text-sm font-normal text-ink-600 dark:text-ink-300">Vigência</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Data de Entrada" name="dataEntrada" type="date" value={valores.dataEntrada} onChange={(e) => set('dataEntrada', e.target.value)} />
        <Input
          label="Data de Saída"
          name="dataSaida"
          type="date"
          value={valores.dataSaida}
          onChange={(e) => set('dataSaida', e.target.value)}
          error={erros.dataSaida}
          hint="Deixe vazia enquanto o membro estiver ativo."
        />
      </div>
    </fieldset>
  );
}
