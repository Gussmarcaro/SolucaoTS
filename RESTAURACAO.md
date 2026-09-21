# Restauração do banco — Solução TS

**Leia isto quando o servidor se perdeu, o banco corrompeu, ou alguém apagou o
que não devia.** Os passos abaixo foram executados de verdade em 21/09/2026,
com o anexo que veio do Gmail — não são um roteiro teórico.

---

## 1. Antes de começar: três coisas, e uma delas não está no servidor

| O quê | Onde está |
|---|---|
| **O arquivo cifrado** | Caixa de `solucaots2026@gmail.com`, um anexo por dia. Também em `~/backups/` na VPS, **sem cifra** — mas se a VPS é o problema, sobra o Gmail. |
| **A senha do backup** | `~/.backup-pass` na VPS **e no seu gerenciador de senhas**. |
| **Acesso a um Postgres 14+** | A VPS nova, ou qualquer máquina. |

> **A senha é o elo frágil.** Se ela existir só na VPS e a VPS for o desastre,
> os anexos no Gmail viram ruído: AES-256 sem chave não se abre, nem por você.
> Confira **agora**, e não no dia do incêndio, que ela está guardada em outro
> lugar.

O ambiente de origem, para referência: Ubuntu 22.04, PostgreSQL 14.24,
Node 24, serviço systemd `solucaots-api` (`User=solucao`,
`WorkingDirectory=/home/solucao/app/backend`, `ExecStart=/usr/bin/npm start`,
`Restart=always`), frontend estático servido pelo nginx a partir de
`/home/solucao/app/frontend/dist`.

---

## 2. Em qual terminal você está?

O erro mais comum desta operação não é técnico. Confira o prompt antes de
colar qualquer comando:

- `solucao@vpsbr-…:~$` → **o servidor**
- `Gustavo@DESKTOP … MINGW64 ~$` → **a sua máquina** (Git Bash)
- `PS C:\>` → **PowerShell**, e nada daqui funciona nele

Um comando de servidor colado no PowerShell falha com mensagens que não
ajudam (`Could not resolve hostname c`). Um caminho do Windows digitado na
sessão SSH procura `/home/solucao/Downloads/` e não acha nada.

---

## 3. Abrir o backup

```bash
# 1. Decifrar. Pede a senha — ela não aparece na tela.
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in solucaots-AAAA-MM-DD-HHMM.sql.gz.enc \
  -out backup.sql.gz

# 2. Conferir que chegou inteiro, ANTES de restaurar.
gzip -t backup.sql.gz && echo "arquivo íntegro"
zcat backup.sql.gz | tail -5 | grep "PostgreSQL database dump complete"
```

A segunda checagem é a que importa. Um dump cortado no meio **restaura sem
erro nenhum** e deixa faltando tabelas — você só descobre semanas depois,
quando alguém procura um dado que não está lá. A marca `dump complete` no fim
é a única prova de que o `pg_dump` terminou.

Se a máquina já tem a senha em arquivo (é o caso da VPS), dá para pular o
prompt:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in arquivo.enc -out backup.sql.gz -pass "file:$HOME/.backup-pass"
```

---

## 4. Restaurar

### 4a. Servidor novo, banco zerado (o caso do desastre)

```bash
sudo -u postgres psql -c "CREATE USER solucao WITH PASSWORD 'ESCOLHA-UMA'"
sudo -u postgres psql -c "CREATE DATABASE solucaots OWNER solucao"

zcat backup.sql.gz | psql "postgresql://solucao:SENHA@localhost:5432/solucaots" \
  -v ON_ERROR_STOP=1
```

`-v ON_ERROR_STOP=1` **não é opcional**. Sem ele o `psql` engole os erros e
segue em frente: a restauração "termina", o banco fica pela metade e nada
avisa.

### 4b. Banco que já tem dados (ensaio, ou restauração por cima)

```bash
# Zera só os objetos do usuário da aplicação.
psql "$URL" -c 'DROP OWNED BY CURRENT_USER;'
zcat backup.sql.gz | psql "$URL" -v ON_ERROR_STOP=1
```

> **Por que não `DROP SCHEMA public CASCADE`.** É o comando que todo tutorial
> manda, e aqui ele falha com `must be owner of schema public`: o usuário
> `solucao` é dono do **banco**, não do schema. `DROP OWNED BY CURRENT_USER`
> apaga exatamente os objetos da aplicação e funciona sem privilégio extra.

> **Nunca aponte isto para o banco de produção sem querer.** O nome do banco é
> a última coisa na URL. Confira antes de dar Enter.

---

## 5. Conferir que voltou — três perguntas, não uma

Restaurar sem erro **não** significa que os dados estão lá.

```bash
URL="postgresql://solucao:SENHA@localhost:5432/solucaots"

