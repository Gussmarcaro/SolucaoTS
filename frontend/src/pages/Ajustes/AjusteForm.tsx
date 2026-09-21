import { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormularioNovo } from '@/components/ui/LabelCampo';
import { UF_OPTIONS } from '@/lib/ufs';
import {
  apenasDigitos,
  mascaraCelular,
  mascaraCep,
  mascaraCpf,
  mascaraMoeda,
  moedaParaNumero,
  numeroParaMascaraMoeda,
} from '@/lib/masks';
import { isCpfValido, isEmailValido } from '@/lib/validators';
import { capitalizarNome } from '@/lib/nomeProprio';
import { consultarCep } from '@/services/viacep.service';
import { atualizarAjuste, criarAjuste, enviarDocumentoAjuste } from '@/services/ajustes.service';
import { listarEntidades } from '@/services/entidades.service';
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
  type ContaBancariaAjuste,
} from '@/types/ajuste';
import { FontesEContas } from './FontesEContas';
import { AnexoPdf, type Anexado } from './AnexoPdf';

interface Props {
  ajuste?: Ajuste | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const opcoesDe = <T extends string>(m: Record<T, string>) =>
  (Object.keys(m) as T[]).map((v) => ({ value: v, label: m[v] }));

type Campos = {
  entidadeBeneficiariaId: string;
  tipoAjuste: string;
  descricaoResumida: string;
  codigoAjuste: string;
  numero: string;
  objeto: string;
  valor: string;
  periodicidade: string;
  status: string;
  dataAssinatura: string;
  vigenciaInicial: string;
  vigenciaFinal: string;
  previsaoFederal: string;
  previsaoEstadual: string;
  previsaoMunicipal: string;
  responsavelNome: string;
  responsavelCpf: string;
  responsavelDataNascimento: string;
  responsavelCep: string;
  responsavelLogradouro: string;
  responsavelNumero: string;
  responsavelComplemento: string;
  responsavelBairro: string;
  responsavelCidade: string;
  responsavelUf: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  responsavelCargo: string;
  responsavelDataEntrada: string;
  responsavelDataSaida: string;
  publicacaoLocal: string;
  publicacaoLink: string;
  publicacaoData: string;
};

function estadoInicial(a?: Ajuste | null): Campos {
  return {
    entidadeBeneficiariaId: a?.entidadeBeneficiariaId ?? '',
    tipoAjuste: a?.tipoAjuste ?? '',
    descricaoResumida: a?.descricaoResumida ?? '',
    codigoAjuste: a?.codigoAjuste ?? '',
    numero: a?.numero ?? '',
    objeto: a?.objeto ?? '',
    valor: a ? numeroParaMascaraMoeda(a.valorGlobal) : '',
    periodicidade: a?.periodicidade ?? '',
    status: a?.status ?? 'EM_ELABORACAO',
    dataAssinatura: a?.dataAssinatura ?? '',
    vigenciaInicial: a?.vigenciaInicial ?? '',
    vigenciaFinal: a?.vigenciaFinal ?? '',
    previsaoFederal: a?.previsaoFederal != null ? numeroParaMascaraMoeda(a.previsaoFederal) : '',
    previsaoEstadual: a?.previsaoEstadual != null ? numeroParaMascaraMoeda(a.previsaoEstadual) : '',
    previsaoMunicipal:
      a?.previsaoMunicipal != null ? numeroParaMascaraMoeda(a.previsaoMunicipal) : '',
    responsavelNome: a?.responsavelNome ?? '',
    responsavelCpf: a?.responsavelCpf ?? '',
    responsavelDataNascimento: a?.responsavelDataNascimento ?? '',
    responsavelCep: a?.responsavelCep ?? '',
    responsavelLogradouro: a?.responsavelLogradouro ?? '',
    responsavelNumero: a?.responsavelNumero ?? '',
    responsavelComplemento: a?.responsavelComplemento ?? '',
    responsavelBairro: a?.responsavelBairro ?? '',
    responsavelCidade: a?.responsavelCidade ?? '',
    responsavelUf: a?.responsavelUf ?? '',
    responsavelEmail: a?.responsavelEmail ?? '',
    responsavelTelefone: a?.responsavelTelefone ?? '',
    responsavelCargo: a?.responsavelCargo ?? '',
    responsavelDataEntrada: a?.responsavelDataEntrada ?? '',
    responsavelDataSaida: a?.responsavelDataSaida ?? '',
    publicacaoLocal: a?.publicacaoLocal ?? '',
    publicacaoLink: a?.publicacaoLink ?? '',
    publicacaoData: a?.publicacaoData ?? '',
  };
}

export function AjusteForm({ ajuste, onSuccess, onCancel }: Props) {
  const editando = !!ajuste;
  const [form, setForm] = useState<Campos>(() => estadoInicial(ajuste));
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [alerta, setAlerta] = useState<string | null>(null);
  /**
   * Fontes e contas do ajuste — é a lista que o pagamento poderá escolher.
   *
   * Sem elas, o lançamento aceita qualquer uma das 16 fontes da tabela e
   * qualquer conta digitada: fonte errada não é recusada no envio (o código
   * existe), e o erro só apareceria na análise do Tribunal.
   */
  const [fontes, setFontes] = useState<number[]>(ajuste?.fontesRecurso ?? []);
  const [contas, setContas] = useState<ContaBancariaAjuste[]>(ajuste?.contasBancarias ?? []);
  const [salvando, setSalvando] = useState(false);
  const [entidades, setEntidades] = useState<{ value: string; label: string }[]>([]);
  const [carregandoEntidades, setCarregandoEntidades] = useState(true);

  /*
   * Os dois anexos: o PDF escolhido só sobe **depois** de salvar, porque a rota
   * precisa do id do ajuste — que, num cadastro novo, só existe após a
   * gravação. Por isso o arquivo mora aqui, e não dentro do `AnexoPdf`.
   */
  const anexadoDe = (nome: string | null, tamanho: number | null) =>
    nome ? { nome, tamanho: tamanho ?? 0 } : null;

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [anexado, setAnexado] = useState<Anexado | null>(
    anexadoDe(ajuste?.termoCienciaArquivoNome ?? null, ajuste?.termoCienciaArquivoTamanho ?? null),
  );

  const [arquivoAjuste, setArquivoAjuste] = useState<File | null>(null);
  const [anexadoAjuste, setAnexadoAjuste] = useState<Anexado | null>(
    anexadoDe(
      ajuste?.ajusteAssinadoArquivoNome ?? null,
      ajuste?.ajusteAssinadoArquivoTamanho ?? null,
    ),
  );

  const [buscandoCep, setBuscandoCep] = useState(false);

  /** Preenche o endereço do responsável a partir do CEP (mesmo fluxo de Usuários). */
  async function handleCepBlur() {
    if (apenasDigitos(form.responsavelCep).length !== 8) return;
    setBuscandoCep(true);
    try {
      const endereco = await consultarCep(form.responsavelCep);
      if (!endereco) {
        setErros((prev) => ({ ...prev, responsavelCep: 'CEP não encontrado.' }));
        return;
      }
      setForm((prev) => ({
        ...prev,
        responsavelLogradouro: endereco.logradouro || prev.responsavelLogradouro,
        responsavelBairro: endereco.bairro || prev.responsavelBairro,
        responsavelCidade: endereco.cidade || prev.responsavelCidade,
        responsavelUf: endereco.uf || prev.responsavelUf,
      }));
      setErros((prev) => ({ ...prev, responsavelCep: undefined }));
    } catch {
      setErros((prev) => ({ ...prev, responsavelCep: 'Falha ao consultar o CEP.' }));
    } finally {
      setBuscandoCep(false);
    }
  }


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
    if (form.responsavelCpf && !isCpfValido(form.responsavelCpf))
      novos.responsavelCpf = 'CPF inválido.';
    if (form.responsavelEmail && !isEmailValido(form.responsavelEmail))
      novos.responsavelEmail = 'E-mail inválido.';
    if (form.responsavelTelefone && apenasDigitos(form.responsavelTelefone).length < 10)
      novos.responsavelTelefone = 'Telefone inválido.';
    if (
      form.responsavelDataSaida &&
      form.responsavelDataEntrada &&
      form.responsavelDataSaida < form.responsavelDataEntrada
    )
      novos.responsavelDataSaida = 'A saída não pode ser anterior à entrada.';
    if (form.publicacaoLink && !/^https?:\/\/\S+$/i.test(form.publicacaoLink.trim()))
      novos.publicacaoLink = 'O link deve começar com http:// ou https://.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlerta(null);
    if (!validar()) return;

    if (fontes.length === 0) {
      setAlerta('Informe ao menos uma fonte de recurso do ajuste.');
      return;
    }

    const payload: AjustePayload = {
      fontesRecurso: fontes,
      contasBancarias: contas.map(({ banco, agencia, conta, contaTipo, fonteRecursoTipo, apelido }) => ({
        banco,
        agencia,
        conta,
        contaTipo,
        fonteRecursoTipo,
        apelido,
      })),
      entidadeBeneficiariaId: form.entidadeBeneficiariaId,
      tipoAjuste: form.tipoAjuste as TipoAjuste,
      descricaoResumida: form.descricaoResumida.trim() || null,
      codigoAjuste: form.codigoAjuste.trim(),
      numero: form.numero.trim() || null,
      objeto: form.objeto.trim(),
      valorGlobal: moedaParaNumero(form.valor),
      dataAssinatura: form.dataAssinatura,
      vigenciaInicial: form.vigenciaInicial || null,
      vigenciaFinal: form.vigenciaFinal || null,
      periodicidade: form.periodicidade as Periodicidade,
      status: form.status as StatusAjuste,

      previsaoFederal: form.previsaoFederal ? moedaParaNumero(form.previsaoFederal) : null,
      previsaoEstadual: form.previsaoEstadual ? moedaParaNumero(form.previsaoEstadual) : null,
      previsaoMunicipal: form.previsaoMunicipal ? moedaParaNumero(form.previsaoMunicipal) : null,

      responsavelNome: form.responsavelNome.trim() || null,
      responsavelCpf: form.responsavelCpf ? apenasDigitos(form.responsavelCpf) : null,
      responsavelDataNascimento: form.responsavelDataNascimento || null,
      responsavelCep: form.responsavelCep ? apenasDigitos(form.responsavelCep) : null,
      responsavelLogradouro: form.responsavelLogradouro.trim() || null,
      responsavelNumero: form.responsavelNumero.trim() || null,
      responsavelComplemento: form.responsavelComplemento.trim() || null,
      responsavelBairro: form.responsavelBairro.trim() || null,
      responsavelCidade: form.responsavelCidade.trim() || null,
      responsavelUf: form.responsavelUf || null,
      responsavelEmail: form.responsavelEmail.trim().toLowerCase() || null,
      responsavelTelefone: form.responsavelTelefone ? apenasDigitos(form.responsavelTelefone) : null,
      responsavelCargo: form.responsavelCargo.trim() || null,
      responsavelDataEntrada: form.responsavelDataEntrada || null,
      responsavelDataSaida: form.responsavelDataSaida || null,

      publicacaoLocal: form.publicacaoLocal.trim() || null,
      publicacaoLink: form.publicacaoLink.trim() || null,
      publicacaoData: form.publicacaoData || null,
    };

    setSalvando(true);
    try {
      const salvo = editando
        ? await atualizarAjuste(ajuste!.id, payload)
        : await criarAjuste(payload);

      // Uploads em seguida: as rotas dos anexos precisam do id, que no cadastro
      // novo só existe agora. Falhar aqui não desfaz o ajuste já gravado — e é
      // por isso que a mensagem diz exatamente o que foi e o que não foi.
      for (const envio of [
        { arquivo, documento: 'termo-ciencia' as const, nome: 'o termo' },
        { arquivo: arquivoAjuste, documento: 'ajuste-assinado' as const, nome: 'o ajuste celebrado' },
      ]) {
        if (!envio.arquivo) continue;
        try {
          await enviarDocumentoAjuste(salvo.id, envio.documento, envio.arquivo);
        } catch (e) {
          setSalvando(false);
          return setAlerta(
            `Ajuste salvo, mas ${envio.nome} não foi anexado: ${extrairMensagemErro(e, 'falha no envio')}.`,
          );
        }
      }
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
          {/*
            Órgão: mostrado, nunca escolhido — o mesmo que em Usuários.

            Era um Select, e ele nunca escolheu nada: a lista vem de `/orgaos`,
            que é recortada por tenant e traz só o órgão de quem está logado. O
            que ele fazia era mandar `clienteId` no corpo da requisição, e o
            servidor gravava — dava para criar o ajuste dentro de outro órgão e
            para mover o próprio para fora do seu. Hoje o servidor lê o órgão do
            token e ignora o campo; deixar o seletor na tela afirmaria que há
            uma escolha onde não há.
          */}
          <div className="sm:col-span-2">
            <Input
              label="Órgão concessor (município/entidade TCESP)"
              anotacao="(Automático)"
              name="clienteId"
              value={ajuste?.orgaoNome ?? 'O seu órgão'}
              readOnly
              hint="Define o código de município e entidade no descritor da prestação. O ajuste nasce no órgão de quem o cadastra e não muda de dono."
            />
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

          <div className="sm:col-span-2">
            <Input
              label="Descrição Resumida"
              name="descricaoResumida"
              value={form.descricaoResumida}
              onChange={(e) => set('descricaoResumida', e.target.value.slice(0, 80))}
              error={erros.descricaoResumida}
              placeholder="ex.: Creche Vila Nova — 2025"
              hint="Descrição curta para identificar o ajuste nas telas. Não é enviada ao TCESP."
            />
          </div>

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

          {/* Previsão por fontes de recursos */}
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700 sm:col-span-2">
            <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">Previsão por Fontes de Recursos</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input label="Federal (R$)" name="previsaoFederal" value={form.previsaoFederal} onChange={(e) => set('previsaoFederal', mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
              <Input label="Estadual (R$)" name="previsaoEstadual" value={form.previsaoEstadual} onChange={(e) => set('previsaoEstadual', mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
              <Input label="Municipal (R$)" name="previsaoMunicipal" value={form.previsaoMunicipal} onChange={(e) => set('previsaoMunicipal', mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700 sm:col-span-2">
            <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">
              Fontes de Recursos e Contas <span className="text-red-500">*</span>
            </legend>
            <FontesEContas
              fontes={fontes}
              onFontes={setFontes}
              contas={contas}
              onContas={setContas}
            />
          </fieldset>

          {/* Responsável pelo Ajuste */}
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700 sm:col-span-2">
            <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">Responsável pelo Ajuste</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <Input label="Nome" name="responsavelNome" value={form.responsavelNome} onChange={(e) => set('responsavelNome', capitalizarNome(e.target.value))} />
              </div>
              <div className="sm:col-span-3">
                <Input label="CPF" name="responsavelCpf" value={mascaraCpf(form.responsavelCpf)} onChange={(e) => set('responsavelCpf', e.target.value)} error={erros.responsavelCpf} placeholder="000.000.000-00" inputMode="numeric" />
              </div>
              <div className="sm:col-span-4">
                <Input label="Data de Nascimento" name="responsavelDataNascimento" type="date" value={form.responsavelDataNascimento} onChange={(e) => set('responsavelDataNascimento', e.target.value)} />
              </div>

              {/* Endereço no mesmo formato do cadastro de Usuários, com
                  preenchimento automático pelo CEP. */}
              <div className="sm:col-span-2">
                <Input
                  label="CEP"
                  name="responsavelCep"
                  value={mascaraCep(form.responsavelCep)}
                  onChange={(e) => set('responsavelCep', e.target.value)}
                  onBlur={handleCepBlur}
                  error={erros.responsavelCep}
                  placeholder="00000-000"
                  inputMode="numeric"
                  rightSlot={buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                />
              </div>
              <div className="sm:col-span-8">
                <Input label="Endereço" name="responsavelLogradouro" value={form.responsavelLogradouro} onChange={(e) => set('responsavelLogradouro', e.target.value)} placeholder="Rua, Avenida..." />
              </div>
              <div className="sm:col-span-2">
                <Input label="Número" name="responsavelNumero" value={form.responsavelNumero} onChange={(e) => set('responsavelNumero', e.target.value)} placeholder="nº" />
              </div>

              <div className="sm:col-span-3">
                <Input label="Complemento" name="responsavelComplemento" value={form.responsavelComplemento} onChange={(e) => set('responsavelComplemento', e.target.value)} placeholder="Apto, bloco..." />
              </div>
              <div className="sm:col-span-3">
                <Input label="Bairro" name="responsavelBairro" value={form.responsavelBairro} onChange={(e) => set('responsavelBairro', e.target.value)} />
              </div>
              <div className="sm:col-span-4">
                <Input label="Cidade" name="responsavelCidade" value={form.responsavelCidade} onChange={(e) => set('responsavelCidade', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Select label="UF" name="responsavelUf" value={form.responsavelUf} onChange={(e) => set('responsavelUf', e.target.value)} options={UF_OPTIONS} placeholder="—" />
              </div>

              <div className="sm:col-span-5">
                <Input label="E-mail" name="responsavelEmail" type="email" value={form.responsavelEmail} onChange={(e) => set('responsavelEmail', e.target.value)} error={erros.responsavelEmail} />
              </div>
              <div className="sm:col-span-3">
                <Input label="Telefone / Celular" name="responsavelTelefone" value={mascaraCelular(form.responsavelTelefone)} onChange={(e) => set('responsavelTelefone', e.target.value)} error={erros.responsavelTelefone} placeholder="(00) 00000-0000" inputMode="numeric" />
              </div>
              <div className="sm:col-span-4">
                <Input label="Função / Cargo" name="responsavelCargo" value={form.responsavelCargo} onChange={(e) => set('responsavelCargo', e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* Vigência do Responsável */}
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700 sm:col-span-2">
            <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">Vigência do Responsável</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Data Entrada" name="responsavelDataEntrada" type="date" value={form.responsavelDataEntrada} onChange={(e) => set('responsavelDataEntrada', e.target.value)} />
              <Input label="Data Saída" name="responsavelDataSaida" type="date" value={form.responsavelDataSaida} onChange={(e) => set('responsavelDataSaida', e.target.value)} error={erros.responsavelDataSaida} />
            </div>
          </fieldset>

          {/* Termo de Ciência e Notificação */}
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700 sm:col-span-2">
            <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">Termo de Ciência e Notificação</legend>
            <AnexoPdf
              ajusteId={editando ? ajuste!.id : undefined}
              documento="termo-ciencia"
              rotulo="do termo"
              arquivo={arquivo}
              onArquivo={setArquivo}
              anexado={anexado}
              onAnexado={setAnexado}
            />
          </fieldset>

          {/* Ajuste Celebrado — o instrumento assinado em si. Fica ao lado do
              termo, e não dentro dele: são dois documentos distintos, e quem
              confere a prestação procura cada um pelo nome. */}
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700 sm:col-span-2">
            <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">Ajuste Celebrado</legend>
            <AnexoPdf
              ajusteId={editando ? ajuste!.id : undefined}
              documento="ajuste-assinado"
              rotulo="do ajuste celebrado"
              arquivo={arquivoAjuste}
              onArquivo={setArquivoAjuste}
              anexado={anexadoAjuste}
              onAnexado={setAnexadoAjuste}
            />
          </fieldset>

          {/* Publicação do ajuste */}
          <fieldset className="rounded-xl border border-ink-200 px-3 pb-3 pt-1 dark:border-ink-700 sm:col-span-2">
            <legend className="px-1 text-[13px] font-normal text-ink-600 dark:text-ink-300">Publicação do Ajuste</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <Input label="Local" name="publicacaoLocal" value={form.publicacaoLocal} onChange={(e) => set('publicacaoLocal', e.target.value)} placeholder="ex.: Diário Oficial do Município" />
              </div>
              <div className="sm:col-span-5">
                <Input
                  label="Link"
                  name="publicacaoLink"
                  value={form.publicacaoLink}
                  onChange={(e) => set('publicacaoLink', e.target.value)}
                  error={erros.publicacaoLink}
                  placeholder="https://..."
                  rightSlot={
                    /^https?:\/\/\S+$/i.test(form.publicacaoLink.trim()) ? (
                      <a
                        href={form.publicacaoLink.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir em nova aba"
                        className="focus-ring pointer-events-auto block rounded text-ink-400 hover:text-brand-500"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : undefined
                  }
                />
              </div>
              <div className="sm:col-span-3">
                <Input label="Data" name="publicacaoData" type="date" value={form.publicacaoData} onChange={(e) => set('publicacaoData', e.target.value)} />
              </div>
            </div>
          </fieldset>

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
