import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SlideButton } from '@/components/ui/SlideButton';
import { Button } from '@/components/ui/Button';
import { BuscaDominio, type ItemDominio } from '@/components/ui/BuscaDominio';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { apenasDigitos, mascaraCpfCnpj } from '@/lib/masks';
import { isCnpjValido } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { atualizarOrgao, criarOrgao } from '@/services/orgaos.service';
import { dominiosApi, type EntidadeAudespItem } from '@/services/dominios.service';
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
  empenhaRepasse: boolean;
  periodicidade: string;
  codigoMunicipio: string;
  codigoEntidade: string;
  cnpj: string;
};

/** Espera antes de conferir o par digitado, para não consultar a cada tecla. */
const ATRASO_CONFERENCIA_MS = 300;

/**
 * O par de códigos vira um código só para a busca ('6539-1'), porque o
 * autocomplete trabalha com um valor. Ele nunca é gravado: o que vai para o
 * banco continua sendo os dois números.
 */
const comoCodigo = (municipio: number, entidade: number) => `${municipio}-${entidade}`;

function doCodigo(codigo: string): { municipio: number; entidade: number } | null {
  const [m, e] = codigo.split('-').map(Number);
  return Number.isInteger(m) && Number.isInteger(e) ? { municipio: m, entidade: e } : null;
}

