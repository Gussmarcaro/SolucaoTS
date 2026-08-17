import { useEffect, useState } from 'react';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox, type OpcaoCombo } from '@/components/ui/Combobox';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { atualizarTarefa, criarTarefa } from '@/services/tarefas.service';
import { listarAjustes } from '@/services/ajustes.service';
import { listarUsuarios } from '@/services/usuarios.service';
import { extrairMensagemErro } from '@/services/http';
import {
  PRIORIDADE_LABEL,
  STATUS_LABEL,
  type PrioridadeTarefa,
  type StatusTarefa,
  type Tarefa,
  type TarefaPayload,
} from '@/types/tarefa';

interface Props {
  tarefa?: Tarefa | null;
  /** Valores pré-preenchidos por quem abriu (o sino, por exemplo). */
  inicial?: Partial<TarefaPayload> | null;
  onSuccess: (tarefa: Tarefa) => void;
  onCancel: () => void;
}

type Campos = {
  titulo: string;
  descricao: string;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  prazoLegal: string;
  ajusteId: string;
  responsavelId: string;
};

function estadoInicial(t?: Tarefa | null, i?: Partial<TarefaPayload> | null): Campos {
  return {
    titulo: t?.titulo ?? i?.titulo ?? '',
    descricao: t?.descricao ?? i?.descricao ?? '',
    prioridade: t?.prioridade ?? i?.prioridade ?? 'MEDIA',
    status: t?.status ?? 'PENDENTE',
    prazoLegal: t?.prazoLegal ?? i?.prazoLegal ?? '',
    ajusteId: t?.ajusteId ?? i?.ajusteId ?? '',
    responsavelId: t?.responsavelId ?? i?.responsavelId ?? '',
  };
}

export function TarefaForm({ tarefa, inicial, onSuccess, onCancel }: Props) {
  const editando = !!tarefa;
  const [form, setForm] = useState<Campos>(() => estadoInicial(tarefa, inicial));
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ajustes, setAjustes] = useState<OpcaoCombo[]>([]);
  const [usuarios, setUsuarios] = useState<OpcaoCombo[]>([]);

  // Listas de apoio. Falha aqui não impede salvar: os dois vínculos são
  // opcionais, e travar o cadastro da tarefa por causa de um combo seria pior
  // que deixar o campo vazio.
  useEffect(() => {
    let vivo = true;
    listarAjustes({ page: 1, pageSize: 100, orderBy: 'dataAssinatura', orderDir: 'desc' })
      .then((r) => {
        if (!vivo) return;
        setAjustes(
          r.data.map((a) => ({
            value: a.id,
            label: a.numero ? `${a.codigoAjuste} · nº ${a.numero}` : a.codigoAjuste,
            sub: a.entidadeNome,
          })),
        );
      })
      .catch(() => undefined);
    listarUsuarios({ filtros: { ativo: true }, page: 1, pageSize: 100 })
      .then((r) => {
        if (!vivo) return;
        setUsuarios(r.data.map((u) => ({ value: u.id, label: u.nome, sub: u.email })));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const set = <K extends keyof Campos>(campo: K, valor: Campos[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
    setAlerta(null);
  };

  function validar(): boolean {
    const novos: Partial<Record<keyof Campos, string>> = {};
    if (form.titulo.trim().length < 3) novos.titulo = 'Informe o título da tarefa.';
    if (!form.prazoLegal) novos.prazoLegal = 'Informe o prazo.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: TarefaPayload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      prioridade: form.prioridade,
      status: form.status,
      prazoLegal: form.prazoLegal,
      ajusteId: form.ajusteId || null,
      responsavelId: form.responsavelId || null,
      // Só na criação: a origem é imutável, e o servidor a ignora na edição.
      ...(editando ? {} : { origemAlerta: inicial?.origemAlerta ?? null }),
    };

    setSalvando(true);
    try {
      const salva = editando
        ? await atualizarTarefa(tarefa!.id, payload)
        : await criarTarefa(payload);
      onSuccess(salva);
    } catch (error) {
      setAlerta(extrairMensagemErro(error, 'Não foi possível salvar a tarefa.'));
    } finally {
      setSalvando(false);
    }
  }

  const origem = tarefa?.origemAlerta ?? inicial?.origemAlerta ?? null;

  return (
    <FormularioNovo novo={!editando}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}

        {origem && (
          <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Tarefa ligada a um prazo do sino. Ao concluí-la, o aviso deixa de cobrar — nos prazos
              cumpridos fora do sistema (cadastro no Audesp e Declaração Negativa), que ele não tem
              como conferir sozinho.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Título *"
              name="titulo"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              error={erros.titulo}
              placeholder="ex.: Renovar CND federal da OSC"
            />
          </div>

          <Input
            label="Prazo *"
            name="prazoLegal"
            type="date"
            value={form.prazoLegal}
            onChange={(e) => set('prazoLegal', e.target.value)}
            error={erros.prazoLegal}
            hint="Data limite para a providência."
          />
          <Select
            label="Prioridade"
            name="prioridade"
            value={form.prioridade}
            onChange={(e) => set('prioridade', e.target.value as PrioridadeTarefa)}
            options={Object.entries(PRIORIDADE_LABEL).map(([value, label]) => ({ value, label }))}
          />

          <Combobox
            label="Ajuste"
            name="ajusteId"
            value={form.ajusteId}
            onChange={(v) => set('ajusteId', v)}
            options={ajustes}
            placeholder="Nenhum (tarefa avulsa)"
          />
          <Combobox
            label="Responsável"
            name="responsavelId"
            value={form.responsavelId}
            onChange={(v) => set('responsavelId', v)}
            options={usuarios}
            placeholder="Sem responsável definido"
          />

          {editando && (
            <Select
              label="Situação"
              name="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as StatusTarefa)}
              options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
            />
          )}

          <div className="sm:col-span-2">
            <Input
              label="Descrição"
              name="descricao"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="O que precisa ser feito, onde e por quê."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Tarefa'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
