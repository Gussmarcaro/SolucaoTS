/**
 * Confere as regras dos alertas do sino. Não precisa de banco.
 *
 * A aritmética de prazo é o tipo de código que erra em silêncio: um alerta que
 * some cedo demais, ou que aparece com o sinal trocado, não quebra nada — só
 * deixa alguém perder um prazo do TCESP. Aqui o repositório é substituído por
 * dados sintéticos e cada regra é conferida contra uma data fixa.
 *
 *   npm run verificar:alertas
 */
import { ListarAlertasUseCase, type DadosAlertas } from '../src/application/alerta/ListarAlertasUseCase';
import { somarDiasUteis, diasAte } from '../src/shared/diasUteis';

const falhas: string[] = [];

function conferir(descricao: string, ok: boolean, detalhe = ''): void {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas.push(descricao);
}

const VAZIO: DadosAlertas = {
  prestacoesRejeitadas: [],
  certidoes: [],
  ajustesRecentes: [],
  aditivosRecentes: [],
  orgaos: [],
  ajustesSemPrestacao: 0,
  tarefasDeAlerta: [],
  lembretes: [],
};

/** O sino passou a ter dono: lembretes de agenda dependem de quem pergunta. */
const ESPECTADOR = { usuarioId: 'u1', grupoId: 'g1' };

const executar = (dados: Partial<DadosAlertas>, hoje: Date) =>
  new ListarAlertasUseCase({ coletar: async () => ({ ...VAZIO, ...dados }) }).execute(ESPECTADOR, hoje);

console.log('\nAlertas do sino\n');

// --- dias úteis -------------------------------------------------------------
// Sexta 2026-08-14 + 1 dia útil = segunda 17; não sábado, não domingo.
conferir(
  'dia útil pula o fim de semana',
  somarDiasUteis(new Date('2026-08-14T00:00:00Z'), 1).toISOString().slice(0, 10) === '2026-08-17',
);
// 10 dias úteis a partir de uma segunda caem na segunda de duas semanas
// depois — não na sexta da segunda semana, que é o erro fácil de cometer:
// a contagem começa no dia seguinte, então a 2ª semana termina no 9º dia útil.
conferir(
  '10 dias úteis a partir de segunda caem na segunda de duas semanas depois',
  somarDiasUteis(new Date('2026-08-03T00:00:00Z'), 10).toISOString().slice(0, 10) === '2026-08-17',
);
conferir('data passada dá dias negativos', diasAte(new Date('2026-08-10T00:00:00Z'), new Date('2026-08-13T00:00:00Z')) === -3);

const hoje = new Date('2026-08-13T00:00:00Z'); // quinta-feira

// --- rejeição ---------------------------------------------------------------
{
  const [a] = await executar(
    { prestacoesRejeitadas: [{ id: 'p1', ajusteCodigo: '123', entidadeNome: 'OSC X', ano: 2025 }] },
    hoje,
  );
  conferir('rejeição vira alerta vencido, sem prazo', a?.urgencia === 'VENCIDO' && a?.dias === null);
  conferir('id da rejeição é estável', a?.id === 'prestacao-rejeitada:p1');
}

// --- certidões --------------------------------------------------------------
{
  const certidao = (id: string, vencimento: string) => ({ id, descricao: 'CND', vencimento, onde: 'OSC X' });
  const alertas = await executar(
    {
      certidoes: [
        certidao('c1', '2026-08-10'), // venceu há 3 dias
        certidao('c2', '2026-08-18'), // vence em 5
        certidao('c3', '2026-09-05'), // vence em 23
        certidao('c4', '2027-01-01'), // muito longe
        certidao('c5', '2026-01-01'), // vencida há muito
      ],
    },
    hoje,
  );
  const por = (id: string) => alertas.find((a) => a.id === `certidao:${id}`);
  conferir('certidão vencida entra como VENCIDO', por('c1')?.urgencia === 'VENCIDO');
  conferir('vencimento em 5 dias entra como CRÍTICO', por('c2')?.urgencia === 'CRITICO');
  conferir('vencimento em 23 dias entra como PRÓXIMO', por('c3')?.urgencia === 'PROXIMO');
  conferir('vencimento distante fica de fora', !por('c4'), 'evita ruído');
  conferir('vencida há muito tempo fica de fora', !por('c5'), 'vira pendência antiga, não alerta');
  conferir('vencidos aparecem antes dos próximos', alertas[0]?.id === 'certidao:c1');
}

