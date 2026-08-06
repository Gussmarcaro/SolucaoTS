import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { atualizarBemCedido, criarBemCedido } from '@/services/bensCedidos.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import type { BemCedido, BemCedidoPayload } from '@/types/bemCedido';

interface Props {
  bem?: BemCedido | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const TIPOS = ['Móvel', 'Imóvel', 'Veículo', 'Equipamento', 'Outros'];

type Campos = {
  descricao: string;
  tipo: string;
  identificador: string;
  valor: string;
  dataCessao: string;
  dataDevolucao: string;
  observacao: string;
};

function estadoInicial(b?: BemCedido | null): Campos {
  return {
    descricao: b?.descricao ?? '',
    tipo: b?.tipo ?? '',
    identificador: b?.identificador ?? '',
    valor: b ? numeroParaMascaraMoeda(b.valor) : '',
    dataCessao: b?.dataCessao ?? '',
    dataDevolucao: b?.dataDevolucao ?? '',
    observacao: b?.observacao ?? '',
  };
}

export function BemCedidoForm({ bem, onSuccess, onCancel }: Props) {
  const editando = !!bem;
  const [form, setForm] = useState<Campos>(() => estadoInicial(bem));
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
    if (form.descricao.trim().length < 2) novos.descricao = 'Informe a descrição do bem.';
    if (!form.tipo) novos.tipo = 'Selecione o tipo.';
    if (!form.identificador.trim()) novos.identificador = 'Informe o identificador.';
    if (moedaParaNumero(form.valor) <= 0) novos.valor = 'Informe o valor do bem.';
    if (!form.dataCessao) novos.dataCessao = 'Informe a data de cessão.';
    if (form.dataDevolucao && form.dataDevolucao < form.dataCessao)
      novos.dataDevolucao = 'A devolução não pode ser anterior à cessão.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: BemCedidoPayload = {
      descricao: form.descricao.trim(),
      tipo: form.tipo,
      identificador: form.identificador.trim(),
      valor: moedaParaNumero(form.valor),
      dataCessao: form.dataCessao,
      dataDevolucao: form.dataDevolucao || null,
      observacao: form.observacao.trim() || null,
    };

    setSalvando(true);
    try {
      if (editando) await atualizarBemCedido(bem!.id, payload);
      else await criarBemCedido(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o bem.');
      if (codigo === 'IDENTIFICADOR_DUPLICADO') setErros((prev) => ({ ...prev, identificador: msg }));
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
          <Input label="Descrição *" name="descricao" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} error={erros.descricao} />
        </div>
        <Select
          label="Tipo *"
          name="tipo"
          value={form.tipo}
          onChange={(e) => set('tipo', e.target.value)}
          error={erros.tipo}
          options={TIPOS.map((t) => ({ value: t, label: t }))}
          placeholder="Selecione..."
        />
        <Input label="Identificador *" name="identificador" value={form.identificador} onChange={(e) => set('identificador', e.target.value)} error={erros.identificador} hint="Nº de patrimônio, placa, etc." />

        <Input
          label="Valor (R$) *"
          name="valor"
          value={form.valor}
          onChange={(e) => set('valor', mascaraMoeda(e.target.value))}
          error={erros.valor}
          placeholder="0,00"
          inputMode="numeric"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Data de Cessão *" name="dataCessao" type="date" value={form.dataCessao} onChange={(e) => set('dataCessao', e.target.value)} error={erros.dataCessao} />
          <Input label="Data de Devolução" name="dataDevolucao" type="date" value={form.dataDevolucao} onChange={(e) => set('dataDevolucao', e.target.value)} error={erros.dataDevolucao} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="observacao" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">
            Observação
          </label>
          <textarea
            id="observacao"
            name="observacao"
            value={form.observacao}
            onChange={(e) => set('observacao', e.target.value)}
            rows={2}
            className="focus-ring w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 transition-colors dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            placeholder="Detalhes adicionais (opcional)."
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Bem'}
        </Button>
      </div>
    </form>
  );
}
