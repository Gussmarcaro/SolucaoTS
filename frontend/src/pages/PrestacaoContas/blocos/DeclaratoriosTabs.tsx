import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { mascaraCpfCnpj } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { declaracoesApi, parecerApi, transparenciaApi } from '@/services/declaratorios.service';
import {
  CONCLUSAO_PARECER,
  PERGUNTAS_PARECER,
  REQUISITOS_781,
  REQUISITOS_83,
  REQUISITOS_DIVULGACAO,
} from '@/lib/dominiosDeclaratorios';
import type { Declaracoes, Parecer, RequisitoAtende, Transparencia } from '@/types/prestacaoBlocos8';
import type { TipoAjuste } from '@/types/ajuste';
import { AlertaErro, IconBtn } from './_ui';

// ---------- infra compartilhada ----------
interface Api<T> {
  obter: (prestacaoId: string) => Promise<T | null>;
  salvar: (prestacaoId: string, payload: T) => Promise<T>;
}

function useBloco<T>(prestacaoId: string, api: Api<T>, vazio: T) {
  const [dados, setDados] = useState<T>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    api
      .obter(prestacaoId)
      .then((r) => vivo && r && setDados(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar o bloco.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestacaoId]);

  const patch = (p: Partial<T>) => {
    setDados((d) => ({ ...d, ...p }));
    setSalvo(false);
  };

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    try {
      setDados(await api.salvar(prestacaoId, dados));
      setSalvo(true);
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o bloco.'));
    } finally {
      setSalvando(false);
    }
  }

  return { dados, setDados, patch, carregando, salvando, erro, salvo, salvar };
}

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-200/70 bg-ink-50 px-4 py-3 text-xs text-ink-500 dark:border-ink-800/70 dark:bg-ink-950 dark:text-ink-400">
      {children}
    </div>
  );
}

function Carregando() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
    </div>
  );
}

function BarraSalvar({ salvo, salvando, onSalvar }: { salvo: boolean; salvando: boolean; onSalvar: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-1">
      {salvo && (
        <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Salvo.
        </span>
      )}
      <Button type="button" onClick={onSalvar} disabled={salvando}>
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        {salvando ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  );
}

function BoolSelect({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const v = value === true ? 'sim' : value === false ? 'nao' : '';
  return (
    <Select
      label={label}
      name={label}
      value={v}
      onChange={(e) => onChange(e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : null)}
      options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]}
      placeholder="—"
    />
  );
}

// ---------- Bloco 24 — Declarações ----------
const DECLARACOES_VAZIO: Declaracoes = {
  houveContratacao: null,
  empresasPertencentes: [],
  houveParticipacao: null,
  participacoes: [],
  comprasAdequadas: null,
};

