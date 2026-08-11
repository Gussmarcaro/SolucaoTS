import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { atualizarAjuste, criarAjuste } from '@/services/ajustes.service';
import { listarEntidades } from '@/services/entidades.service';
import { listarOrgaos } from '@/services/orgaos.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import {
  PERIODICIDADE_LABEL,
  STATUS_AJUSTE_LABEL,
  TIPO_AJUSTE_LABEL,
  type Ajuste,
  type AjustePayload,
  type Periodicidade,
  type StatusAjuste,
  type TipoAjuste,
} from '@/types/ajuste';

interface Props {
  ajuste?: Ajuste | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const opcoesDe = <T extends string>(m: Record<T, string>) =>
  (Object.keys(m) as T[]).map((v) => ({ value: v, label: m[v] }));

type Campos = {
  clienteId: string;
  entidadeBeneficiariaId: string;
  tipoAjuste: string;
  codigoAjuste: string;
  numero: string;
  objeto: string;
  valor: string;
  periodicidade: string;
  status: string;
  dataAssinatura: string;
  vigenciaInicial: string;
  vigenciaFinal: string;
};

function estadoInicial(a?: Ajuste | null): Campos {
  return {
    clienteId: a?.clienteId ?? '',
    entidadeBeneficiariaId: a?.entidadeBeneficiariaId ?? '',
    tipoAjuste: a?.tipoAjuste ?? '',
    codigoAjuste: a?.codigoAjuste ?? '',
    numero: a?.numero ?? '',
    objeto: a?.objeto ?? '',
    valor: a ? numeroParaMascaraMoeda(a.valorGlobal) : '',
    periodicidade: a?.periodicidade ?? '',
    status: a?.status ?? 'EM_ELABORACAO',
    dataAssinatura: a?.dataAssinatura ?? '',
    vigenciaInicial: a?.vigenciaInicial ?? '',
    vigenciaFinal: a?.vigenciaFinal ?? '',
  };
}

export function AjusteForm({ ajuste, onSuccess, onCancel }: Props) {
  const editando = !!ajuste;
  const [form, setForm] = useState<Campos>(() => estadoInicial(ajuste));
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [entidades, setEntidades] = useState<{ value: string; label: string }[]>([]);
  const [carregandoEntidades, setCarregandoEntidades] = useState(true);
  const [orgaos, setOrgaos] = useState<{ value: string; label: string }[]>([]);
  const [carregandoOrgaos, setCarregandoOrgaos] = useState(true);

  useEffect(() => {
    let vivo = true;
    listarEntidades({ filtros: { ativo: true }, page: 1, pageSize: 100, orderBy: 'razaoSocial', orderDir: 'asc' })
      .then((r) => {
        if (!vivo) return;
        setEntidades(r.data.map((e) => ({ value: e.id, label: e.razaoSocial })));
      })
      .catch(() => vivo && setEntidades([]))
      .finally(() => vivo && setCarregandoEntidades(false));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    listarOrgaos({ filtros: { ativo: true }, page: 1, pageSize: 100, orderBy: 'nome', orderDir: 'asc' })
      .then((r) => {
        if (!vivo) return;
        setOrgaos(r.data.map((o) => ({ value: o.id, label: `${o.nome} (mun. ${o.codigoMunicipio} / ent. ${o.codigoEntidade})` })));
      })
      .catch(() => vivo && setOrgaos([]))
      .finally(() => vivo && setCarregandoOrgaos(false));
    return () => {
      vivo = false;
    };
  }, []);

  const set = (campo: keyof Campos, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
    setAlerta(null);
  };

  function validar(): boolean {
    const novos: Partial<Record<keyof Campos, string>> = {};
    if (!form.entidadeBeneficiariaId) novos.entidadeBeneficiariaId = 'Selecione a entidade.';
    if (!form.tipoAjuste) novos.tipoAjuste = 'Selecione o tipo.';
    if (!form.codigoAjuste.trim()) novos.codigoAjuste = 'Informe o código do ajuste.';
    if (!form.objeto.trim()) novos.objeto = 'Descreva o objeto.';
    if (!form.periodicidade) novos.periodicidade = 'Selecione a periodicidade.';
    if (moedaParaNumero(form.valor) <= 0) novos.valor = 'Informe o valor global.';
    if (!form.dataAssinatura) novos.dataAssinatura = 'Informe a data de assinatura.';
    if (form.vigenciaFinal && form.vigenciaInicial && form.vigenciaFinal < form.vigenciaInicial)
      novos.vigenciaFinal = 'O fim não pode ser anterior ao início.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: AjustePayload = {
      clienteId: form.clienteId || null,
      entidadeBeneficiariaId: form.entidadeBeneficiariaId,
      tipoAjuste: form.tipoAjuste as TipoAjuste,
      codigoAjuste: form.codigoAjuste.trim(),
      numero: form.numero.trim() || null,
      objeto: form.objeto.trim(),
      valorGlobal: moedaParaNumero(form.valor),
      dataAssinatura: form.dataAssinatura,
      vigenciaInicial: form.vigenciaInicial || null,
      vigenciaFinal: form.vigenciaFinal || null,
      periodicidade: form.periodicidade as Periodicidade,
      status: form.status as StatusAjuste,
    };

    setSalvando(true);
    try {
      if (editando) await atualizarAjuste(ajuste!.id, payload);
      else await criarAjuste(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o ajuste.');
      if (codigo === 'CODIGO_DUPLICADO') setErros((prev) => ({ ...prev, codigoAjuste: msg }));
      setAlerta(msg);
    } finally {
      setSalvando(false);
    }
  }

  const semEntidades = !carregandoEntidades && entidades.length === 0;

  return (
    <FormularioNovo novo={!editando}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}
        {semEntidades && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Cadastre uma Entidade Beneficiária antes de criar um ajuste.</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select
              label="Órgão concessor (município/entidade TCESP)"
              name="clienteId"
              value={form.clienteId}
              onChange={(e) => set('clienteId', e.target.value)}
              options={orgaos}
              placeholder={carregandoOrgaos ? 'Carregando...' : orgaos.length ? 'Selecione o órgão (opcional)' : 'Nenhum órgão cadastrado'}
            />
            <p className="mt-1 text-xs text-ink-400">Define o código de município e entidade no descritor da prestação. Cadastre em Configurações › Órgãos Concessores.</p>
          </div>
          <div className="sm:col-span-2">
            <Select
              label="Entidade Beneficiária *"
              name="entidadeBeneficiariaId"
              value={form.entidadeBeneficiariaId}
              onChange={(e) => set('entidadeBeneficiariaId', e.target.value)}
              error={erros.entidadeBeneficiariaId}
              options={entidades}
              placeholder={carregandoEntidades ? 'Carregando...' : 'Selecione a entidade'}
            />
          </div>

          <Select
            label="Tipo de Ajuste *"
            name="tipoAjuste"
            value={form.tipoAjuste}
            onChange={(e) => set('tipoAjuste', e.target.value)}
            error={erros.tipoAjuste}
            options={opcoesDe(TIPO_AJUSTE_LABEL)}
            placeholder="Selecione..."
          />
          <Select
            label="Periodicidade (Declaração Negativa) *"
            name="periodicidade"
            value={form.periodicidade}
            onChange={(e) => set('periodicidade', e.target.value)}
            error={erros.periodicidade}
            options={opcoesDe(PERIODICIDADE_LABEL)}
            placeholder="Selecione..."
          />

          <Input label="Código do Ajuste (TCESP) *" name="codigoAjuste" value={form.codigoAjuste} onChange={(e) => set('codigoAjuste', e.target.value)} error={erros.codigoAjuste} placeholder="ex.: 2025000000000023" />
          <Input label="Número (interno)" name="numero" value={form.numero} onChange={(e) => set('numero', e.target.value)} placeholder="ex.: 023/2025" />

          <Input
            label="Valor Global (R$) *"
            name="valor"
            value={form.valor}
            onChange={(e) => set('valor', mascaraMoeda(e.target.value))}
            error={erros.valor}
            placeholder="0,00"
            inputMode="numeric"
          />
          <Select
            label="Situação"
            name="status"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            options={opcoesDe(STATUS_AJUSTE_LABEL)}
          />

          <Input label="Data de Assinatura *" name="dataAssinatura" type="date" value={form.dataAssinatura} onChange={(e) => set('dataAssinatura', e.target.value)} error={erros.dataAssinatura} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vigência (início)" name="vigenciaInicial" type="date" value={form.vigenciaInicial} onChange={(e) => set('vigenciaInicial', e.target.value)} />
            <Input label="Vigência (fim)" name="vigenciaFinal" type="date" value={form.vigenciaFinal} onChange={(e) => set('vigenciaFinal', e.target.value)} error={erros.vigenciaFinal} />
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
              placeholder="Descreva o objeto do ajuste."
            />
            {erros.objeto && <p className="mt-1 text-xs font-medium text-red-500">{erros.objeto}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando || semEntidades}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Ajuste'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