export function OrgaoForm({ orgao, onSuccess, onCancel }: Props) {
  const editando = !!orgao;
  const [form, setForm] = useState<Campos>({
    nome: orgao?.nome ?? '',
    tipoOrgao: orgao?.tipoOrgao ?? '',
    empenhaRepasse: orgao?.empenhaRepasse ?? true,
    periodicidade: orgao?.periodicidade ?? '',
    codigoMunicipio: orgao ? String(orgao.codigoMunicipio) : '',
    codigoEntidade: orgao ? String(orgao.codigoEntidade) : '',
    cnpj: orgao ? mascaraCpfCnpj(orgao.cnpj) : '',
  });
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  /** Entidade da tabela oficial que corresponde ao par digitado (null = não há). */
  const [oficial, setOficial] = useState<EntidadeAudespItem | null>(null);
  const [conferindo, setConferindo] = useState(false);
  /**
   * Liga quando a escolha veio da busca, e só então os demais campos são
   * preenchidos. Sem isso, abrir um órgão já cadastrado sobrescreveria o nome
   * que o usuário deu com o nome oficial — que pode ser outro de propósito.
   */
  const preencherDaTabela = useRef(false);

  const set = (campo: keyof Campos, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
    setAlerta(null);
  };

  const municipio = Number(form.codigoMunicipio);
  const entidade = Number(form.codigoEntidade);
  const parCompleto =
    !!form.codigoMunicipio && !!form.codigoEntidade && Number.isInteger(municipio) && Number.isInteger(entidade);

  /*
   * Confere o par contra a tabela oficial sempre que ele muda — digitado ou
   * escolhido na busca. É a rede que pega o código montado à mão: o código da
   * entidade é pequeno (1 = Prefeitura, 2 = Câmara) e **não** é o do município
   * com um dígito colado, erro que só apareceria na recusa do envio.
   */
  useEffect(() => {
    if (!parCompleto) {
      setOficial(null);
      setConferindo(false);
      preencherDaTabela.current = false;
      return;
    }
    let ativo = true;
    setConferindo(true);
    const id = setTimeout(() => {
      void dominiosApi
        .obterEntidadeAudesp(municipio, entidade)
        .then((item) => {
          if (!ativo) return;
          setOficial(item);
          if (item && preencherDaTabela.current) {
            setForm((f) => ({
              ...f,
              nome: item.nomeEntidade,
              // Tipo e periodicidade só vêm junto quando a tabela os tem; nas
              // entidades em que a lista oficial não alcança, a escolha fica
              // com quem cadastra.
              tipoOrgao: item.tipoOrgao ?? f.tipoOrgao,
              periodicidade: item.periodicidade ?? f.periodicidade,
            }));
            setErros((prev) => ({
              ...prev,
              nome: undefined,
              tipoOrgao: item.tipoOrgao ? undefined : prev.tipoOrgao,
              periodicidade: item.periodicidade ? undefined : prev.periodicidade,
            }));
          }
          preencherDaTabela.current = false;
        })
        .finally(() => {
          if (ativo) setConferindo(false);
        });
    }, ATRASO_CONFERENCIA_MS);
    return () => {
      ativo = false;
      clearTimeout(id);
    };
  }, [parCompleto, municipio, entidade]);

  const buscarEntidades = useCallback(async (termo: string): Promise<ItemDominio[]> => {
    const itens = await dominiosApi.buscarEntidadesAudesp(termo);
    return itens.map((e) => ({
      codigo: comoCodigo(e.codigoMunicipio, e.codigoEntidade),
      descricao: e.nomeEntidade,
      detalhe: `· ${e.nomeMunicipio}`,
    }));
  }, []);

  const resolverEntidade = useCallback(async (codigo: string): Promise<ItemDominio | null> => {
    const par = doCodigo(codigo);
    if (!par) return null;
    const e = await dominiosApi.obterEntidadeAudesp(par.municipio, par.entidade);
    return e
      ? { codigo, descricao: e.nomeEntidade, detalhe: `· ${e.nomeMunicipio}` }
      : null;
  }, []);

  function escolherEntidade(codigo: string) {
    const par = doCodigo(codigo);
    if (!par) {
      // Limpou a busca: os códigos vão junto, senão ficariam órfãos na tela.
      setForm((f) => ({ ...f, codigoMunicipio: '', codigoEntidade: '' }));
      return;
    }
    preencherDaTabela.current = true;
    setErros((prev) => ({ ...prev, codigoMunicipio: undefined, codigoEntidade: undefined }));
    setAlerta(null);
    setForm((f) => ({
      ...f,
      codigoMunicipio: String(par.municipio),
      codigoEntidade: String(par.entidade),
    }));
  }

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
      empenhaRepasse: form.empenhaRepasse,
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

        {/* A busca vem antes de tudo porque é o caminho curto: escolher aqui
            preenche o nome, os dois códigos e — quando a lista oficial da Fase V
            alcança a entidade — também o tipo e a periodicidade. */}
        <BuscaDominio
          label="Localizar na tabela oficial do Audesp"
          name="entidadeAudesp"
          value={oficial ? comoCodigo(oficial.codigoMunicipio, oficial.codigoEntidade) : ''}
          onChange={escolherEntidade}
          buscar={buscarEntidades}
          resolver={resolverEntidade}
          placeholder="Digite a cidade ou o nome do órgão — ex.: itajobi"
          hint="Os códigos do TCESP não são o código IBGE nem saem do CNPJ: escolher aqui evita digitá-los."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Nome do Órgão Concessor *" name="nome" value={form.nome} onChange={(e) => set('nome', capitalizarNome(e.target.value))} error={erros.nome} placeholder="ex.: PREFEITURA MUNICIPAL DE ADAMANTINA" autoFocus />
          </div>

          <Select label="Tipo de Órgão *" name="tipoOrgao" value={form.tipoOrgao} onChange={(e) => set('tipoOrgao', e.target.value)} error={erros.tipoOrgao} options={opcoesDe(TIPO_ORGAO_LABEL)} placeholder="Selecione..." />
          <Select label="Periodicidade (Declaração Negativa) *" name="periodicidade" value={form.periodicidade} onChange={(e) => set('periodicidade', e.target.value)} error={erros.periodicidade} options={opcoesDe(PERIODICIDADE_LABEL)} placeholder="Selecione..." />

          {/* Governa a aba de Empenhos da prestação. Nasce ligada porque o
              bloco é obrigatório no envio: desligá-la faz o documento sair com
              a lista vazia, e isso tem de ser uma decisão, não um esquecimento. */}
          <div className="sm:col-span-2">
            <SlideButton
              label="Este órgão empenha o repasse"
              anotacao="(habilita a aba Empenhos na prestação de contas)"
              name="empenhaRepasse"
              checked={form.empenhaRepasse}
              onChange={(v) => setForm((f) => ({ ...f, empenhaRepasse: v }))}
            />
            {!form.empenhaRepasse && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Com a marca desligada, a prestação é transmitida sem empenhos. Confirme que este
                órgão realmente não empenha o repasse — o bloco é exigido pelo TCESP.
              </p>
            )}
          </div>

          <Input label="Código Município *" name="codigoMunicipio" value={form.codigoMunicipio} onChange={(e) => set('codigoMunicipio', apenasDigitos(e.target.value).slice(0, 4))} error={erros.codigoMunicipio} placeholder="1–9999" inputMode="numeric" />
          <Input label="Código Entidade *" name="codigoEntidade" value={form.codigoEntidade} onChange={(e) => set('codigoEntidade', apenasDigitos(e.target.value).slice(0, 5))} error={erros.codigoEntidade} placeholder="1–99999" inputMode="numeric" />

          {/* O resultado da conferência fica junto dos dois campos, não no topo:
              é deles que ele fala. */}
          {parCompleto && (
            <div className="sm:col-span-2 -mt-2">
              {conferindo ? (
                <p className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Conferindo na tabela oficial do Audesp...
                </p>
              ) : oficial ? (
                <p className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span>
                    Confere com a tabela oficial: <strong>{oficial.nomeEntidade}</strong> · {oficial.nomeMunicipio}.
                  </span>
                </p>
              ) : (
                <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span>
                    Esse par de códigos não está na tabela oficial do Audesp carregada no sistema.
                    Confira pela busca acima: o par errado faz o TCESP recusar o envio inteiro. Se a
                    entidade foi criada depois da última edição da tabela, pode seguir.
                  </span>
                </p>
              )}
            </div>
          )}

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
