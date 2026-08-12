import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import {
  apenasDigitos,
  mascaraCpfCnpj,
  mascaraMoeda,
  moedaParaNumero,
  numeroParaMascaraMoeda,
  tipoDocumento,
} from '@/lib/masks';
import { isDocumentoValido } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { atualizarContrato, criarContrato } from '@/services/contratos.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { Contrato, ContratoPayload } from '@/types/contrato';

interface Props {
  contrato?: Contrato | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const NATUREZAS = [
  'Compras',
  'Serviços',
  'Serviços de Saúde',
  'Obras',
  'Locação',
  'Outros',
];

type Campos = {
  numero: string;
  credorNome: string;
  credorDocumento: string;
  naturezaContratacao: string;
  objeto: string;
  dataAssinatura: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  valor: string;
};

function estadoInicial(c?: Contrato | null): Campos {
  return {
    numero: c?.numero ?? '',
    credorNome: c?.credorNome ?? '',
    credorDocumento: c?.credorDocumento ?? '',
    naturezaContratacao: c?.naturezaContratacao ?? '',
    objeto: c?.objeto ?? '',
    dataAssinatura: c?.dataAssinatura ?? '',
    vigenciaInicio: c?.vigenciaInicio ?? '',
    vigenciaFim: c?.vigenciaFim ?? '',
    valor: c ? numeroParaMascaraMoeda(c.valorMontante) : '',
  };
}

export function ContratoForm({ contrato, onSuccess, onCancel }: Props) {
  const editando = !!contrato;
  const [form, setForm] = useState<Campos>(() => estadoInicial(contrato));
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
    if (!form.numero.trim()) novos.numero = 'Informe o número do contrato.';
    if (form.credorNome.trim().length < 2) novos.credorNome = 'Informe o credor.';
    if (!isDocumentoValido(form.credorDocumento)) novos.credorDocumento = 'CPF/CNPJ inválido.';
    if (!form.naturezaContratacao) novos.naturezaContratacao = 'Selecione a natureza.';
    if (!form.objeto.trim()) novos.objeto = 'Descreva o objeto do contrato.';
    if (!form.dataAssinatura) novos.dataAssinatura = 'Informe a data de assinatura.';
    if (!form.vigenciaInicio) novos.vigenciaInicio = 'Informe o início da vigência.';
    if (form.vigenciaFim && form.vigenciaFim < form.vigenciaInicio)
      novos.vigenciaFim = 'O fim não pode ser anterior ao início.';
    if (moedaParaNumero(form.valor) <= 0) novos.valor = 'Informe o valor do contrato.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: ContratoPayload = {
      numero: form.numero.trim(),
      credorNome: form.credorNome.trim(),
      credorDocumento: apenasDigitos(form.credorDocumento),
      credorDocumentoTipo: tipoDocumento(form.credorDocumento),
      naturezaContratacao: form.naturezaContratacao,
      objeto: form.objeto.trim(),
      dataAssinatura: form.dataAssinatura,
      vigenciaInicio: form.vigenciaInicio,
      vigenciaFim: form.vigenciaFim || null,
      valorMontante: moedaParaNumero(form.valor),
    };

    setSalvando(true);
    try {
      if (editando) await atualizarContrato(contrato!.id, payload);
      else await criarContrato(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o contrato.');
      if (codigo === 'CONTRATO_DUPLICADO') setErros((prev) => ({ ...prev, numero: msg }));
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
          <Input label="Número do Contrato *" name="numero" value={form.numero} onChange={(e) => set('numero', e.target.value)} error={erros.numero} />
          <Input
            label="Valor do Contrato (R$) *"
            name="valor"
            value={form.valor}
            onChange={(e) => set('valor', mascaraMoeda(e.target.value))}
            error={erros.valor}
            placeholder="0,00"
            inputMode="numeric"
          />

          <div className="sm:col-span-2">
            <Input label="Credor (Nome / Razão Social) *" name="credorNome" value={form.credorNome} onChange={(e) => set('credorNome', capitalizarNome(e.target.value))} error={erros.credorNome} />
          </div>
          <Input
            label="CPF / CNPJ do Credor *"
            name="credorDocumento"
            value={mascaraCpfCnpj(form.credorDocumento)}
            onChange={(e) => set('credorDocumento', e.target.value)}
            error={erros.credorDocumento}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
          <Select
            label="Natureza da Contratação *"
            name="naturezaContratacao"
            value={form.naturezaContratacao}
            onChange={(e) => set('naturezaContratacao', e.target.value)}
            error={erros.naturezaContratacao}
            options={NATUREZAS.map((n) => ({ value: n, label: n }))}
            placeholder="Selecione..."
          />

          <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-3">
            <Input label="Data de Assinatura *" name="dataAssinatura" type="date" value={form.dataAssinatura} onChange={(e) => set('dataAssinatura', e.target.value)} error={erros.dataAssinatura} />
            <Input label="Início da Vigência *" name="vigenciaInicio" type="date" value={form.vigenciaInicio} onChange={(e) => set('vigenciaInicio', e.target.value)} error={erros.vigenciaInicio} />
            <Input label="Fim da Vigência" name="vigenciaFim" type="date" value={form.vigenciaFim} onChange={(e) => set('vigenciaFim', e.target.value)} error={erros.vigenciaFim} hint="Em branco = indeterminada." />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="objeto" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">
              Objeto *
            </label>
            <textarea
              id="objeto"
              name="objeto"
              value={form.objeto}
              onChange={(e) => set('objeto', e.target.value)}
              rows={3}
              className={`focus-ring w-full rounded-xl border bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 transition-colors dark:bg-ink-900 dark:text-ink-100 ${
                erros.objeto ? 'border-red-400 dark:border-red-500' : 'border-ink-200 dark:border-ink-700'
              }`}
              placeholder="Descreva o objeto do contrato."
            />
            {erros.objeto && <p className="mt-1 text-xs font-medium text-red-500">{erros.objeto}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Contrato'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
