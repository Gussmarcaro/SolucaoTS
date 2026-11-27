/**
 * Saúde da operação: o que só o Suporte precisa ver no sino.
 *
 * Nasceu de dois silêncios. De 10/11 a 26/11/2026 o backup deixou de sair do
 * servidor e a recuperação de senha deixou de chegar, e nenhum dos dois avisou
 * ninguém: um só escrevia num arquivo de log, o outro respondia "enviaremos o
 * link" por desenho (não revela se o e-mail existe). Os dois problemas tinham a
 * mesma causa e duraram 17 dias.
 */

export interface ProblemaOperacao {
  id: string;
  titulo: string;
  detalhe: string;
  /** `aaaa-mm-dd` de quando começou, quando se sabe. */
  desde: string | null;
}

/** Sem backup novo há mais que isto, algo parou (o cron roda toda madrugada). */
const HORAS_SEM_BACKUP = 36;

/**
 * Lê o log do `backup-banco.sh`. Cada execução escreve, nesta ordem:
 *
 *     2026-11-09 03:10:03 ok /home/solucao/backups/solucaots-….sql.gz (6.6M)
 *     enviado a …            ← cópia fora do servidor; ou "falha ao enviar…",
 *                              ou "AVISO enviado: anexo grande demais…"
 *
 * Linhas de falha podem vir sem a linha "ok" antes (o script aborta). Por isso
 * a leitura é: a data do último "ok", e o desfecho da cópia externa nas
 * últimas execuções.
 */
export function avaliarBackup(log: string, agora: Date): ProblemaOperacao[] {
  const linhas = log.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const problemas: ProblemaOperacao[] = [];

  let ultimoOk: Date | null = null;
  for (const l of linhas) {
    const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ok /.exec(l);
    if (m) ultimoOk = new Date(`${m[1]}T${m[2]}-03:00`);
  }

  if (!ultimoOk) {
    problemas.push({
      id: 'operacao:backup-nunca',
      titulo: 'Backup do banco sem registro',
      detalhe: 'O registro do backup não tem nenhuma execução bem-sucedida.',
      desde: null,
    });
    return problemas;
  }

  const horas = (agora.getTime() - ultimoOk.getTime()) / 3_600_000;
  if (horas > HORAS_SEM_BACKUP)
    problemas.push({
      id: 'operacao:backup-parado',
      titulo: 'Backup do banco parado',
      detalhe: `O último backup gerado é de ${ultimoOk.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Confira o cron e o espaço em disco do servidor.`,
      desde: ultimoOk.toISOString().slice(0, 10),
    });

  // Desfecho da cópia externa, da mais recente para trás.
  const desfechos = linhas
    .filter((l) => /^(enviado a|falha ao enviar|AVISO enviado)/.test(l))
    .map((l) => (l.startsWith('enviado a') ? 'ok' : l));
  let seguidas = 0;
  for (let i = desfechos.length - 1; i >= 0 && desfechos[i] !== 'ok'; i--) seguidas++;

  if (seguidas >= 2) {
    const ultima = desfechos[desfechos.length - 1];
    const motivo = ultima.startsWith('AVISO') ? 'o arquivo ficou grande demais para o e-mail' : ultima.replace(/^falha ao enviar:\s*/, '');
    problemas.push({
      id: 'operacao:backup-externo',
      titulo: 'Backup não está saindo do servidor',
      detalhe: `As últimas ${seguidas} cópias externas falharam (${motivo}). Se o servidor perder o disco, os backups vão junto.`,
      desde: null,
    });
  }
  return problemas;
}

export interface EstadoEmail {
  falhandoDesde: string;
  motivo: string;
  falhas: number;
}

/** O envio de e-mail está falhando: a recuperação de senha não chega. */
export function avaliarEmail(estado: EstadoEmail | null): ProblemaOperacao[] {
  if (!estado) return [];
  return [
    {
      id: 'operacao:email',
      titulo: 'Envio de e-mail falhando',
      detalhe: `${estado.falhas} envio(s) falharam desde ${new Date(estado.falhandoDesde).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (${estado.motivo}). A recuperação de senha não está chegando aos usuários.`,
      desde: estado.falhandoDesde.slice(0, 10),
    },
  ];
}
