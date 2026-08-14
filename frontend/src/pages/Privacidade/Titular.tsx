import { useState } from 'react';
import { Download, Loader2, Search, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apenasDigitos, mascaraCpf } from '@/lib/masks';
import { isCpfValido } from '@/lib/validators';
import { http, extrairMensagemErro } from '@/services/http';

interface Ocorrencia {
  origem: string;
  entidade: string;
  registroId: string;
  descricao: string;
  dados: Record<string, string | number | null>;
}

interface Relatorio {
  cpf: string;
  encontradoEm: number;
  ocorrencias: Ocorrencia[];
}

/**
 * Relatório do titular — atende ao direito de acesso (LGPD, art. 18, I e II).
 *
 * Exige CPF completo e válido de propósito: buscar por nome ou por parte do
 * número transformaria a ferramenta de exercício de direito em ferramenta de
 * vigilância. A consulta em si também vai para a trilha de auditoria.
 */
export function TitularLgpd() {
  const [cpf, setCpf] = useState('');
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const cpfValido = isCpfValido(cpf);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!cpfValido) return setErro('Informe um CPF completo e válido.');
    setCarregando(true);
    try {
      const { data } = await http.get<Relatorio>('/lgpd/titular', {
        params: { cpf: apenasDigitos(cpf) },
      });
      setRelatorio(data);
    } catch (err) {
      setRelatorio(null);
      setErro(extrairMensagemErro(err, 'Não foi possível consultar o titular.'));
    } finally {
      setCarregando(false);
    }
  }

  /** Exportação em JSON — formato "de uso comum e leitura automatizada" (art. 18, V). */
  function exportar() {
    if (!relatorio) return;
    const blob = new Blob([JSON.stringify(relatorio, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `titular-${relatorio.cpf}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Responder a um pedido de acesso do titular</CardTitle>
        {relatorio && <Badge tone="brand">{relatorio.encontradoEm} ocorrência(s)</Badge>}
      </CardHeader>
      <CardBody className="pt-3">
        {/* O texto explica a situação de uso, não o mecanismo: quem opera não
            reconhece "consulta por titular", mas reconhece "fulano pediu para
            saber o que vocês têm sobre ele". */}
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Quando alguém pede para saber quais dados o sistema guarda sobre ela — um ex-empregado da
          entidade, um dirigente que saiu, um fornecedor pessoa física —, informe o CPF abaixo. O
          sistema procura em todos os cadastros e prestações de uma vez e monta a resposta, que pode
          ser exportada para anexar ao pedido.
        </p>
        <p className="mb-3 mt-2 text-xs text-ink-400">
          É o direito de acesso do art. 18 da LGPD. Não encontrar nada também é resposta: significa
          que o sistema não trata dados dessa pessoa. Só aceita CPF completo — buscar por nome
          exporia pessoas homônimas. A consulta fica registrada na auditoria, com o CPF pesquisado.
        </p>

        <form onSubmit={consultar} className="flex items-end gap-2">
          <div className="w-56">
            <Input
              label="CPF do titular"
              name="cpf"
              value={mascaraCpf(cpf)}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" disabled={carregando || !cpfValido}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </Button>
          {relatorio && relatorio.encontradoEm > 0 && (
            <Button type="button" variant="secondary" onClick={exportar}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          )}
        </form>

        {erro && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-500">
            <ShieldAlert className="h-4 w-4" />
            {erro}
          </p>
        )}

        {relatorio && relatorio.encontradoEm === 0 && (
          <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
            Nenhum registro para este CPF em nenhum cadastro ou prestação. A resposta ao titular pode
            afirmar que o sistema não trata dados dele.
          </p>
        )}

        {relatorio && relatorio.encontradoEm > 0 && (
          <ul className="mt-4 space-y-3">
            {relatorio.ocorrencias.map((o) => (
              <li
                key={`${o.entidade}-${o.registroId}`}
                className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{o.origem}</p>
                  <span className="font-mono text-[11px] text-ink-400">{o.entidade}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-400">{o.descricao}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                  {Object.entries(o.dados)
                    .filter(([, v]) => v !== null && v !== '')
                    .map(([campo, valor]) => (
                      <div key={campo} className="min-w-0">
                        <dt className="truncate text-[11px] uppercase tracking-wider text-ink-400">
                          {campo}
                        </dt>
                        <dd className="truncate text-sm text-ink-700 dark:text-ink-200">{String(valor)}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
