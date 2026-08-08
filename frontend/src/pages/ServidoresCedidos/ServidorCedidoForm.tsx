import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { apenasDigitos, mascaraCpfCnpj, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { isCpfValido } from '@/lib/validators';
import { atualizarServidorCedido, criarServidorCedido } from '@/services/servidoresCedidos.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { ServidorCedido, ServidorCedidoPayload } from '@/types/servidorCedido';

interface Props {
  servidor?: ServidorCedido | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ONUS_OPCOES = ['Com ônus (cedente)', 'Sem ônus (cessionária)'];

type Campos = {
  nome: string;
  cpf: string;
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: string;
  cargaHoraria: string;
  remuneracao: string;
  dataInicialCessao: string;
  dataFinalCessao: string;
};

function estadoInicial(s?: ServidorCedido | null): Campos {
  return {
    nome: s?.nome ?? '',
    cpf: s?.cpf ?? '',
    cargoPublico: s?.cargoPublico ?? '',
    funcaoEntidade: s?.funcaoEntidade ?? '',
    onusPagamento: s?.onusPagamento ?? '',
    cargaHoraria: s?.cargaHoraria != null ? String(s.cargaHoraria) : '',
    remuneracao: s ? numeroParaMascaraMoeda(s.remuneracaoBruta) : '',
    dataInicialCessao: s?.dataInicialCessao ?? '',
    dataFinalCessao: s?.dataFinalCessao ?? '',
  };
}

export function ServidorCedidoForm({ servidor, onSuccess, onCancel }: Props) {
  const editando = !!servidor;
  const [form, setForm] = useState<Campos>(() => estadoInicial(servidor));
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
    if (form.nome.trim().length < 2) novos.nome = 'Informe o nome do servidor.';
    if (!isCpfValido(form.cpf)) novos.cpf = 'CPF inválido.';
    if (!form.cargoPublico.trim()) novos.cargoPublico = 'Informe o cargo público.';
    if (!form.funcaoEntidade.trim()) novos.funcaoEntidade = 'Informe a função na entidade.';
    if (!form.onusPagamento) novos.onusPagamento = 'Selecione o ônus.';
    if (moedaParaNumero(form.remuneracao) <= 0) novos.remuneracao = 'Informe a remuneração bruta.';
    if (!form.dataInicialCessao) novos.dataInicialCessao = 'Informe a data inicial.';
    if (form.dataFinalCessao && form.dataFinalCessao < form.dataInicialCessao)
      novos.dataFinalCessao = 'A data final não pode ser anterior à inicial.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: ServidorCedidoPayload = {
      nome: form.nome.trim(),
      cpf: apenasDigitos(form.cpf),
      cargoPublico: form.cargoPublico.trim(),
      funcaoEntidade: form.funcaoEntidade.trim(),
      onusPagamento: form.onusPagamento,
      cargaHoraria: form.cargaHoraria ? Number(apenasDigitos(form.cargaHoraria)) : null,
      remuneracaoBruta: moedaParaNumero(form.remuneracao),
      dataInicialCessao: form.dataInicialCessao,
      dataFinalCessao: form.dataFinalCessao || null,
    };

    setSalvando(true);
    try {
      if (editando) await atualizarServidorCedido(servidor!.id, payload);
      else await criarServidorCedido(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o servidor.');
      if (codigo === 'CPF_DUPLICADO') setErros((prev) => ({ ...prev, cpf: msg }));
      setAlerta(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormularioNovo novo={!editando}>
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
          <Input label="Cargo Público *" name="cargoPublico" value={form.cargoPublico} onChange={(e) => set('cargoPublico', e.target.value)} error={erros.cargoPublico} />

          <Input label="Função na Entidade *" name="funcaoEntidade" value={form.funcaoEntidade} onChange={(e) => set('funcaoEntidade', e.target.value)} error={erros.funcaoEntidade} />
          <Select
            label="Ônus do Pagamento *"
            name="onusPagamento"
            value={form.onusPagamento}
            onChange={(e) => set('onusPagamento', e.target.value)}
            error={erros.onusPagamento}
            options={ONUS_OPCOES.map((o) => ({ value: o, label: o }))}
            placeholder="Selecione..."
          />

          <Input
            label="Carga Horária Semanal"
            name="cargaHoraria"
            value={apenasDigitos(form.cargaHoraria).slice(0, 3)}
            onChange={(e) => set('cargaHoraria', e.target.value)}
            placeholder="ex.: 40"
            inputMode="numeric"
          />
          <Input
            label="Remuneração Bruta (R$) *"
            name="remuneracao"
            value={form.remuneracao}
            onChange={(e) => set('remuneracao', mascaraMoeda(e.target.value))}
            error={erros.remuneracao}
            placeholder="0,00"
            inputMode="numeric"
          />

          <Input label="Início da Cessão *" name="dataInicialCessao" type="date" value={form.dataInicialCessao} onChange={(e) => set('dataInicialCessao', e.target.value)} error={erros.dataInicialCessao} />
          <Input label="Fim da Cessão" name="dataFinalCessao" type="date" value={form.dataFinalCessao} onChange={(e) => set('dataFinalCessao', e.target.value)} error={erros.dataFinalCessao} hint="Em branco = em vigor." />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Servidor'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
