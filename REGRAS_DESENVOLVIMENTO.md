# Regras de Desenvolvimento — Solução TS

Convenções obrigatórias para código deste repositório. Complementa o [CLAUDE.md](CLAUDE.md) (contexto/arquitetura) e o [REGRAS_NEGOCIO_FASE_V.md](Documentação/REGRAS_NEGOCIO_FASE_V.md) (domínio TCESP).

## 1. Idioma e nomenclatura

- **Domínio em português**, aderente ao TCESP: entidades, campos, enums e casos de uso usam os termos oficiais (`Ajuste`, `PrestacaoContas`, `EntidadeBeneficiaria`, `Glosa`, `Repasse`...).
- Termos técnicos genéricos podem ficar em inglês (`Repository`, `UseCase`, `Controller`, `DTO`, `Adapter`).
- Não renomear campos do domínio para "melhorar" — o nome errado quebra a rastreabilidade com os manuais e com o JSON do TCE.

## 2. Arquitetura (regra de dependência — inviolável)

- Fluxo de dependência: `presentation` → `application` → `core`; `infrastructure` → `application`/`core`. **Nunca o inverso.**
- `core` (entidades/regras) e `application` (use cases) **não** importam Prisma, Express, Axios ou qualquer detalhe de framework.
- Todo acesso a dados/serviço externo passa por uma **interface (port)** definida em `application`, com implementação (adapter) em `infrastructure`. Use cases dependem da interface, nunca da classe concreta.
- Controllers são finos: só traduzem HTTP ↔ DTO e delegam ao use case.

## 3. Fidelidade ao domínio Fase V

- **Antes de implementar qualquer bloco ou validação, leia a seção correspondente em `REGRAS_NEGOCIO_FASE_V.md`.** Em dúvida sobre a norma, consulte os manuais em `Documentação/` — não invente regra.
- As validações de negócio do TCESP são **espelhadas no `core`** para falhar cedo (antes de transmitir), além da validação do JSON Schema no envio.
- **Aplicabilidade por tipo de ajuste** deve ser respeitada (ex.: Regulamento de Compras só p/ Contrato de Gestão; Servidores Cedidos não p/ Colaboração/Fomento). Não gerar blocos que não se aplicam.

## 4. Prisma / banco de dados

- PKs `uuid`; dinheiro `Decimal(15,2)` (**nunca** `Float` para valores monetários); datas de negócio `@db.Date`.
- As **regras de unicidade dos manuais são `@@unique` compostos** — ao evoluir o schema, preserve-as e adicione novas quando a norma exigir.
- Alterou o schema? Rode `prisma validate` + `prisma format` e gere migration com `prisma migrate dev` (nome descritivo). Não editar migrations aplicadas.
- Consultas sempre pelo Prisma Client (query parametrizado). Proibido SQL string concatenado.

## 5. Validações transversais (sempre aplicar)

- **CPF/CNPJ:** validar dígito verificador (`documento_tipo` 1=CPF, 2=CNPJ; 3=RNE não valida número mas exige `nome`).
- **Unicidade por chave composta** por bloco (ver tabela do REGRAS_NEGOCIO_FASE_V) — deduplicar/somar valores conforme a regra do bloco.
- **Datas** dentro do período da prestação (com as exceções de 1ª prestação e ajustes de saldo).
- **Valores** ≥ R$ 0,01; descontos/devoluções < valor atualizado do ajuste.
- **Campos condicionais:** "Outros" → exige descrição; meio `Banco` → exige dados bancários; conclusão desfavorável → exige justificativa.
- **Referências cruzadas:** contratos/documentos/empenhos citados devem existir na base ou no próprio JSON.

## 6. Parsers de CSV

- Sempre tratar: encoding **Latin-1→UTF-8**, separador `;`, mês por nome **ou** número (normalizar 1–12), valores em **padrão BR** (`1.522.632,45` → `1522632.45`), **linhas duplicadas**.
- Usar os arquivos de `Documentação/*.csv` como **fixtures** dos testes de parser.
- Parser não persiste: retorna DTOs validados; a persistência é responsabilidade do use case.

## 7. Multi-tenant (segurança)

- **Todo dado é isolado por `clienteId`.** Nenhuma query de leitura/escrita de dados de um órgão pode retornar/alterar dados de outro. Aplicar o filtro de tenant no repositório/middleware, não deixar a critério do caller.
- Autorização por RBAC (`GrupoUsuario`/`Permissao` com `modulo`+`acao`) verificada na camada de `presentation`/middleware antes do use case.
- Segredos (credenciais da API TCESP, `DATABASE_URL`) só via variáveis de ambiente; nunca commitados.

## 8. Tratamento de erros

- Erros de regra de negócio lançam `BusinessError` (ou subclasse) no `core`/`application`; um middleware central em `presentation` os traduz para HTTP.
- Não engolir exceção (`catch` vazio) nem retornar `500` genérico para violação de regra — devolver mensagem acionável com o código/campo.

## 9. Testes

- Use cases e validações de domínio têm **teste unitário sem banco** (repositórios mockados via as interfaces/ports).
- Parsers de CSV e montagem do JSON da prestação: testes com fixtures reais de `Documentação/`.
- Ao corrigir bug de regra do TCESP, adicionar teste que reproduz o caso.

## 10. Frontend

- React + Tailwind + TS. Tema claro/escuro via `useTheme` (Context + localStorage + classe `dark`), com `transition-colors duration-300`.
- Formatação/máscaras (CNPJ, moeda, nº de processo) centralizadas em `utils/`; não formatar inline espalhado.
- Chamadas à API isoladas em `services/` (Axios); componentes não chamam `axios` diretamente.
