import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { MEDIDAS, OPERACOES, PENDENCIAS } from '@/lib/inventarioLgpd';
import { useAuth } from '@/contexts/AuthContext';
import { GRUPOS_ADMIN } from '@/lib/navigation';
import { TitularLgpd } from './Titular';

/**
 * Privacidade e LGPD — o registro das operações de tratamento (art. 37) que o
 * controlador precisa manter, montado a partir do que o sistema de fato guarda.
 *
 * A tela separa o que já está implementado do que ainda depende de decisão do
 * órgão. Misturar os dois daria a impressão de uma adequação que não existe.
 */
export function Privacidade() {
  const { usuario } = useAuth();
  // A consulta por titular cruza todos os cadastros — o servidor já a restringe,
  // e aqui a seção some para quem não pode usá-la.
  const podeConsultarTitular = GRUPOS_ADMIN.some(
    (g) => g.toLowerCase() === usuario?.grupo?.trim().toLowerCase(),
  );

  return (
    <>
      <PageHeader
        title="Privacidade e LGPD"
        subtitle="Registro das operações de tratamento de dados pessoais, conforme o art. 37 da Lei 13.709/2018."
      />

      <Card className="mb-6">
        <CardBody>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Este sistema trata dados pessoais para permitir que o órgão concessor preste contas dos
            repasses ao Terceiro Setor no <strong>Audesp Fase V</strong>. Boa parte desses dados é
            enviada ao <strong>Tribunal de Contas do Estado de São Paulo</strong>, que passa a ser um
            destinatário conhecido e deve constar dos avisos de privacidade da entidade beneficiária.
          </p>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            O inventário abaixo foi levantado do modelo de dados do próprio sistema. As
            <strong> bases legais são propostas de trabalho</strong> e precisam de confirmação do
            encarregado e do jurídico do órgão antes de virarem política publicada.
          </p>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Operações de tratamento</CardTitle>
          <Badge tone="brand">{OPERACOES.length} operações</Badge>
        </CardHeader>
        <CardBody className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
                  <th className="px-3 py-2">Titular</th>
                  <th className="px-3 py-2">Dados</th>
                  <th className="px-3 py-2">Finalidade</th>
                  <th className="px-3 py-2">Base legal (proposta)</th>
                  <th className="px-3 py-2">Compartilhamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {OPERACOES.map((o) => (
                  <tr key={o.titular} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-ink-800 dark:text-ink-100">{o.titular}</p>
                      <p className="mt-0.5 text-xs text-ink-400">{o.onde}</p>
                      {o.sensivel && (
                        <span className="mt-1 inline-block">
                          <Badge tone="warning">dado sensível</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-600 dark:text-ink-300">{o.dados.join(' · ')}</td>
                    <td className="px-3 py-3 text-ink-600 dark:text-ink-300">{o.finalidade}</td>
                    <td className="px-3 py-3 text-ink-600 dark:text-ink-300">{o.baseLegal}</td>
                    <td className="px-3 py-3 text-ink-600 dark:text-ink-300">{o.compartilhamento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Medidas já implementadas</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardBody className="pt-3">
            <ul className="space-y-3">
              {MEDIDAS.map((m) => (
                <li key={m.titulo} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <span className="block text-sm font-medium text-ink-800 dark:text-ink-100">
                      {m.titulo}
                    </span>
                    <span className="block text-sm text-ink-500 dark:text-ink-400">{m.descricao}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendências do órgão</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardBody className="pt-3">
            <ul className="space-y-2.5">
              {PENDENCIAS.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-400">
              Estes pontos não dependem de código: são decisões de quem responde pelo tratamento.
              Enquanto não forem resolvidos, a adequação está incompleta, ainda que o sistema já
              aplique as medidas técnicas ao lado.
            </p>
          </CardBody>
        </Card>
      </div>

      {podeConsultarTitular && <TitularLgpd />}
    </>
  );
}
