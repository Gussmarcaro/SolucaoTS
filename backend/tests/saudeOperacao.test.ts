import { describe, expect, it } from 'vitest';
import { avaliarBackup, avaliarEmail } from '../src/core/operacao/saudeOperacao';

// Trechos reais do backup.log do servidor (novembro de 2026).
const BOM = `2026-11-08 03:10:04 ok /home/solucao/backups/solucaots-2026-11-08-0310.sql.gz (6.6M)
enviado a backup@exemplo.com (6.6 MB)
2026-11-09 03:10:03 ok /home/solucao/backups/solucaots-2026-11-09-0310.sql.gz (6.6M)
enviado a backup@exemplo.com (6.6 MB)`;

const RUIM = `${BOM}
2026-11-10 03:10:04 ok /home/solucao/backups/solucaots-2026-11-10-0310.sql.gz (46M)
AVISO enviado: anexo grande demais (46.1 MB)
2026-11-11 03:10:04 ok /home/solucao/backups/solucaots-2026-11-11-0310.sql.gz (62M)
falha ao enviar: Invalid login: 535 Incorrect authentication data`;

describe('avaliarBackup', () => {
  it('backup de ontem, enviado: nada a avisar', () => {
    expect(avaliarBackup(BOM, new Date('2026-11-09T15:00:00-03:00'))).toEqual([]);
  });

  it('cópias externas falhando em sequência viram aviso, com o último motivo', () => {
    const [p] = avaliarBackup(RUIM, new Date('2026-11-11T10:00:00-03:00'));
    expect(p.id).toBe('operacao:backup-externo');
    expect(p.detalhe).toContain('As últimas 2 cópias');
    expect(p.detalhe).toContain('535 Incorrect authentication data');
  });

  it('uma falha isolada não avisa', () => {
    const log = `${BOM}\n2026-11-10 03:10:04 ok /x (6.6M)\nfalha ao enviar: getaddrinfo EAI_AGAIN`;
    expect(avaliarBackup(log, new Date('2026-11-10T10:00:00-03:00'))).toEqual([]);
  });

  it('sem backup novo há mais de 36 horas: backup parado', () => {
    const [p] = avaliarBackup(BOM, new Date('2026-11-11T10:00:00-03:00'));
    expect(p).toMatchObject({ id: 'operacao:backup-parado', desde: '2026-11-09' });
  });

  it('log sem nenhuma execução boa', () => {
    expect(avaliarBackup('falha qualquer', new Date())[0].id).toBe('operacao:backup-nunca');
  });
});

describe('avaliarEmail', () => {
  it('sem falha, nada; com falha, conta e motivo', () => {
    expect(avaliarEmail(null)).toEqual([]);
    const [p] = avaliarEmail({ falhandoDesde: '2026-11-26T21:40:29Z', motivo: '535', falhas: 3 });
    expect(p.detalhe).toMatch(/^3 envio\(s\) falharam/);
  });
});
