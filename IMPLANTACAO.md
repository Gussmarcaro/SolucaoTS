# Implantação — VPS Ubuntu

Roteiro para pôr a Solução TS no ar num VPS Ubuntu, do zero. Tudo numa máquina
só: PostgreSQL, a API Node e o nginx servindo o frontend.

Escrito sobre **Ubuntu 22.04**, que é o que a HostGator entrega. Nele o
`apt install postgresql` traz a versão 14, folgada para o que o Prisma usa.

**Por que tudo junto:** o frontend fica no mesmo domínio da API, então o
navegador chama `/api` na própria origem. Sem CORS, sem segundo deploy, sem
domínio dividido. É a razão de o `VITE_API_URL` poder ficar no padrão `/api`.

Os arquivos citados estão em [`implantacao/`](implantacao/).

---

## 0. Antes de começar

Tenha em mãos:

- **IP do VPS** e a senha de root (o painel da HostGator mostra).
- **Domínio** apontando para esse IP — um registro `A` no DNS. Faça isso
  primeiro: a emissão do certificado (passo 7) depende de o domínio já
  resolver, e a propagação pode levar horas.

Ao longo do roteiro, troque `app.seudominio.com.br` pelo seu domínio real.

---

## 1. Acesso e primeiras defesas

```bash
# A HostGator entrega o SSH numa porta diferente da padrão — confira a sua
# no painel, em "Acesso SSH". Costuma ser 22022.
ssh -p 22022 root@SEU_IP
```

Atualize e crie um usuário sem privilégios para a aplicação. **A API não roda
como root**: se um dia ela for comprometida, o estrago fica limitado ao que
esse usuário alcança.

```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban git curl

# Sem aspas de propósito: no console web da hospedagem o teclado é lido como
# layout americano, e aspa vira outro caractere. Este comando pergunta nome,
# sala e telefone — aperte Enter em todos e confirme com Enter no fim.
adduser --disabled-password solucao
usermod -aG sudo solucao
```

Você continua entrando na máquina como root e passando para o `solucao` com
`su - solucao` quando o roteiro pedir. Ele não precisa de acesso SSH próprio —
existe para a **aplicação** rodar sem privilégio, não para você usar.

Firewall — só SSH e web ficam abertos. **O PostgreSQL não é exposto**: a API
fala com ele pelo `localhost`, e banco aberto na internet é um dos alvos mais
varridos que existem.

> **Confira a porta do SSH antes de ativar o firewall.** O perfil `OpenSSH` do
> ufw libera a porta **22**. Se o seu SSH estiver noutra porta (a HostGator usa
> 22022) e você liberar só a 22, o firewall corta a sua própria conexão e você
> perde o acesso à máquina — sobra recuperar pelo console do painel.

```bash
# Descubra em que porta o SSH está ouvindo, e libere ESSA. Procure a linha
# com "sshd" — o número depois do ":" é a porta.
ss -tlnp

ufw allow 22022/tcp        # troque pela porta que apareceu acima
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status                 # confirme que a porta do SSH está na lista
```

**Não feche esta sessão SSH ainda.** Abra uma segunda janela e teste se
consegue entrar. Se der errado, você ainda tem a primeira aberta para desfazer
com `ufw disable`.

---

## 2. PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
```

Crie o usuário **já com a senha**, e depois o banco:

```bash
sudo -u postgres createuser -P solucao
sudo -u postgres createdb -O solucao solucaots
```

O `-P` pergunta a senha duas vezes, ali mesmo no terminal, sem mostrar o que
você digita.

**Por que assim, e não com `CREATE USER ... PASSWORD` no psql:** aquele
comando deixaria a senha em texto puro no histórico do shell e no
`~/.psql_history`, legível depois por quem tiver acesso à máquina. E, na
prática, ele exige aspas e contrabarra — caracteres que o console web da
hospedagem, que lê o teclado como layout americano, dificulta bastante.
O `-P` não precisa de nenhum símbolo.

Se precisar refazer, apague antes (o banco vazio não perde nada):

```bash
sudo -u postgres dropdb solucaots
sudo -u postgres dropuser solucao
```

Guarde essa senha: ela entra na `DATABASE_URL` do passo 5.

---

## 3. Node.js 24

```bash
# Em duas etapas, sem pipe: no console web da hospedagem o teclado é lido
# como layout americano, e o "|" é difícil de acertar. Pelo SSH, tanto faz.
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource.sh
bash /tmp/nodesource.sh
apt install -y nodejs
node -v && npm -v
```

**Por que a 24, e não a 22 LTS:** o `package-lock.json` do projeto foi escrito
pelo npm 11, que vem com a 24. O npm 10 (da 22) considera esse lockfile
incompleto e o `npm ci` falha — foi exatamente o erro que a CI deu quando
tentamos a 22. A CI hoje roda na 24; manter o servidor igual evita a mesma
armadilha.

---

## 4. Código

```bash
su - solucao
git clone https://github.com/Gussmarcaro/SolucaoTS.git /home/solucao/app
cd /home/solucao/app
```

O repositório é público, então o clone não pede credencial. **Se um dia ele
virar privado**, o caminho é uma *deploy key*: gere uma chave no servidor com
`ssh-keygen`, cadastre a pública em Settings → Deploy keys do repositório, e
troque a URL do clone pela forma SSH (`git@github.com:Gussmarcaro/SolucaoTS.git`).
Chave de leitura só para o servidor é melhor que a sua senha pessoal ali dentro.

---

## 5. Variáveis de ambiente

```bash
cp /home/solucao/app/implantacao/env.producao.example /home/solucao/app/backend/.env
nano /home/solucao/app/backend/.env
```

Preencha o que está marcado. Duas com atenção:

- **`JWT_SECRET`** — gere com `openssl rand -base64 48`. Não invente à mão:
  quem descobre esse segredo emite tokens válidos para qualquer usuário.
- **`DATABASE_URL`** — com a senha do passo 2.

Se a senha do banco tiver caracteres especiais, eles precisam ser codificados
na URL: `@` vira `%40`, `#` vira `%23`, `/` vira `%2F`. O `@` é o pior deles —
é o separador entre a senha e o servidor, então um `@` cru faz o driver
procurar um servidor com nome errado, e o erro não aponta a causa.

