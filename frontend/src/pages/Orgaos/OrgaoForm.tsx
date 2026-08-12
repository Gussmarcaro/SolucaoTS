import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { apenasDigitos, mascaraCpfCnpj } from '@/lib/masks';
import { isCnpjValido } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { atualizarOrgao, criarOrgao } from '@/services/orgaos.service';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import {
  TIPO_ORGAO_LABEL,
  PERIODICIDADE_LABEL,
  type Orgao,
  type OrgaoPayload,
  type Periodicidade,
  type TipoOrgao,
} from '@/types/orgao';

interface Props {
  orgao?: Orgao | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const opcoesDe = <T extends string>(m: Record<T, string>) =>
  (Object.keys(m) as T[]).map((v) => ({ value: v, label: m[v] }));

type Campos = {
  nome: string;
  tipoOrgao: string;
  periodicidade: string;
  codigoMunicipio: string;
  codigoEntidade: string;
  cnpj: string;
};

export function OrgaoForm({ orgao, onSuccess, onCancel }: Props) {
  const editando = !!orgao;
  const [form, setForm] = useState<Campos>({
    nome: orgao?.nome ?? '',
    tipoOrgao: orgao?.tipoOrgao ?? '',
    periodicidade: orgao?.periodicidade ?? '',
    codigoMunicipio: orgao ? String(orgao.codigoMunicipio) : '',
    codigoEntidade: orgao ? String(orgao.codigoEntidade) : '',
    cnpj: orgao ? mascaraCpfCnpj(orgao.cnpj) : '',
  });
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
    if (form.nome.trim().length < 2) novos.nome = 'Informe o nome do órgão.';
    if (!form.tipoOrgao) novos.tipoOrgao = 'Selecione o tipo.';
    if (!form.periodicidade) novos.periodicidade = 'Selecione a periodicidade.';
    const mun = Number(form.codigoMunicipio);
    if (!Number.isInteger(mun) || mun < 1 || mun > 9999) novos.codigoMunicipio = 'Código inválido (1–9999).';
    const ent = Number(form.codigoEntidade);
    if (!Number.isInteger(ent) || ent < 1 || ent > 99999) novos.codigoEntidade = 'Código inválido (1–99999).';
    if (!isCnpjValido(apenasDigitos(form.cnpj))) novos.cnpj = 'CNPJ inválido.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    const payload: OrgaoPayload = {
      nome: form.nome.trim(),
      tipoOrgao: form.tipoOrgao as TipoOrgao,
      periodicidade: form.periodicidade as Periodicidade,
      codigoMunicipio: Number(form.codigoMunicipio),
      codigoEntidade: Number(form.codigoEntidade),
      cnpj: apenasDigitos(form.cnpj),
    };

    setSalvando(true);
    try {
      if (editando) await atualizarOrgao(orgao!.id, payload);
      else await criarOrgao(payload);
      onSuccess();
    } catch (error) {
      const codigo = extrairCodigoErro(error);
      const msg = extrairMensagemErro(error, 'Não foi possível salvar o órgão.');
      if (codigo === 'CNPJ_DUPLICADO') setErros((prev) => ({ ...prev, cnpj: msg }));
      if (codigo === 'CODIGOS_DUPLICADOS') setErros((prev) => ({ ...prev, codigoEntidade: msg }));
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
            <Input label="Nome do Órgão Concessor *" name="nome" value={form.nome} onChange={(e) => set('nome', capitalizarNome(e.target.value))} error={erros.nome} placeholder="ex.: PREFEITURA MUNICIPAL DE ADAMANTINA" autoFocus />
          </div>

          <Select label="Tipo de Órgão *" name="tipoOrgao" value={form.tipoOrgao} onChange={(e) => set('tipoOrgao', e.target.value)} error={erros.tipoOrgao} options={opcoesDe(TIPO_ORGAO_LABEL)} placeholder="Selecione..." />
          <Select label="Periodicidade (Declaração Negativa) *" name="periodicidade" value={form.periodicidade} onChange={(e) => set('periodicidade', e.target.value)} error={erros.periodicidade} options={opcoesDe(PERIODICIDADE_LABEL)} placeholder="Selecione..." />

          <Input label="Código Município *" name="codigoMunicipio" value={form.codigoMunicipio} onChange={(e) => set('codigoMunicipio', apenasDigitos(e.target.value).slice(0, 4))} error={erros.codigoMunicipio} placeholder="1–9999" inputMode="numeric" />
          <Input label="Código Entidade *" name="codigoEntidade" value={form.codigoEntidade} onChange={(e) => set('codigoEntidade', apenasDigitos(e.target.value).slice(0, 5))} error={erros.codigoEntidade} placeholder="1–99999" inputMode="numeric" />

          <div className="sm:col-span-2">
            <Input label="CNPJ *" name="cnpj" value={form.cnpj} onChange={(e) => set('cnpj', mascaraCpfCnpj(e.target.value))} error={erros.cnpj} placeholder="00.000.000/0000-00" inputMode="numeric" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Órgão Concessor'}
          </Button>
        </div>
      </form>
    </FormularioNovo>
  );
}