# 1. As tabelas existem? (esperado: ~75)
psql "$URL" -tAc "SELECT count(*) FROM information_schema.tables
                  WHERE table_schema='public'"

# 2. Os dados estão lá?
psql "$URL" -tAF' | ' -c 'SELECT nome, cnpj FROM "Cliente" ORDER BY nome'
psql "$URL" -tAc 'SELECT count(*) FROM "Usuario"'
psql "$URL" -tAc 'SELECT count(*) FROM "Ajuste"'
psql "$URL" -tAc 'SELECT count(*) FROM "DocumentoFiscal"'

# 3. Índices e constraints vieram junto? (esperado: 221 e 176)
psql "$URL" -tAc "SELECT (SELECT count(*) FROM pg_indexes WHERE schemaname='public')
  || ' índices, ' || (SELECT count(*) FROM pg_constraint c
  JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
  WHERE n.nspname='public') || ' constraints'"
```

A terceira é a que ninguém lembra de fazer. Sem os índices o sistema fica
lento; sem as constraints ele aceita dado duplicado — e as duas coisas
demoram a aparecer.

**A prova final é subir a aplicação contra o banco restaurado**, numa porta
qualquer, antes de apontar produção para ele:

```bash
cd ~/app/backend
DATABASE_URL="$URL" PORT=3999 npx tsx src/server.ts &
curl -s http://127.0.0.1:3999/api/health          # espera {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:3999/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"x@y.z","senha":"x"}'
```

Um `401` no login é o resultado **certo**: significa que a autenticação
funcionou e recusou uma credencial inexistente. Um `500` seria problema de
banco.

Para encerrar esse teste, **mate pelo PID**, nunca por padrão de nome:

```bash
kill %1        # ou: kill <PID>
```

`pkill -f "tsx src/server.ts"` derruba a API de produção junto — ela roda pelo
mesmo comando. (Aconteceu no ensaio de 21/09; o `Restart=always` do systemd a
reergueu em segundos, mas não conte com isso.)

---

## 6. Religar o sistema inteiro

Se a VPS foi refeita do zero, o banco é só uma parte:

```bash
# 1. Código
git clone <repositório> ~/app && cd ~/app/backend && npm ci

# 2. Configuração — NÃO está no git, de propósito
#    Reconstrua ~/app/backend/.env com as 15 variáveis:
#    NODE_ENV PORT DATABASE_URL JWT_SECRET JWT_EXPIRES JWT_EXPIRES_REMEMBER
#    RESET_TOKEN_TTL_MIN APP_URL CORS_ORIGIN TRUST_PROXY
#    SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM
chmod 600 ~/app/backend/.env

# 3. Esquema (se o banco veio do backup, já está aplicado — pule)
npm run db:push

# 4. Tabelas de domínio (CBO, classificação econômica)
npm run dominios:seed

# 5. Frontend: NUNCA compile na VPS — 3,8 GB de RAM, o OOM derruba a máquina.
#    Compile na sua máquina e copie o dist/:
#    (local) cd frontend && npm run build
#    (local) scp -P 22022 -r dist/* solucao@IP:/home/solucao/app/frontend/dist/

# 6. Serviço
sudo systemctl enable --now solucaots-api

# 7. Backup diário — sem isto o próximo desastre não tem saída
printf '%s' 'SENHA-DO-BACKUP' > ~/.backup-pass && chmod 600 ~/.backup-pass
crontab -e   # 10 3 * * * /home/solucao/backup-banco.sh >> /home/solucao/backups/backup.log 2>&1
```

**Se o banco veio de um backup, ninguém precisa do `bootstrap`** — os usuários
e senhas estão no dump. O `npm run bootstrap` é só para banco genuinamente
vazio.

---

## 7. Ensaiar sem risco

Isto não deveria ser lido pela primeira vez durante um incidente. O ensaio
custa cinco minutos e usa um banco separado:

```bash
sudo -u postgres psql -c "CREATE DATABASE solucaots_test OWNER solucao"
```

Depois siga a seção 4b apontando para `solucaots_test`. Produção não é tocada.

**Vale repetir o ensaio quando o schema mudar bastante** — um dump antigo
restaura num banco vazio, mas a aplicação nova pode esperar colunas que ele
não tem.

---

## O que já foi verificado (21/09/2026)

Com o anexo de 19/09 baixado do Gmail, não com a cópia local:

- decifrou com a senha guardada;
- `gzip -t` passou — 9.640 linhas de SQL;
- a marca `dump complete` estava presente;
- **idêntico byte a byte** ao `.gz` gerado na VPS naquele dia — SMTP, Gmail e
  o download do navegador não alteraram nada;
- restaurou 75 tabelas sem um único erro;
- os dados voltaram: 2 órgãos, 2 usuários, 2 ajustes, 6 notas;
- a aplicação subiu contra o banco restaurado, com `health: ok` e login
  respondendo corretamente.
