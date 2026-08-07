import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Braces, CheckCircle2, Circle, Copy, Download, Loader2, RefreshCw, Send, ServerCrash, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  buscarPrestacao,
  consultarStatusPrestacao,
  excluirPrestacao,
  gerarJsonPrestacao,
  transmitirPrestacao,
  type Ambiente,
  type ResultadoEnvio,
  type ResultadoJson,
  type StatusConsulta,
} from '@/services/prestacoes.service';
import { extrairMensagemErro } from '@/services/http';
import { TIPO_AJUSTE_LABEL } from '@/types/ajuste';
import {
  STATUS_PRESTACAO_LABEL,
  STATUS_PRESTACAO_TONE,
  blocosAplicaveis,
  type Prestacao,
} from '@/types/prestacao';
import { cn } from '@/lib/cn';
import { DocumentosFiscaisTab } from './blocos/DocumentosFiscaisTab';
import { PagamentosTab } from './blocos/PagamentosTab';
import { ReceitasTab } from './blocos/ReceitasTab';
import { DisponibilidadesTab } from './blocos/DisponibilidadesTab';
import { DescontosTab } from './blocos/DescontosTab';
import { DevolucoesTab } from './blocos/DevolucoesTab';
import { GlosasTab } from './blocos/GlosasTab';
import { EmpregadosTab } from './blocos/EmpregadosTab';
import { EmpenhosPrestacaoTab } from './blocos/EmpenhosPrestacaoTab';
import { RepassesTab } from './blocos/RepassesTab';
import { BensTab } from './blocos/BensTab';
import { ServidoresCedidosTab } from './blocos/ServidoresCedidosTab';
import { RelatorioAtividadesTab } from './blocos/RelatorioAtividadesTab';
import { DadosGeraisTab, ResponsaveisTab } from './blocos/CertidoesTabs';
import { DeclaracoesTab, ParecerConclusivoTab, TransparenciaTab } from './blocos/DeclaratoriosTabs';

const IMPLEMENTADOS = new Set([
  'empregados',
  'bens',
  'documentosFiscais',
  'pagamentos',
  'receitas',
  'disponibilidades',
  'descontos',
  'devolucoes',
  'glosas',
  'empenhos',
  'repasses',
  'servidoresCedidos',
  'atividades',
  'dadosGerais',
  'responsaveis',
  'declaracoes',
  'parecerConclusivo',
  'transparencia',
]);

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor}</dd>
    </div>
  );
}

