import { useEffect, useState } from 'react';
import { AlertCircle, Bell, Info, Loader2, Lock, Repeat, Users, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox, type OpcaoCombo } from '@/components/ui/Combobox';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { atualizarCompromisso, criarCompromisso } from '@/services/compromissos.service';
import { listarAjustes } from '@/services/ajustes.service';
import { listarUsuarios } from '@/services/usuarios.service';
import { listarGruposAtivos } from '@/services/grupos.service';
import { extrairMensagemErro } from '@/services/http';
import { cn } from '@/lib/cn';
import {
  ANTECEDENCIAS,
  CORES,
  RECORRENCIA_LABEL,
  STATUS_LABEL,
  TIPO_LABEL,
  VISIBILIDADE_LABEL,
  paraInputDateTime,
  rotuloAntecedencia,
  type CanalAlerta,
  type Compromisso,
  type CompromissoPayload,
  type Recorrencia,
  type StatusCompromisso,
  type TipoCompromisso,
  type VisibilidadeCompromisso,
} from '@/types/compromisso';

interface Props {
  compromisso?: Compromisso | null;
  diaInicial?: Date | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Escolhido {
  id: string;
  nome: string;
}

type Campos = {
  tipo: TipoCompromisso;
  titulo: string;
  inicioEm: string;
  fimEm: string;
  diaInteiro: boolean;
  local: string;
  cor: string;
  ajusteId: string;
  responsavelId: string;
  pauta: string;
  status: StatusCompromisso;
  registro: string;
  visibilidade: VisibilidadeCompromisso;
  recorrencia: Recorrencia;
  recorrenciaIntervalo: string;
  recorrenciaAte: string;
};

function maisUmaHora(iso: string): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + 1);
  return paraInputDateTime(d.toISOString());
}

function estadoInicial(c?: Compromisso | null, dia?: Date | null): Campos {
  const base = dia ? new Date(dia) : new Date();
  if (dia) base.setHours(9, 0, 0, 0);
  const inicio = c ? paraInputDateTime(c.inicioEm) : paraInputDateTime(base.toISOString());
  return {
    tipo: c?.tipo ?? 'REUNIAO_MONITORAMENTO',
    titulo: c?.titulo ?? '',
    inicioEm: inicio,
    fimEm: c ? paraInputDateTime(c.fimEm) : maisUmaHora(inicio),
    diaInteiro: c?.diaInteiro ?? false,
    local: c?.local ?? '',
    cor: c?.cor ?? '',
    ajusteId: c?.ajusteId ?? '',
    responsavelId: c?.responsavelId ?? '',
    pauta: c?.pauta ?? '',
    status: c?.status ?? 'AGENDADO',
    registro: c?.registro ?? '',
    visibilidade: c?.visibilidade ?? 'ORGAO',
    recorrencia: c?.recorrencia ?? 'NAO_REPETE',
    recorrenciaIntervalo: c?.recorrenciaIntervalo ? String(c.recorrenciaIntervalo) : '',
    recorrenciaAte: c?.recorrenciaAte ? c.recorrenciaAte.slice(0, 10) : '',
  };
}