export function DeclaracoesTab({ prestacaoId, ajusteTipo }: { prestacaoId: string; ajusteTipo: TipoAjuste }) {
  const { dados, patch, carregando, salvando, erro, salvo, salvar } = useBloco(prestacaoId, declaracoesApi, DECLARACOES_VAZIO);
  const mostraCompras = ajusteTipo === 'CONTRATO_GESTAO' || ajusteTipo === 'TERMO_PARCERIA';

  if (carregando) return <Carregando />;

  return (
    <div className="space-y-4">
      <Nota>Declarações sobre contratação/participação de dirigentes, agentes públicos ou parentes (até 2º grau).</Nota>
      {erro && <AlertaErro msg={erro} />}

      <BoolSelect
        label="Houve contratação de empresas pertencentes a dirigentes/agentes/parentes?"
        value={dados.houveContratacao}
        onChange={(v) => patch({ houveContratacao: v })}
      />
      {dados.houveContratacao && (
        <div className="space-y-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Empresas contratadas</p>
            <Button size="sm" variant="secondary" onClick={() => patch({ empresasPertencentes: [...dados.empresasPertencentes, { cnpj: '', cpf: '' }] })}>
              <Plus className="h-4 w-4" />Adicionar
            </Button>
          </div>
          {dados.empresasPertencentes.map((e, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="grid flex-1 grid-cols-2 gap-2">
                <Input label={i === 0 ? 'CNPJ da empresa' : ''} name={`cnpj-${i}`} value={mascaraCpfCnpj(e.cnpj ?? '')} onChange={(ev) => atualizar(dados.empresasPertencentes, i, { cnpj: ev.target.value }, (l) => patch({ empresasPertencentes: l }))} placeholder="CNPJ" inputMode="numeric" />
                <Input label={i === 0 ? 'CPF do dirigente/agente' : ''} name={`cpf-${i}`} value={mascaraCpfCnpj(e.cpf ?? '')} onChange={(ev) => atualizar(dados.empresasPertencentes, i, { cpf: ev.target.value }, (l) => patch({ empresasPertencentes: l }))} placeholder="CPF" inputMode="numeric" />
              </div>
              <IconBtn title="Remover" danger onClick={() => patch({ empresasPertencentes: dados.empresasPertencentes.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn>
            </div>
          ))}
          {dados.empresasPertencentes.length === 0 && <p className="text-xs text-ink-400">Nenhuma empresa adicionada.</p>}
        </div>
      )}

      <BoolSelect
        label="Houve participação de dirigentes/agentes/parentes no quadro diretivo/administrativo?"
        value={dados.houveParticipacao}
        onChange={(v) => patch({ houveParticipacao: v })}
      />
      {dados.houveParticipacao && (
        <div className="space-y-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Participações</p>
            <Button size="sm" variant="secondary" onClick={() => patch({ participacoes: [...dados.participacoes, { cpfDirigente: '', cpfsContratados: [] }] })}>
              <Plus className="h-4 w-4" />Adicionar
            </Button>
          </div>
          {dados.participacoes.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Input label={i === 0 ? 'CPF do dirigente' : ''} name={`dir-${i}`} value={mascaraCpfCnpj(p.cpfDirigente ?? '')} onChange={(ev) => atualizar(dados.participacoes, i, { cpfDirigente: ev.target.value }, (l) => patch({ participacoes: l }))} placeholder="CPF do dirigente" inputMode="numeric" />
                <div>
                  {i === 0 && <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">CPFs contratados (um por linha)</label>}
                  <textarea
                    value={p.cpfsContratados.join('\n')}
                    onChange={(ev) => atualizar(dados.participacoes, i, { cpfsContratados: ev.target.value.split('\n') }, (l) => patch({ participacoes: l }))}
                    rows={2}
                    className="focus-ring w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              <IconBtn title="Remover" danger onClick={() => patch({ participacoes: dados.participacoes.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn>
            </div>
          ))}
          {dados.participacoes.length === 0 && <p className="text-xs text-ink-400">Nenhuma participação adicionada.</p>}
        </div>
      )}

      {mostraCompras && (
        <BoolSelect
          label="As compras e contratações estão adequadas ao regulamento próprio?"
          value={dados.comprasAdequadas}
          onChange={(v) => patch({ comprasAdequadas: v })}
        />
      )}

      <BarraSalvar salvo={salvo} salvando={salvando} onSalvar={salvar} />
    </div>
  );
}

/** Atualiza o item i de uma lista imutável e propaga. */
function atualizar<T>(lista: T[], i: number, patch: Partial<T>, set: (l: T[]) => void) {
  set(lista.map((it, j) => (j === i ? { ...it, ...patch } : it)));
}

// ---------- Bloco 33 — Parecer Conclusivo ----------
const PARECER_VAZIO: Parecer = {
  identificacaoParecer: null,
  conclusaoParecer: null,
  consideracoesParecer: null,
  declaracoes: PERGUNTAS_PARECER.map((p) => ({ tipoDeclaracao: p.tipo, declaracao: null, justificativa: null })),
};

export function ParecerConclusivoTab({ prestacaoId }: { prestacaoId: string }) {
  const { dados, patch, setDados, carregando, salvando, erro, salvo, salvar } = useBloco(prestacaoId, parecerApi, PARECER_VAZIO);

  if (carregando) return <Carregando />;

  const respostaDe = (tipo: number) => dados.declaracoes.find((d) => d.tipoDeclaracao === tipo);
  function setDecl(tipo: number, campo: 'declaracao' | 'justificativa', valor: number | string | null) {
    const existe = dados.declaracoes.some((d) => d.tipoDeclaracao === tipo);
    const base = existe ? dados.declaracoes : [...dados.declaracoes, { tipoDeclaracao: tipo, declaracao: null, justificativa: null }];
    setDados({ ...dados, declaracoes: base.map((d) => (d.tipoDeclaracao === tipo ? { ...d, [campo]: valor } : d)) });
  }

  const desfavoravel = dados.conclusaoParecer === 3;

  return (
    <div className="space-y-4">
      <Nota>Parecer da autoridade competente (art. 203 da IN 01/2024). Todas as 7 declarações devem ser respondidas.</Nota>
      {erro && <AlertaErro msg={erro} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Identificação do parecer" name="ident" value={dados.identificacaoParecer ?? ''} onChange={(e) => patch({ identificacaoParecer: e.target.value })} placeholder="ex.: 0009/2024" />
        <Select
          label="Conclusão do parecer"
          name="conclusao"
          value={dados.conclusaoParecer != null ? String(dados.conclusaoParecer) : ''}
          onChange={(e) => patch({ conclusaoParecer: e.target.value ? Number(e.target.value) : null })}
          options={Object.entries(CONCLUSAO_PARECER).map(([v, l]) => ({ value: v, label: l }))}
          placeholder="—"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">
          Considerações {desfavoravel && <span className="text-red-500">(obrigatório quando desfavorável)</span>}
        </label>
        <textarea
          value={dados.consideracoesParecer ?? ''}
          onChange={(e) => patch({ consideracoesParecer: e.target.value })}
          rows={2}
          className="focus-ring w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        />
      </div>

      <div className="space-y-2">
        {PERGUNTAS_PARECER.map((p) => {
          const r = respostaDe(p.tipo);
          const opts = [{ value: '1', label: 'Sim' }, { value: '2', label: 'Não' }];
          if (p.permitePrejudicado) opts.push({ value: '3', label: 'Prejudicado' });
          const exigeJust = r?.declaracao === 2 || r?.declaracao === 3 || (p.justificativaSeSim && r?.declaracao === 1);
          return (
            <div key={p.tipo} className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
              <p className="text-sm text-ink-700 dark:text-ink-200"><span className="font-medium">{p.tipo}. {p.titulo}</span> — {p.pergunta}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr]">
                <Select
                  label=""
                  name={`decl-${p.tipo}`}
                  value={r?.declaracao != null ? String(r.declaracao) : ''}
                  onChange={(e) => setDecl(p.tipo, 'declaracao', e.target.value ? Number(e.target.value) : null)}
                  options={opts}
                  placeholder="—"
                />
                {exigeJust && (
                  <Input label="" name={`just-${p.tipo}`} value={r?.justificativa ?? ''} onChange={(e) => setDecl(p.tipo, 'justificativa', e.target.value)} placeholder="Justificativa" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BarraSalvar salvo={salvo} salvando={salvando} onSalvar={salvar} />
    </div>
  );
}

// ---------- Bloco 34 — Transparência ----------
const TRANSP_VAZIO: Transparencia = {
  mantemSitio: null,
  sitios: [],
  requisitos781: [],
  requisitos83: [],
  requisitosDivulgacao: [],
};

function Checklist({ titulo, tabela, valores, onToggle }: { titulo: string; tabela: Record<number, string>; valores: RequisitoAtende[]; onToggle: (req: number, atende: boolean) => void }) {
  const atendeDe = (r: number) => valores.find((v) => v.requisito === r)?.atende ?? false;
  return (
    <div className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
      <p className="mb-2 text-sm font-medium text-ink-700 dark:text-ink-200">{titulo}</p>
      <ul className="space-y-1.5">
        {Object.entries(tabela).map(([k, label]) => {
          const req = Number(k);
          return (
            <li key={k} className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" checked={atendeDe(req)} onChange={(e) => onToggle(req, e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800" />
              <span><span className="font-medium">{req}.</span> {label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TransparenciaTab({ prestacaoId }: { prestacaoId: string }) {
  const { dados, patch, carregando, salvando, erro, salvo, salvar } = useBloco(prestacaoId, transparenciaApi, TRANSP_VAZIO);

  if (carregando) return <Carregando />;

  function toggle(campo: 'requisitos781' | 'requisitos83' | 'requisitosDivulgacao', req: number, atende: boolean) {
    const atual = dados[campo].filter((r) => r.requisito !== req);
    patch({ [campo]: [...atual, { requisito: req, atende }].sort((a, b) => a.requisito - b.requisito) } as Partial<Transparencia>);
  }

  return (
    <div className="space-y-4">
      <Nota>Transparência da entidade beneficiária (Lei 12.527/11 — LAI). Preencha os requisitos se ela mantém sítio na Internet.</Nota>
      {erro && <AlertaErro msg={erro} />}

      <BoolSelect label="A entidade beneficiária mantém sítio na Internet?" value={dados.mantemSitio} onChange={(v) => patch({ mantemSitio: v })} />

      {dados.mantemSitio && (
        <>
          <div className="space-y-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Sítios na Internet</p>
              <Button size="sm" variant="secondary" onClick={() => patch({ sitios: [...dados.sitios, ''] })}><Plus className="h-4 w-4" />Adicionar</Button>
            </div>
            {dados.sitios.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={s} onChange={(e) => patch({ sitios: dados.sitios.map((v, j) => (j === i ? e.target.value : v)) })} placeholder="https://..." className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100" />
                <IconBtn title="Remover" danger onClick={() => patch({ sitios: dados.sitios.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn>
              </div>
            ))}
            {dados.sitios.length === 0 && <p className="text-xs text-ink-400">Nenhum sítio informado.</p>}
          </div>

          <Checklist titulo="Requisitos — Arts. 7º e 8º § 1º" tabela={REQUISITOS_781} valores={dados.requisitos781} onToggle={(r, a) => toggle('requisitos781', r, a)} />
          <Checklist titulo="Requisitos do sítio — Art. 8º § 3º" tabela={REQUISITOS_83} valores={dados.requisitos83} onToggle={(r, a) => toggle('requisitos83', r, a)} />
          <Checklist titulo="Divulgação das Informações" tabela={REQUISITOS_DIVULGACAO} valores={dados.requisitosDivulgacao} onToggle={(r, a) => toggle('requisitosDivulgacao', r, a)} />
        </>
      )}

      <BarraSalvar salvo={salvo} salvando={salvando} onSalvar={salvar} />
    </div>
  );
}
