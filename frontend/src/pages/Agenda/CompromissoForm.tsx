import { useEffect, useState } from 'react';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox, type OpcaoCombo } from '@/components/ui/Combobox';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { atualizarCompromisso, criarCompromisso } from '@/services/compromissos.service';
import { listarAjustes } from '@/services/ajustes.service';
import { listarUsuarios } from '@/services/usuarios.service';
import { extrairMensagemErro } from '@/services/http';
import {
  STATUS_LABEL,
  TIPO_LABEL,
  paraInputDateTime,
  type Compromisso,
  type CompromissoPayload,
  type StatusCompromisso,
  type TipoCompromisso,
} from '@/types/compromisso';

interface Props {
  compromisso?: Compromisso | null;
  /** Data pré-selecionada ao clicar num dia do calendário. */
  diaInicial?: Date | null;
  onSuccess: () => void;
  onCancel: () => void;
}

type Campos = {
  tipo: TipoCompromisso;
  titulo: string;
  inicioEm: string;
  duracaoMinutos: string;
  local: string;
  ajusteId: string;
  responsavelId: string;
  participantes: string;
  pauta: string;
  status: StatusCompromisso;
  registro: string;
};

function estadoInicial(c?: Compromisso | null, dia?: Date | null): Campos {
  const base = dia ?? new Date();
  if (dia) base.setHours(9, 0, 0, 0); // 9h: começo de expediente, palpite útil
  return {
    tipo: c?.tipo ?? 'REUNIAO_MONITORAMENTO',
    titulo: c?.titulo ?? '',
    inicioEm: c ? paraInputDateTime(c.inicioEm) : paraInputDateTime(base.toISOString()),
    duracaoMinutos: c?.duracaoMinutos != null ? String(c.duracaoMinutos) : '',
    local: c?.local ?? '',
    ajusteId: c?.ajusteId ?? '',
    responsavelId: c?.responsavelId ?? '',
    participantes: c?.participantes ?? '',
    pauta: c?.pauta ?? '',
    status: c?.status ?? 'AGENDADO',
    registro: c?.registro ?? '',
  };
}

export function CompromissoForm({ compromisso, diaInicial, onSuccess, onCancel }: Props) {
  const editando = !!compromisso;
  const [form, setForm] = useState<Campos>(() => estadoInicial(compromisso, diaInicial));
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ajustes, setAjustes] = useState<OpcaoCombo[]>([]);
  const [usuarios, setUsuarios] = useState<OpcaoCombo[]>([]);

  useEffect(() => {
    let vivo = true;
    listarAjustes({ page: 1, pageSize: 100, orderBy: 'dataAssinatura', orderDir: 'desc' })
      .then((r) => {
        if (!vivo) return;
        setAjustes(
          r.data.map((a) => ({ value: a.id, label: a.codigoAjuste, sub: a.entidadeNome })),
        );
      })
      .catch(() => undefined);
    listarUsuarios({ filtros: { ativo: true }, page: 1, pageSize: 100 })
      .then((r) => vivo && setUsuarios(r.data.map((u) => ({ value: u.id, label: u.nome }))))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const set = <K extends keyof Campos>(campo: K, valor: Campos[K]) => {
    setForm((p) => ({ ...p, [campo]: valor }));
    setErros((p) => ({ ...p, [campo]: undefined }));
    setAlerta(null);
  };

  function validar(): boolean {
    const e: Partial<Record<keyof Campos, string>> = {};
    if (form.titulo.trim().length < 3) e.titulo = 'Informe o título.';
    if (!form.inicioEm) e.inicioEm = 'Informe a data e a hora.';
    if (form.registro.trim() && form.status !== 'REALIZADO')
      e.registro = 'O registro só se aplica a compromisso realizado.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: CompromissoPayload = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      pauta: form.pauta.trim() || null,
      inicioEm: form.inicioEm,
      duracaoMinutos: form.duracaoMinutos ? Number(form.duracaoMinutos) : null,
      local: form.local.trim() || null,
      participantes: form.participantes.trim() || null,
      ajusteId: form.ajusteId || null,
      responsavelId: form.responsavelId || null,
      status: form.status,
      registro: form.status === 'REALIZADO' ? form.registro.trim() || null : null,
    };

    setSalvando(true);
    try {
      if (editando) await atualizarCompromisso(compromisso!.id, payload);
      else await criarCompromisso(payload);
      onSuccess();
    } catch (error) {
      setAlerta(extrairMensagemErro(error, 'Não foi possível salvar o compromisso.'));
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
          <Select
            label="Tipo *"
            name="tipo"
            value={form.tipo}
            onChange={(e) => set('tipo', e.target.value as TipoCompromisso)}
            options={Object.entries(TIPO_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <Combobox
            label="Ajuste"
            name="ajusteId"
            value={form.ajusteId}
            onChange={(v) => set('ajusteId', v)}
            options={ajustes}
            placeholder="Nenhum (compromisso avulso)"
          />

          <div className="sm:col-span-2">
            <Input
              label="Título *"
              name="titulo"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              error={erros.titulo}
              placeholder="ex.: Visita de monitoramento — sede da OSC"
            />
          </div>

          <Input
            label="Data e hora *"
            name="inicioEm"
            type="datetime-local"
            value={form.inicioEm}
            onChange={(e) => set('inicioEm', e.target.value)}
            error={erros.inicioEm}
          />
          <Input
            label="Duração (minutos)"
            name="duracaoMinutos"
            value={form.duracaoMinutos.replace(/\D/g, '').slice(0, 4)}
            onChange={(e) => set('duracaoMinutos', e.target.value)}
            placeholder="ex.: 90"
            inputMode="numeric"
          />

          <Input
            label="Local"
            name="local"
            value={form.local}
            onChange={(e) => set('local', e.target.value)}
            placeholder="Sede da OSC, sala de reuniões, videoconferência..."
          />
          <Combobox
            label="Responsável"
            name="responsavelId"
            value={form.responsavelId}
            onChange={(v) => set('responsavelId', v)}
            options={usuarios}
            placeholder="Sem responsável definido"
          />

          <div className="sm:col-span-2">
            <Input
              label="Participantes"
              name="participantes"
              value={form.participantes}
              onChange={(e) => set('participantes', e.target.value)}
              placeholder="Um por linha — do órgão e da OSC"
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label="Pauta"
              name="pauta"
              value={form.pauta}
              onChange={(e) => set('pauta', e.target.value)}
              placeholder="O que será tratado."
            />
          </div>

          {editando && (
            <>
              <Select
                label="Situação"
                name="status"
                value={form.status}
                onChange={(e) => set('status', e.target.value as StatusCompromisso)}
                options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              />
              <div />
              <div className="sm:col-span-2">
                <Input
                  label="Registro do que foi tratado"
                  name="registro"
                  value={form.registro}
                  onChange={(e) => set('registro', e.target.value)}
                  error={erros.registro}
                  disabled={form.status !== 'REALIZADO'}
                  placeholder={
                    form.status === 'REALIZADO'
                      ? 'A ata: o que foi discutido e o que ficou definido.'
                      : 'Disponível quando a situação for Realizado.'
                  }
                />
              </div>
            </>
          )}
        </div>

        {editando && form.status === 'REALIZADO' && (
          <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              O que ficou pendente vira <strong>providência</strong>: use "Gerar providência" na
              agenda para abrir a tarefa já ligada a este compromisso — e aí a Fiscalização cobra o
              prazo.
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Agendar'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