// --- prazo de cadastro ------------------------------------------------------
{
  // Assinado hoje: 10 dias úteis à frente, dentro da janela e ainda não crítico.
  const [a] = await executar(
    {
      ajustesRecentes: [
        { id: 'a1', codigoAjuste: '999', entidadeNome: 'OSC X', dataAssinatura: '2026-08-13' },
      ],
    },
    hoje,
  );
  conferir('ajuste assinado hoje gera lembrete de cadastro', a?.tipo === 'CADASTRO_AJUSTE');
  conferir('prazo de 10 dias úteis vira 14 dias corridos', a?.dias === 14, `dias=${a?.dias}`);
  conferir(
    'texto não afirma que já foi cadastrado no TCESP',
    !!a && /Prazo de 10 dias úteis/.test(a.detalhe) && !/cadastrado/i.test(a.detalhe),
  );
}

// --- declaração negativa ----------------------------------------------------
{
  // Quadrimestral: último período encerrou em 30/04; 5 dias úteis venceram em maio.
  const [a] = await executar(
    { orgaos: [{ id: 'o1', nome: 'Prefeitura', periodicidade: 'QUADRIMESTRAL' }] },
    new Date('2026-05-10T00:00:00Z'),
  );
  conferir('quadrimestral aponta o período encerrado em 30/04', a?.id === 'declaracao-negativa:o1:2026-04-30');
  conferir('prazo de 5 dias úteis já venceu em 10/05', a?.urgencia === 'VENCIDO', `dias=${a?.dias}`);

  // Anual: 15 dias úteis após 31/12/2025 vencem em 21/01/2026 — em 12/01 ainda
  // faltam 9 dias, então é "próximo", não crítico.
  const [b] = await executar(
    { orgaos: [{ id: 'o2', nome: 'Câmara', periodicidade: 'ANUAL' }] },
    new Date('2026-01-12T00:00:00Z'),
  );
  conferir(
    'anual usa 15 dias úteis após o exercício',
    b?.dias === 9 && b?.urgencia === 'PROXIMO',
    `dias=${b?.dias}`,
  );

  // Fora da janela, nenhum dos dois aparece.
  const nenhum = await executar(
    { orgaos: [{ id: 'o3', nome: 'Autarquia', periodicidade: 'QUADRIMESTRAL' }] },
    new Date('2026-07-15T00:00:00Z'),
  );
  conferir('longe do prazo, a declaração não aparece', nenhum.length === 0);
}

// --- prestação de contas ----------------------------------------------------
{
  const semPendencia = await executar({ ajustesSemPrestacao: 0 }, new Date('2026-06-01T00:00:00Z'));
  conferir('sem ajuste pendente, não alerta prestação', semPendencia.length === 0);

  const [a] = await executar({ ajustesSemPrestacao: 3 }, new Date('2026-06-01T00:00:00Z'));
  conferir('em junho aponta o exercício anterior', a?.id === 'prestacao-contas:2025', a?.titulo);
  conferir('prazo é 30/06 do exercício seguinte', a?.dias === 29, `dias=${a?.dias}`);

  const [b] = await executar({ ajustesSemPrestacao: 3 }, new Date('2026-08-13T00:00:00Z'));
  conferir('depois de junho, o exercício vira o corrente', b?.id === 'prestacao-contas:2026' || !b);
}