Dono e permissão. **O dono importa**: se você editou como root, o arquivo fica
dele, e o passo 6 roda como `solucao` — que não conseguiria lê-lo.

```bash
chown solucao:solucao /home/solucao/app/backend/.env
chmod 600 /home/solucao/app/backend/.env
```

---

## 6. Instalar, criar o schema e o primeiro usuário

> **Tudo aqui roda como `solucao`, nunca como root.** Um `npm` executado como
> root deixa arquivos do root dentro do `node_modules`, e a próxima atualização
> falha com `EACCES: permission denied, unlink` — o usuário da aplicação não
> consegue mais apagar o que precisa reinstalar. Se acontecer, o conserto está
> no fim deste documento.

```bash
cd /home/solucao/app/backend
npm ci
npx prisma generate
npm run db:push          # cria as tabelas
npm run dominios:seed    # CBO e classificação econômica (tabelas grandes)
```

Primeiro órgão, grupo e usuário — **só funciona com o banco vazio**, e é o
único caminho que cria usuário sem ninguém autenticado:

```bash
npm run bootstrap -- \
  --orgao "PREFEITURA MUNICIPAL DE ..." \
  --cnpj 00000000000000 --municipio 1 --entidade 1 \
  --nome "Seu Nome Completo" --cpf 00000000000 \
  --email voce@dominio.com.br --senha "UMA_SENHA_FORTE" \
  --tipo PREFEITURA_MUNICIPAL --periodicidade QUADRIMESTRAL
```

`--municipio` e `--entidade` são os códigos do órgão **no TCESP**, não números
quaisquer: eles vão no descritor de tudo que for transmitido. O `--tipo` aceita
PREFEITURA_MUNICIPAL, CAMARA, AUTARQUIA_MUNICIPAL, CONSORCIO_MUNICIPAL,
FUNDACAO_MUNICIPAL, FUNDO_PREVIDENCIA_MUNICIPAL, EMPRESA_PUBLICA ou
UNIDADE_SECRETARIA; a `--periodicidade` (QUADRIMESTRAL ou ANUAL) é a da
Declaração Negativa, e é dela que o sino calcula o prazo.

Este usuário nasce com a **marca de suporte**, que é o que permite provisionar
os órgãos seguintes pela própria interface.

Frontend:

```bash
cd /home/solucao/app/frontend
npm ci
npm run build            # gera dist/, que o nginx serve
```

---

## 7. A API como serviço

```bash
exit                     # volta a root
cp /home/solucao/app/implantacao/solucaots-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now solucaots-api
systemctl status solucaots-api
```

O `systemd` sobe a API no boot e a reinicia se ela cair. Sem isso, uma queda às
3h da manhã só seria notada quando alguém tentasse usar o sistema.

---

## 8. nginx e HTTPS

```bash
apt install -y nginx certbot python3-certbot-nginx

cp /home/solucao/app/implantacao/nginx-solucaots.conf /etc/nginx/sites-available/solucaots
# troque o server_name pelo seu domínio
nano /etc/nginx/sites-available/solucaots

ln -s /etc/nginx/sites-available/solucaots /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# O nginx roda como `www-data`, e o Ubuntu cria pastas pessoais com permissão
# 750 — só o dono e o grupo entram. Sem esta linha ele esbarra já no
# /home/solucao e devolve **403 Forbidden**, mesmo com o dist/ construído.
chmod 755 /home/solucao

nginx -t && systemctl reload nginx
```