export function PrestacaoDetalhe() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [prestacao, setPrestacao] = useState<Prestacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);
  const [blocoAtivo, setBlocoAtivo] = useState('documentosFiscais');
  const [json, setJson] = useState<ResultadoJson | null>(null);
  const [gerandoJson, setGerandoJson] = useState(false);
  const [jsonAberto, setJsonAberto] = useState(false);
  const [erroJson, setErroJson] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  // Transmissão (Fase D)
  const [transmitirAberto, setTransmitirAberto] = useState(false);
  const [ambiente, setAmbiente] = useState<Ambiente>('PILOTO');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [transmitindo, setTransmitindo] = useState(false);
  const [envio, setEnvio] = useState<ResultadoEnvio | null>(null);
  const [avisosEnvio, setAvisosEnvio] = useState<string[]>([]);
  const [erroTransmit, setErroTransmit] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [statusConsulta, setStatusConsulta] = useState<StatusConsulta | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    buscarPrestacao(id)
      .then((r) => vivo && setPrestacao(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar a prestação.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [id]);

  if (carregando) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;
  }
  if (erro || !prestacao) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <ServerCrash className="h-8 w-8 text-red-400" />
        <p className="text-sm font-medium text-ink-600 dark:text-ink-300">{erro ?? 'Prestação não encontrada.'}</p>
        <Link to="/prestacao-contas"><Button variant="secondary" size="sm"><ArrowLeft className="h-4 w-4" />Voltar</Button></Link>
      </div>
    );
  }

  const emElaboracao = prestacao.status === 'EM_ELABORACAO';
  const blocos = blocosAplicaveis(prestacao.ajusteTipo);

  async function confirmarExclusao() {
    setExcluindo(true);
    setErroExcluir(null);
    try {
      await excluirPrestacao(id);
      navigate('/prestacao-contas');
    } catch (e) {
      setErroExcluir(extrairMensagemErro(e, 'Não foi possível excluir.'));
    } finally {
      setExcluindo(false);
    }
  }

  async function gerarJson() {
    setGerandoJson(true);
    setErroJson(null);
    setCopiado(false);
    try {
      const r = await gerarJsonPrestacao(id);
      setJson(r);
      setJsonAberto(true);
    } catch (e) {
      setErroJson(extrairMensagemErro(e, 'Não foi possível gerar o JSON.'));
      setJsonAberto(true);
    } finally {
      setGerandoJson(false);
    }
  }

  const jsonTexto = json ? JSON.stringify(json.documento, null, 2) : '';

  function copiarJson() {
    navigator.clipboard.writeText(jsonTexto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function baixarJson() {
    const blob = new Blob([jsonTexto], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prestacao-${prestacao?.ajusteCodigo ?? 'documento'}-${prestacao?.ano ?? ''}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function recarregarPrestacao() {
    try {
      setPrestacao(await buscarPrestacao(id));
    } catch {
      /* mantém o estado atual se a releitura falhar */
    }
  }

  function abrirTransmissao() {
    setEnvio(null);
    setStatusConsulta(null);
    setErroTransmit(null);
    setSenha('');
    setTransmitirAberto(true);
  }

  async function transmitir() {
    if (!usuario.trim() || !senha.trim()) {
      setErroTransmit('Informe usuário e senha do WebService Audesp.');
      return;
    }
    setTransmitindo(true);
    setErroTransmit(null);
    setStatusConsulta(null);
    try {
      const r = await transmitirPrestacao(id, { ambiente, usuario: usuario.trim(), senha });
      setEnvio(r.envio);
      setAvisosEnvio(r.avisos);
      await recarregarPrestacao();
    } catch (e) {
      setErroTransmit(extrairMensagemErro(e, 'Falha na transmissão.'));
    } finally {
      setTransmitindo(false);
    }
  }

  async function consultarStatus() {
    const protocolo = envio?.protocolo ?? prestacao?.protocolo ?? '';
    if (!protocolo) {
      setErroTransmit('Sem protocolo para consultar.');
      return;
    }
    if (!usuario.trim() || !senha.trim()) {
      setErroTransmit('Informe usuário e senha para consultar.');
      return;
    }
    setConsultando(true);
    setErroTransmit(null);
    try {
      const s = await consultarStatusPrestacao(id, { ambiente, usuario: usuario.trim(), senha, protocolo });
      setStatusConsulta(s);
      await recarregarPrestacao();
    } catch (e) {
      setErroTransmit(extrairMensagemErro(e, 'Falha ao consultar o status.'));
    } finally {
      setConsultando(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <Link to="/prestacao-contas" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100">
          <ArrowLeft className="h-4 w-4" />
          Prestações
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight text-ink-900 dark:text-ink-50">{prestacao.ajusteCodigo}</h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{prestacao.entidadeNome}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{TIPO_AJUSTE_LABEL[prestacao.ajusteTipo] ?? prestacao.tipoDocumento}</Badge>
              <Badge tone={STATUS_PRESTACAO_TONE[prestacao.status]}>{STATUS_PRESTACAO_LABEL[prestacao.status]}</Badge>
              <span className="text-sm font-medium text-ink-600 dark:text-ink-300">Exercício {prestacao.ano} · mês {prestacao.mes}</span>
              {prestacao.ehRetificacao && <Badge tone="neutral">Retificação</Badge>}
            </div>
          </div>
          {emElaboracao && (
            <Button variant="secondary" onClick={() => setConfirmar(true)}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Descritor */}
      <div className="mb-6 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
        <h2 className="mb-4 text-sm font-semibold text-ink-700 dark:text-ink-200">Descritor do documento</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Campo label="Tipo documento" valor={TIPO_AJUSTE_LABEL[prestacao.ajusteTipo] ?? prestacao.tipoDocumento} />
          <Campo label="Código do ajuste" valor={prestacao.ajusteCodigo} />
          <Campo label="Ano" valor={String(prestacao.ano)} />
          <Campo label="Mês" valor={String(prestacao.mes)} />
          <Campo label="Protocolo" valor={prestacao.protocolo ?? '—'} />
          <Campo label="Data de envio" valor={prestacao.dataEnvio ? new Date(prestacao.dataEnvio).toLocaleString('pt-BR') : '—'} />
        </dl>
      </div>

      {/* Blocos: navegação (esquerda) + painel (direita) */}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <nav className="h-max rounded-2xl border border-ink-200/70 bg-white p-2 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">Blocos ({blocos.length})</p>
          <ul className="space-y-0.5">
            {blocos.map((b) => {
              const impl = IMPLEMENTADOS.has(b.chave);
              const ativo = blocoAtivo === b.chave;
              return (
                <li key={b.chave}>
                  <button
                    type="button"
                    onClick={() => setBlocoAtivo(b.chave)}
                    className={cn(
                      'focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      ativo ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
                    )}
                  >
                    {impl ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-ink-300" />}
                    <span className="flex-1 truncate">{b.nome}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card dark:border-ink-800/70 dark:bg-ink-900">
          {blocoAtivo === 'empregados' ? (
            <EmpregadosTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'glosas' ? (
            <GlosasTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'documentosFiscais' ? (
            <DocumentosFiscaisTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'pagamentos' ? (
            <PagamentosTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'receitas' ? (
            <ReceitasTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'disponibilidades' ? (
            <DisponibilidadesTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'descontos' ? (
            <DescontosTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'devolucoes' ? (
            <DevolucoesTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'empenhos' ? (
            <EmpenhosPrestacaoTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'repasses' ? (
            <RepassesTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'bens' ? (
            <BensTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'servidoresCedidos' ? (
            <ServidoresCedidosTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'atividades' ? (
            <RelatorioAtividadesTab prestacaoId={prestacao.id} ajusteId={prestacao.ajusteId} />
          ) : blocoAtivo === 'dadosGerais' ? (
            <DadosGeraisTab prestacaoId={prestacao.id} ajusteTipo={prestacao.ajusteTipo} />
          ) : blocoAtivo === 'responsaveis' ? (
            <ResponsaveisTab prestacaoId={prestacao.id} ajusteTipo={prestacao.ajusteTipo} />
          ) : blocoAtivo === 'declaracoes' ? (
            <DeclaracoesTab prestacaoId={prestacao.id} ajusteTipo={prestacao.ajusteTipo} />
          ) : blocoAtivo === 'parecerConclusivo' ? (
            <ParecerConclusivoTab prestacaoId={prestacao.id} />
          ) : blocoAtivo === 'transparencia' ? (
            <TransparenciaTab prestacaoId={prestacao.id} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Circle className="h-8 w-8 text-ink-300" />
              <p className="text-sm font-medium text-ink-600 dark:text-ink-300">
                {blocos.find((b) => b.chave === blocoAtivo)?.nome}
              </p>
              <p className="max-w-md text-xs text-ink-400">Este bloco entra numa próxima etapa da Fase B.</p>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-400">Gere a prévia do JSON e transmita ao Audesp. Teste sempre no <span className="font-medium">piloto</span> antes da produção.</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={gerarJson} disabled={gerandoJson}>
                {gerandoJson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Braces className="h-4 w-4" />}
                Gerar JSON (prévia)
              </Button>
              <Button size="sm" onClick={abrirTransmissao}>
                <Send className="h-4 w-4" />
                Transmitir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmação de exclusão */}
      <Modal
        open={confirmar}
        onClose={() => setConfirmar(false)}
        title="Excluir prestação"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(false)} disabled={excluindo}>Cancelar</Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={excluindo}>
              {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Deseja excluir a prestação do exercício <span className="font-semibold text-ink-900 dark:text-ink-50">{prestacao.ano}</span> do ajuste {prestacao.ajusteCodigo}? Esta ação não pode ser desfeita.
        </p>
        {erroExcluir && <p className="mt-2 text-sm font-medium text-red-500">{erroExcluir}</p>}
      </Modal>

      {/* Prévia do documento JSON */}
      <Modal
        open={jsonAberto}
        onClose={() => setJsonAberto(false)}
        title="Documento JSON (prévia)"
        subtitle="Montado a partir dos blocos capturados, no formato do manual v1.19."
        size="2xl"
        footer={
          json ? (
            <>
              <Button variant="secondary" onClick={copiarJson}>
                <Copy className="h-4 w-4" />
                {copiado ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button onClick={baixarJson}>
                <Download className="h-4 w-4" />
                Baixar .json
              </Button>
            </>
          ) : undefined
        }
      >
        {erroJson ? (
          <p className="text-sm font-medium text-red-500">{erroJson}</p>
        ) : json ? (
          <div className="space-y-3">
            {json.avisos.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <p className="mb-1 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Avisos ({json.avisos.length})
                </p>
                <ul className="list-disc space-y-0.5 pl-5 text-xs">
                  {json.avisos.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            <pre className="max-h-[50vh] overflow-auto rounded-xl border border-ink-200 bg-ink-50 p-4 text-xs leading-relaxed text-ink-800 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-200">
              {jsonTexto}
            </pre>
          </div>
        ) : null}
      </Modal>

      {/* Transmissão ao Audesp (Fase D) */}
      <Modal
        open={transmitirAberto}
        onClose={() => setTransmitirAberto(false)}
        title="Transmitir ao Audesp"
        subtitle="Autentica no WebService, envia o documento JSON e retorna o protocolo."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransmitirAberto(false)} disabled={transmitindo || consultando}>Fechar</Button>
            {(envio?.protocolo || prestacao.protocolo) && (
              <Button variant="secondary" onClick={consultarStatus} disabled={consultando || transmitindo}>
                {consultando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Consultar status
              </Button>
            )}
            <Button variant={ambiente === 'PRODUCAO' ? 'danger' : 'primary'} onClick={transmitir} disabled={transmitindo || consultando}>
              {transmitindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {ambiente === 'PRODUCAO' ? 'Transmitir à PRODUÇÃO' : 'Transmitir ao piloto'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Ambiente"
              name="ambiente"
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value as Ambiente)}
              options={[{ value: 'PILOTO', label: 'Piloto (teste)' }, { value: 'PRODUCAO', label: 'Produção (oficial)' }]}
            />
            <div />
            <Input label="Usuário (WebService Audesp)" name="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="off" />
            <Input label="Senha" name="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="off" />
          </div>

          {ambiente === 'PRODUCAO' && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Envio <strong>oficial</strong> ao TCESP. Confirme que já testou no piloto — no 1º ano ~75% das remessas foram rejeitadas por falta de teste.</span>
            </div>
          )}

          <p className="text-xs text-ink-400">As credenciais são usadas apenas nesta chamada e não ficam salvas. Requer a permissão “Transmissão Pacotes - Fase V”.</p>

          {erroTransmit && <p className="text-sm font-medium text-red-500">{erroTransmit}</p>}

          {envio && (
            <div className={cn(
              'rounded-xl border px-4 py-3 text-sm',
              envio.aceito ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
            )}>
              <p className="font-medium">{envio.aceito ? 'Documento enviado.' : 'Envio não confirmado.'}</p>
              {envio.protocolo && <p className="mt-0.5">Protocolo: <span className="font-mono font-semibold">{envio.protocolo}</span></p>}
              {envio.mensagem && <p className="mt-0.5">{envio.mensagem}</p>}
              {avisosEnvio.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs">
                  {avisosEnvio.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}
            </div>
          )}

          {statusConsulta && (
            <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm dark:border-ink-800 dark:bg-ink-950">
              <p className="font-medium text-ink-800 dark:text-ink-100">Estado: {statusConsulta.estado ?? '—'}</p>
              {statusConsulta.inconformidades.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-red-600 dark:text-red-300">
                  {statusConsulta.inconformidades.map((inc, i) => (
                    <li key={i}>{inc.campo ? `${inc.campo}: ` : ''}{inc.mensagem}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
