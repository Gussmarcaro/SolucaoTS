# Implantação — VPS Ubuntu

Roteiro para pôr a Solução TS no ar num VPS Ubuntu, do zero. Tudo numa máquina
só: PostgreSQL, a API Node e o nginx servindo o frontend.

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
ssh root@SEU_IP
```

Atualize e crie um usuário sem privilégios para a aplicação. **A API não roda
como root**: se um dia ela for comprometida, o estrago fica limitado ao que
esse usuário alcança.

```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban git curl

adduser --disabled-password --gecos "" solucao
usermod -aG sudo solucao
mkdir -p /home/solucao/.ssh
cp ~/.ssh/authorized_keys /home/solucao/.ssh/ 2>/dev/null || true
chown -R solucao:solucao /home/solucao/.ssh
chmod 700 /home/solucao/.ssh
```

Firewall — só SSH e web ficam abertos. **O PostgreSQL não é exposto**: a API
fala com ele pelo `localhost`, e banco aberto na internet é um dos alvos mais
varridos que existem.

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## 2. PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
```

Crie o banco e o usuário. **Troque a senha** por uma longa e aleatória:

```bash
sudo -u postgres psql <<'SQL'
CREATE USER solucao WITH PASSWORD 'TROQUE_POR_UMA_SENHA_LONGA';
CREATE DATABASE solucaots OWNER solucao;
SQL
```

Guarde essa senha: ela entra na `DATABASE_URL` do passo 5.

---

## 3. Node.js 24

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
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
git clone SEU_REPOSITORIO /home/solucao/app
cd /home/solucao/app
```

Se o repositório for privado, use uma **deploy key** (chave SSH só de leitura,
gerada com `ssh-keygen` e cadastrada no repositório) em vez da sua senha.

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

Feche o arquivo para os outros usuários da máquina:

```bash
chmod 600 /home/solucao/app/backend/.env
```

---

## 6. Instalar, criar o schema e o primeiro usuário

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
nginx -t && systemctl reload nginx
```

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
costuma falhar justamente no dia em que é necessário:

```bash
gunzip -c /var/backups/solucaots/ARQUIVO.sql.gz | sudo -u postgres psql solucaots_teste
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
| Erro 500 na tela | A tela mostra um **código** — busque-o no log da API |

Esse último é proposital: cada requisição tem um id, e o 500 devolve esse id ao
usuário. Ele lê o código na tela, repassa no chamado, e a busca no log é
imediata.