// --- tarefa de acompanhamento ----------------------------------------------
// A regra que separa "o sistema não tem como saber" de "o sistema sabe".
// Errar aqui é grave nos dois sentidos: silenciar demais esconde um prazo real,
// silenciar de menos faz o sino cobrar o que já foi feito e ensina a ignorá-lo.
{
  const ajuste = {
    ajustesRecentes: [
      { id: 'a1', codigoAjuste: '999', entidadeNome: 'OSC X', dataAssinatura: '2026-08-13' },
    ],
  };
  const tarefa = (status: string, origem: string) => [{ id: 't1', origemAlerta: origem, status }];

  const [semTarefa] = await executar(ajuste, hoje);
  conferir('sem tarefa, o alerta não menciona nenhuma', semTarefa?.tarefa === null);

  const [pendente] = await executar(
    { ...ajuste, tarefasDeAlerta: tarefa('PENDENTE', 'cadastro-ajuste:a1') },
    hoje,
  );
  conferir(
    'tarefa aberta aparece no alerta, sem silenciá-lo',
    pendente?.tarefa?.id === 't1' && pendente?.tarefa?.status === 'PENDENTE',
  );

  const concluida = await executar(
    { ...ajuste, tarefasDeAlerta: tarefa('CONCLUIDA', 'cadastro-ajuste:a1') },
    hoje,
  );
  conferir(
    'tarefa concluída encerra o lembrete de cadastro no Audesp',
    concluida.length === 0,
    'é ato praticado fora do sistema — a tarefa é a única prova possível',
  );

  // Certidão é fato nosso: concluir tarefa não renova nada.
  const certidao = { certidoes: [{ id: 'c1', descricao: 'CND', vencimento: '2026-08-18', onde: 'OSC X' }] };
  const [aindaVence] = await executar(
    { ...certidao, tarefasDeAlerta: tarefa('CONCLUIDA', 'certidao:c1') },
    hoje,
  );
  conferir(
    'tarefa concluída NÃO silencia certidão a vencer',
    aindaVence?.id === 'certidao:c1' && aindaVence?.tarefa?.status === 'CONCLUIDA',
    'a data de validade está nos nossos dados — concluir tarefa não a renova',
  );

  const [rejeitada] = await executar(
    {
      prestacoesRejeitadas: [{ id: 'p1', ajusteCodigo: '123', entidadeNome: 'OSC X', ano: 2025 }],
      tarefasDeAlerta: tarefa('CONCLUIDA', 'prestacao-rejeitada:p1'),
    },
    hoje,
  );
  conferir(
    'tarefa concluída NÃO silencia prestação rejeitada',
    rejeitada?.id === 'prestacao-rejeitada:p1',
    'o status vem do Tribunal, não da nossa marcação',
  );

  // Tarefa de outro alerta não pode encostar neste.
  const [outra] = await executar(
    { ...ajuste, tarefasDeAlerta: tarefa('CONCLUIDA', 'cadastro-ajuste:OUTRO') },
    hoje,
  );
  conferir('tarefa de outro alerta não interfere', outra?.id === 'cadastro-ajuste:a1' && outra?.tarefa === null);
}

// --- lembretes da agenda ----------------------------------------------------
// O sino passou a carregar a agenda. O que se prova aqui é a tradução: o
// repositório entrega só o lembrete **maduro** (já é hora de avisar) e já
// recortado pela visibilidade — este caso de uso apenas o veste.
{
  const lembrete = (minutosAntes: number, inicioEm: string) => ({
    compromissoId: 'c1',
    titulo: 'Reunião de monitoramento',
    inicioEm,
    local: 'Sede da OSC',
    minutosAntes,
  });

  const agora = new Date('2026-08-13T13:30:00Z');
  const [a] = await executar({ lembretes: [lembrete(30, '2026-08-13T14:00:00Z')] }, agora);

  conferir('lembrete de compromisso vira alerta', a?.tipo === 'COMPROMISSO');
  conferir('id do lembrete é estável', a?.id === 'compromisso:c1:30', a?.id);
  conferir(
    'lembrete não usa dias, e sim minutos',
    a?.dias === null && /em 30 min/.test(a?.detalhe ?? ''),
    a?.detalhe,
  );
  conferir('o local entra no detalhe', /Sede da OSC/.test(a?.detalhe ?? ''));
  conferir('lembrete leva ao compromisso', a?.referenciaId === 'c1');

  const [jaComecou] = await executar(
    { lembretes: [lembrete(30, '2026-08-13T13:30:00Z')] },
    agora,
  );
  conferir('na hora, o texto diz "agora"', /agora/.test(jaComecou?.detalhe ?? ''), jaComecou?.detalhe);

  // Duas antecedências no mesmo compromisso são dois avisos distintos — e
  // precisam de ids distintos, senão um sobrescreve o outro na tela.
  const dois = await executar(
    {
      lembretes: [lembrete(30, '2026-08-13T14:00:00Z'), lembrete(60, '2026-08-13T14:00:00Z')],
    },
    agora,
  );
  conferir('duas antecedências geram dois ids distintos', new Set(dois.map((x) => x.id)).size === 2);
}

console.log(falhas.length ? `\n${falhas.length} falha(s).\n` : '\nTudo ok.\n');
process.exit(falhas.length ? 1 : 0);
