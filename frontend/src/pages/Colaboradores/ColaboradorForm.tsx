import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BuscaCbo } from '@/components/ui/BuscaCbo';
import { apenasDigitos, mascaraCpfCnpj, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { isCpfValido } from '@/lib/validators';
import { atualizarColaborador, criarColaborador } from '@/services/colaboradores.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { Colaborador, ColaboradorPayload } from '@/types/colaborador';

interface Props {
  colaborador?: Colaborador | null;
  onSuccess: () => void;
  onCancel: () => void;
}

type Campos = {
  nome: string;
  cpf: string;
  cargo: string;
  cbo: string;
  cns: string;
  dataAdmissao: string;
  dataDemissao: string;
  salario: string;
};

function estadoInicial(c?: Colaborador | null): Campos {
  return {
    nome: c?.nome ?? '',
    cpf: c?.cpf ?? '',
    cargo: c?.cargo ?? '',
    cbo: c?.cbo ?? '',
    cns: c?.cns ?? '',
    dataAdmissao: c?.dataAdmissao ?? '',
    dataDemissao: c?.dataDemissao ?? '',
    salario: c ? numeroParaMascaraMoeda(c.salarioContratual) : '',
  };
}

export function ColaboradorForm({ colaborador, onSuccess, onCancel }: Props) {
  const editando = !!colaborador;
  const [form, setForm] = useState<Campos>(() => estadoInicial(colaborador));
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const set = (campo: keyof Campos, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
    setAlerta(null);
  };

  function validar(): boolean {
    const novos: Partial<Record<keyof Campos, string>> = {};
    if (form.nome.trim().length < 2) novos.nome = 'Informe o nome do colaborador.';
    if (!isCpfValido(form.cpf)) novos.cpf = 'CPF inválido.';
    if (!form.cargo.trim()) novos.cargo = 'Informe o cargo / função.';
    if (form.cbo && apenasDigitos(form.cbo).length !== 6) novos.cbo = 'CBO deve ter 6 dígitos.';
    if (form.cns && apenasDigitos(form.cns).length !== 15) novos.cns = 'CNS deve ter 15 dígitos.';
    if (!form.dataAdmissao) novos.dataAdmissao = 'Informe a data de admissão.';
    if (form.dataDemissao && form.dataDemissao < form.dataAdmissao)
      novos.dataDemissao = 'A demissão não pode ser anterior à admissão.';
    if (moedaParaNumero(form.salario) <= 0) novos.salario = 'Informe o salário contratual.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: ColaboradorPayload = {
      nome: form.nome.trim(),
      cpf: apenasDigitos(form.cpf),
      cargo: form.cargo.trim(),
      cbo: form.cbo ? apenasDigitos(form.cbo) : null,
      cns: form.cns ? apenasDigitos(form.cns) : null,
      dataAdmissao: form.dataAdmissao,
      dataDemissao: form.dataDemissao || null,
      salarioContratual: moedaParaNumero(form.salario),
    };

    setSalvando(true);
    try {
      if (editando) await atualizarColaborador(colaborador!.id, payload);
      else await criarColaborador(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o colaborador.');
      if (codigo === 'CPF_DUPLICADO') setErros((prev) => ({ ...prev, cpf: msg }));
      setAlerta(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {alerta && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{alerta}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Nome *" name="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} error={erros.nome} />
        </div>
        <Input
          label="CPF *"
          name="cpf"
          value={mascaraCpfCnpj(form.cpf)}
          onChange={(e) => set('cpf', e.target.value)}
          error={erros.cpf}
          placeholder="000.000.000-00"
          inputMode="numeric"
        />
        <Input label="Cargo / Função *" name="cargo" value={form.cargo} onChange={(e) => set('cargo', e.target.value)} error={erros.cargo} />

        <BuscaCbo
          name="cbo"
          value={apenasDigitos(form.cbo).slice(0, 6)}
          onChange={(codigo) => set('cbo', codigo)}
          error={erros.cbo}
          hint="Classificação Brasileira de Ocupações (CBO 2002)."
        />
        <Input
          label="CNS"
          name="cns"
          value={apenasDigitos(form.cns).slice(0, 15)}
          onChange={(e) => set('cns', e.target.value)}
          error={erros.cns}
          hint="Cartão Nacional de Saúde (profissionais de saúde)."
          placeholder="000000000000000"
          inputMode="numeric"
        />

        <Input label="Data de Admissão *" name="dataAdmissao" type="date" value={form.dataAdmissao} onChange={(e) => set('dataAdmissao', e.target.value)} error={erros.dataAdmissao} />
        <Input label="Data de Demissão" name="dataDemissao" type="date" value={form.dataDemissao} onChange={(e) => set('dataDemissao', e.target.value)} error={erros.dataDemissao} hint="Deixe em branco se ativo." />

        <Input
          label="Salário Contratual (R$) *"
          name="salario"
          value={form.salario}
          onChange={(e) => set('salario', mascaraMoeda(e.target.value))}
          error={erros.salario}
          placeholder="0,00"
          inputMode="numeric"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
        </Button>
      </div>
    </form>
  );
}
