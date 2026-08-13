import { Autoria } from '@/components/ui/Autoria';
import { ExternalLink, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { dataBr, formatarMoeda, mascaraCelular, mascaraCep, mascaraCpf } from '@/lib/masks';
import { abrirTermoCiencia } from '@/services/ajustes.service';
import {
  PERIODICIDADE_LABEL,
  STATUS_AJUSTE_LABEL,
  TIPO_AJUSTE_LABEL,
  type Ajuste,
} from '@/types/ajuste';

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">{valor?.trim() || '—'}</dd>
    </div>
  );
}

/** Bloco com título, espelhando os painéis do formulário. */
function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-700">
      <h4 className="mb-3 text-sm font-medium text-ink-700 dark:text-ink-200">{titulo}</h4>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">{children}</dl>
    </div>
  );
}

const moeda = (v: number | null) => (v === null ? null : formatarMoeda(v));

/** Junta as partes do endereço do responsável numa linha só. */
function enderecoResponsavel(a: Ajuste): string | null {
  const rua = [a.responsavelLogradouro, a.responsavelNumero, a.responsavelComplemento]
    .filter(Boolean)
    .join(', ');
  const cidadeUf = [a.responsavelCidade, a.responsavelUf].filter(Boolean).join('/');
  const partes = [rua, a.responsavelBairro, cidadeUf].filter(Boolean);
  return partes.length ? partes.join(' — ') : null;
}

export function AjusteView({ ajuste }: { ajuste: Ajuste }) {
  const vigencia =
    ajuste.vigenciaInicial || ajuste.vigenciaFinal
      ? `${ajuste.vigenciaInicial ? dataBr(ajuste.vigenciaInicial) : '—'} — ${
          ajuste.vigenciaFinal ? dataBr(ajuste.vigenciaFinal) : 'Indeterminada'
        }`
      : null;

  return (
    <div className="space-y-6">
      <div>
        {ajuste.descricaoResumida ? (
          <>
            <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{ajuste.descricaoResumida}</h3>
            <p className="font-mono text-xs text-ink-400">{ajuste.codigoAjuste}</p>
          </>
        ) : (
          <h3 className="font-mono text-base font-semibold text-ink-900 dark:text-ink-50">{ajuste.codigoAjuste}</h3>
        )}
        <p className="text-sm text-ink-500">{ajuste.entidadeNome}</p>
        <div className="mt-1 flex gap-2">
          <Badge tone="brand">{TIPO_AJUSTE_LABEL[ajuste.tipoAjuste]}</Badge>
          <Badge tone={ajuste.status === 'ENVIADO' ? 'success' : 'warning'}>
            {STATUS_AJUSTE_LABEL[ajuste.status]}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Órgão concessor" valor={ajuste.orgaoNome} />
        </div>
        <Campo label="Número interno" valor={ajuste.numero} />
        <Campo label="Valor Global" valor={formatarMoeda(ajuste.valorGlobal)} />
        <Campo label="Periodicidade" valor={PERIODICIDADE_LABEL[ajuste.periodicidade]} />
        <Campo label="Assinatura" valor={dataBr(ajuste.dataAssinatura)} />
        <div className="col-span-2 sm:col-span-2">
          <Campo label="Vigência" valor={vigencia} />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <Campo label="Objeto" valor={ajuste.objeto} />
        </div>
      </dl>

      <Painel titulo="Previsão por Fontes de Recursos">
        <Campo label="Federal" valor={moeda(ajuste.previsaoFederal)} />
        <Campo label="Estadual" valor={moeda(ajuste.previsaoEstadual)} />
        <Campo label="Municipal" valor={moeda(ajuste.previsaoMunicipal)} />
      </Painel>

      <Painel titulo="Responsável pelo Ajuste">
        <Campo label="Nome" valor={ajuste.responsavelNome} />
        <Campo label="CPF" valor={ajuste.responsavelCpf ? mascaraCpf(ajuste.responsavelCpf) : null} />
        <Campo label="Nascimento" valor={ajuste.responsavelDataNascimento ? dataBr(ajuste.responsavelDataNascimento) : null} />
        <div className="col-span-2 sm:col-span-2">
          <Campo label="Endereço" valor={enderecoResponsavel(ajuste)} />
        </div>
        <Campo label="CEP" valor={ajuste.responsavelCep ? mascaraCep(ajuste.responsavelCep) : null} />
        <Campo label="E-mail" valor={ajuste.responsavelEmail} />
        <Campo label="Telefone / Celular" valor={ajuste.responsavelTelefone ? mascaraCelular(ajuste.responsavelTelefone) : null} />
        <Campo label="Função / Cargo" valor={ajuste.responsavelCargo} />
        <Campo label="Entrada" valor={ajuste.responsavelDataEntrada ? dataBr(ajuste.responsavelDataEntrada) : null} />
        <Campo label="Saída" valor={ajuste.responsavelDataSaida ? dataBr(ajuste.responsavelDataSaida) : null} />
      </Painel>

      <Painel titulo="Termo de Ciência e Notificação">
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">Arquivo</dt>
          <dd className="mt-0.5 text-sm text-ink-800 dark:text-ink-100">
            {ajuste.termoCienciaArquivoNome ? (
              <button
                type="button"
                onClick={() => abrirTermoCiencia(ajuste.id)}
                className="focus-ring inline-flex items-center gap-1.5 rounded text-brand-600 hover:underline dark:text-brand-400"
              >
                <FileText className="h-4 w-4" />
                <span className="truncate" title={ajuste.termoCienciaArquivoNome}>{ajuste.termoCienciaArquivoNome}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </Painel>

      <Painel titulo="Publicação do Ajuste">
        <Campo label="Local" valor={ajuste.publicacaoLocal} />
        <Campo label="Data" valor={ajuste.publicacaoData ? dataBr(ajuste.publicacaoData) : null} />
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-ink-400">Link</dt>
          <dd className="mt-0.5 truncate text-sm text-ink-800 dark:text-ink-100">
            {ajuste.publicacaoLink ? (
              <a
                href={ajuste.publicacaoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex max-w-full items-center gap-1.5 rounded text-brand-600 hover:underline dark:text-brand-400"
              >
                <span className="truncate" title={ajuste.publicacaoLink}>{ajuste.publicacaoLink}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </Painel>

      <Autoria entidade="Ajuste" id={ajuste.id} />
    </div>
  );
}