Se aparecer **403 Forbidden** ao abrir o site, é quase sempre isso. O comando
que mostra onde o caminho trava:

```bash
namei -l /home/solucao/app/frontend/dist/index.html
```

Ele lista a permissão de cada pasta até o arquivo — a primeira sem `x` para
"outros" é a culpada.

Certificado (o domínio já precisa resolver para o IP):

```bash
certbot --nginx -d app.seudominio.com.br
```

O certbot já instala a renovação automática. Confira com
`systemctl list-timers | grep certbot`.

---

## 9. Backup — não pule este passo

Num VPS **ninguém faz backup por você**. E aqui não é só o banco: os PDFs das
notas fiscais ficam **dentro do PostgreSQL**, então o dump é o arquivo do
sistema inteiro.

```bash
cp /home/solucao/app/implantacao/backup-solucaots.sh /usr/local/bin/
chmod +x /usr/local/bin/backup-solucaots.sh
mkdir -p /var/backups/solucaots

crontab -e
# acrescente:
0 3 * * * /usr/local/bin/backup-solucaots.sh >> /var/log/backup-solucaots.log 2>&1
```

**Backup que fica só na mesma máquina não é backup.** Se o disco falhar, some
tudo junto. Configure uma cópia para fora — o `rclone` para um armazenamento
externo é o caminho simples, e vale acrescentar ao script.

**Teste a restauração agora**, com o sistema ainda vazio. Backup nunca testado
costuma falhar justamente no dia em que é necessário.

Gere um backup na hora, sem esperar as 3h:

```bash
/usr/local/bin/backup-solucaots.sh
ls -la /var/backups/solucaots/
```

E restaure num banco separado. Os comandos pegam o arquivo **mais recente**
sozinhos — nada de nome para digitar, que é onde se erra:

```bash
sudo -u postgres createdb solucaots_teste
ULTIMO=$(ls -t /var/backups/solucaots/*.sql.gz | head -1)
gunzip -c "$ULTIMO" > /tmp/restore.sql
sudo -u postgres psql solucaots_teste -f /tmp/restore.sql
```

Confira que as tabelas chegaram, e limpe:

```bash
sudo -u postgres psql solucaots_teste -c "\dt"
sudo -u postgres dropdb solucaots_teste
rm /tmp/restore.sql
```

---

## 10. Conferir

```bash
curl -s https://app.seudominio.com.br/api/health     # {"status":"ok"}
systemctl status solucaots-api
journalctl -u solucaots-api -n 50
```

Abra o sistema, entre com o usuário do passo 6 e confira o essencial: criar um
órgão, um ajuste, e abrir uma prestação.

---

## Publicar uma nova versão

```bash
cd /home/solucao/app
git pull
cd backend  && npm ci && npx prisma generate && npm run db:push
cd ../frontend && npm ci && npm run build
sudo systemctl restart solucaots-api
```

O `db:push` aplica mudanças de schema. **Faça o backup antes** quando a versão
mexer no banco — é o momento de maior risco.

---

## Onde olhar quando algo falhar

| Sintoma | Onde |
|---|---|
| API não responde | `journalctl -u solucaots-api -n 100` |
| Erro 502 no navegador | A API caiu; veja o log acima |
| Erro 404 em rota do sistema | Falta o `try_files` do SPA no nginx |
| Erro de banco | `journalctl -u postgresql -n 50` |
| `EACCES` no `npm ci` | `node_modules` com arquivo do root — ver abaixo |
| Erro 500 na tela | A tela mostra um **código** — busque-o no log da API |

Esse último é proposital: cada requisição tem um id, e o 500 devolve esse id ao
usuário. Ele lê o código na tela, repassa no chamado, e a busca no log é
imediata.

---

## `EACCES` no `npm ci` — arquivo do root no `node_modules`

```
npm error code EACCES
npm error syscall unlink
npm error path /home/solucao/app/backend/node_modules/.bin/…
```

Algum `npm` rodou como root e deixou arquivos dele na pasta. O `solucao` não
consegue apagá-los para reinstalar. Devolva a posse da pasta, **como root**:

```bash
exit                     # se estiver como solucao
chown -R solucao:solucao /home/solucao/app
```

Não apaga nada — só corrige o dono, que é como a pasta deveria estar desde o
passo 4. Se ainda assim insistir, já como `solucao`:

```bash
rm -rf node_modules && npm ci
```

A causa é sempre a mesma: **a aplicação é instalada e executada pelo `solucao`**;
root só copia o serviço, mexe no nginx e reinicia. Misturar os dois é o que
produz este erro semanas depois, na atualização — não na instalação.