export function CompromissoForm({ compromisso, diaInicial, onSuccess, onCancel }: Props) {
  const editando = !!compromisso;
  const [form, setForm] = useState<Campos>(() => estadoInicial(compromisso, diaInicial));
  const [participantes, setParticipantes] = useState<Escolhido[]>(compromisso?.participantes ?? []);
  const [grupos, setGrupos] = useState<Escolhido[]>(compromisso?.grupos ?? []);
  const [alertas, setAlertas] = useState(compromisso?.alertas ?? []);
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [opAjustes, setOpAjustes] = useState<OpcaoCombo[]>([]);
  const [opUsuarios, setOpUsuarios] = useState<OpcaoCombo[]>([]);
  const [opGrupos, setOpGrupos] = useState<OpcaoCombo[]>([]);

  useEffect(() => {
    let vivo = true;
    listarAjustes({ page: 1, pageSize: 100, orderBy: 'dataAssinatura', orderDir: 'desc' })
      .then((r) => vivo && setOpAjustes(r.data.map((a) => ({ value: a.id, label: a.codigoAjuste, sub: a.entidadeNome }))))
      .catch(() => undefined);
    listarUsuarios({ filtros: { ativo: true }, page: 1, pageSize: 200 })
      .then((r) => vivo && setOpUsuarios(r.data.map((u) => ({ value: u.id, label: u.nome, sub: u.email }))))
      .catch(() => undefined);
    listarGruposAtivos()
      .then((g) => vivo && setOpGrupos(g.map((x) => ({ value: x.id, label: x.nome }))))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const set = <K extends keyof Campos>(campo: K, valor: Campos[K]) => {
    setForm((p) => {
      const novo = { ...p, [campo]: valor };
      // Mover o início arrasta o término junto, preservando a duração — é o
      // comportamento de qualquer agenda, e evita término anterior ao início.
      if (campo === 'inicioEm' && typeof valor === 'string') {
        const antes = new Date(p.inicioEm).getTime();
        const dur = new Date(p.fimEm).getTime() - antes;
        if (Number.isFinite(dur) && dur > 0) {
          novo.fimEm = paraInputDateTime(new Date(new Date(valor).getTime() + dur).toISOString());
        }
      }
      return novo;
    });
    setErros((p) => ({ ...p, [campo]: undefined }));
    setAlerta(null);
  };

  const adicionar = (lista: Escolhido[], setLista: (v: Escolhido[]) => void, ops: OpcaoCombo[]) =>
    (id: string) => {
      if (!id || lista.some((x) => x.id === id)) return;
      const op = ops.find((o) => o.value === id);
      if (op) setLista([...lista, { id, nome: op.label }]);
    };

  function validar(): boolean {
    const e: Partial<Record<keyof Campos, string>> = {};
    if (form.titulo.trim().length < 3) e.titulo = 'Informe o título.';
    if (!form.inicioEm) e.inicioEm = 'Informe a data e a hora.';
    if (!form.diaInteiro && form.fimEm && new Date(form.fimEm) <= new Date(form.inicioEm))
      e.fimEm = 'O término precisa ser depois do início.';
    if (form.visibilidade === 'RESTRITO' && !participantes.length && !grupos.length)
      e.visibilidade = 'Escolha ao menos um participante ou grupo — ou marque como Particular.';
    if (form.registro.trim() && form.status !== 'REALIZADO')
      e.registro = 'O registro só se aplica a compromisso realizado.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const particular = form.visibilidade === 'PARTICULAR';
    const payload: CompromissoPayload = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      pauta: form.pauta.trim() || null,
      inicioEm: form.inicioEm,
      fimEm: form.diaInteiro ? null : form.fimEm || null,
      diaInteiro: form.diaInteiro,
      local: form.local.trim() || null,
      cor: form.cor || null,
      visibilidade: form.visibilidade,
      recorrencia: form.recorrencia,
      recorrenciaIntervalo: form.recorrenciaIntervalo ? Number(form.recorrenciaIntervalo) : null,
      recorrenciaAte: form.recorrenciaAte || null,
      ajusteId: form.ajusteId || null,
      responsavelId: form.responsavelId || null,
      status: form.status,
      registro: form.status === 'REALIZADO' ? form.registro.trim() || null : null,
      // Particular não tem convidados — o backend recusa, e limpar aqui evita
      // que o usuário perca a edição por causa de uma lista esquecida na tela.
      participantes: particular ? [] : participantes.map((p) => p.id),
      grupos: particular ? [] : grupos.map((g) => g.id),
      alertas: alertas.map((a) => ({ minutosAntes: a.minutosAntes, canal: a.canal })),
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

  const particular = form.visibilidade === 'PARTICULAR';

  const chips = (lista: Escolhido[], remover: (id: string) => void) => (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {lista.map((x) => (
        <span
          key={x.id}
          className="flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700 dark:bg-ink-800 dark:text-ink-200"
        >
          {x.nome}
          <button type="button" onClick={() => remover(x.id)} aria-label={`Remover ${x.nome}`}>
            <X className="h-3 w-3 text-ink-400 hover:text-red-500" />
          </button>
        </span>
      ))}
    </div>
  );

  return (
    <FormularioNovo novo={!editando}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}

        {compromisso?.ocorrencia && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <Repeat className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Esta é uma <strong>repetição</strong> da série. Salvar altera a série inteira, não só
              esta data.
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
              placeholder="ex.: Visita de monitoramento — sede da OSC"
            />
          </div>

          <Select
            label="Tipo"
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
            options={opAjustes}
            placeholder="Nenhum (compromisso avulso)"
          />

          <Input
            label="Início *"
            name="inicioEm"
            type="datetime-local"
            value={form.inicioEm}
            onChange={(e) => set('inicioEm', e.target.value)}
            error={erros.inicioEm}
          />
          <Input
            label="Término"
            name="fimEm"
            type="datetime-local"
            value={form.fimEm}
            onChange={(e) => set('fimEm', e.target.value)}
            error={erros.fimEm}
            disabled={form.diaInteiro}
          />

          <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
            <input
              type="checkbox"
              checked={form.diaInteiro}
              onChange={(e) => set('diaInteiro', e.target.checked)}
              className="rounded border-ink-300 dark:border-ink-700"
            />
            Dia inteiro
          </label>

          <Input
            label="Local"
            name="local"
            value={form.local}
            onChange={(e) => set('local', e.target.value)}
            placeholder="Sede da OSC, sala de reuniões, videoconferência..."
          />

          <div className="sm:col-span-2">
            <Input
              label="Descrição / pauta"
              name="pauta"
              value={form.pauta}
              onChange={(e) => set('pauta', e.target.value)}
              placeholder="O que será tratado."
            />
          </div>

          <Combobox
            label="Responsável / organizador"
            name="responsavelId"
            value={form.responsavelId}
            onChange={(v) => set('responsavelId', v)}
            options={opUsuarios}
            placeholder="Sem responsável definido"
          />

          <div>
            <p className="mb-1 text-xs font-medium text-ink-600 dark:text-ink-300">Cor</p>
            <div className="flex flex-wrap gap-1.5">
              {CORES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => set('cor', form.cor === c.id ? '' : c.id)}
                  className={cn(
                    'h-6 w-6 rounded-full ring-offset-2 transition-all dark:ring-offset-ink-900',
                    c.classe,
                    form.cor === c.id && 'ring-2 ring-ink-400',
                  )}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-400">Sem escolha, usa a cor do tipo.</p>
          </div>
        </div>

        {/* --- Quem enxerga --------------------------------------------- */}
        <section className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
            <Users className="h-4 w-4 text-brand-500" />
            Quem enxerga
          </p>

          <Select
            label="Visibilidade"
            name="visibilidade"
            value={form.visibilidade}
            onChange={(e) => set('visibilidade', e.target.value as VisibilidadeCompromisso)}
            options={Object.entries(VISIBILIDADE_LABEL).map(([value, label]) => ({ value, label }))}
            error={erros.visibilidade}
          />

          {particular ? (
            <p className="mt-2 flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600 dark:bg-ink-800/40 dark:text-ink-300">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Só você enxerga este compromisso. Nem administradores — perfil administrativo não abre
              agenda pessoal.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Combobox
                  label="Participantes"
                  name="participante"
                  value=""
                  onChange={adicionar(participantes, setParticipantes, opUsuarios)}
                  options={opUsuarios.filter((o) => !participantes.some((p) => p.id === o.value))}
                  placeholder="Adicionar usuário..."
                />
                {chips(participantes, (id) => setParticipantes(participantes.filter((p) => p.id !== id)))}
              </div>
              <div>
                <Combobox
                  label="Grupos"
                  name="grupo"
                  value=""
                  onChange={adicionar(grupos, setGrupos, opGrupos)}
                  options={opGrupos.filter((o) => !grupos.some((g) => g.id === o.value))}
                  placeholder="Adicionar grupo..."
                />
                {chips(grupos, (id) => setGrupos(grupos.filter((g) => g.id !== id)))}
                <p className="mt-1 text-[11px] text-ink-400">
                  Quem entrar no grupo depois também passa a ver.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* --- Repetição ------------------------------------------------ */}
        <section className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
            <Repeat className="h-4 w-4 text-brand-500" />
            Repetição
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="Frequência"
              name="recorrencia"
              value={form.recorrencia}
              onChange={(e) => set('recorrencia', e.target.value as Recorrencia)}
              options={Object.entries(RECORRENCIA_LABEL).map(([value, label]) => ({ value, label }))}
            />
            {form.recorrencia !== 'NAO_REPETE' && (
              <>
                <Input
                  label="A cada"
                  name="recorrenciaIntervalo"
                  value={form.recorrenciaIntervalo.replace(/\D/g, '').slice(0, 2)}
                  onChange={(e) => set('recorrenciaIntervalo', e.target.value)}
                  placeholder="1"
                  inputMode="numeric"
                />
                <Input
                  label="Repetir até"
                  name="recorrenciaAte"
                  type="date"
                  value={form.recorrenciaAte}
                  onChange={(e) => set('recorrenciaAte', e.target.value)}
                  hint="Em branco = sem fim."
                />
              </>
            )}
          </div>
        </section>

        {/* --- Lembretes ------------------------------------------------ */}
        <section className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
            <Bell className="h-4 w-4 text-brand-500" />
            Lembretes
          </p>

          <div className="flex flex-wrap items-end gap-2">
            <div className="w-full sm:w-52">
              <Select
                label="Antecedência"
                name="novoAlerta"
                value=""
                onChange={(e) => {
                  const minutos = Number(e.target.value);
                  if (!minutos) return;
                  if (alertas.some((a) => a.minutosAntes === minutos && a.canal === 'SISTEMA')) return;
                  setAlertas([...alertas, { minutosAntes: minutos, canal: 'SISTEMA' as CanalAlerta }]);
                }}
                options={ANTECEDENCIAS.map((a) => ({ value: String(a.minutos), label: a.label }))}
                placeholder="Adicionar lembrete..."
              />
            </div>
          </div>

          {alertas.length > 0 && (
            <ul className="mt-2 space-y-1">
              {alertas.map((a, i) => (
                <li
                  key={`${a.minutosAntes}-${a.canal}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-1.5 text-xs dark:bg-ink-800/40"
                >
                  <span className="text-ink-700 dark:text-ink-200">
                    {rotuloAntecedencia(a.minutosAntes)}
                  </span>
                  <span className="flex items-center gap-2">
                    <select
                      value={a.canal}
                      onChange={(e) => {
                        const canal = e.target.value as CanalAlerta;
                        setAlertas(alertas.map((x, j) => (j === i ? { ...x, canal } : x)));
                      }}
                      className="rounded border border-ink-200 bg-white px-1.5 py-0.5 text-[11px] dark:border-ink-700 dark:bg-ink-900"
                    >
                      <option value="SISTEMA">No sistema</option>
                      <option value="EMAIL">Por e-mail</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setAlertas(alertas.filter((_, j) => j !== i))}
                      aria-label="Remover lembrete"
                    >
                      <X className="h-3.5 w-3.5 text-ink-400 hover:text-red-500" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {alertas.some((a) => a.canal === 'EMAIL') && (
            <p className="mt-2 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              O envio por e-mail depende do serviço de e-mail estar configurado no servidor. O
              lembrete no sistema funciona sempre.
            </p>
          )}
        </section>

        {editando && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Situação"
              name="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as StatusCompromisso)}
              options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
            />
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
