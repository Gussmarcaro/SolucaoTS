#!/usr/bin/env bash
# Aplica os cabeçalhos de segurança no nginx do Solução TS.
# Uso:  sudo bash ~/app/deploy/aplicar-seguranca-nginx.sh
#
# Faz cópia da configuração antes, testa com `nginx -t` e, se o teste falhar,
# devolve a cópia — o site nunca fica com uma configuração quebrada.
set -euo pipefail

SITE=$(readlink -f /etc/nginx/sites-enabled/solucaots)
SNIP=/etc/nginx/snippets/solucaots-seguranca.conf
AQUI=$(cd "$(dirname "$0")" && pwd)
COPIA="$SITE.antes-seguranca-$(date +%F-%H%M)"
CONF=/etc/nginx/nginx.conf
COPIA_CONF="$CONF.antes-seguranca-$(date +%F-%H%M)"

cp -p "$SITE" "$COPIA"
cp -p "$CONF" "$COPIA_CONF"
install -m 644 "$AQUI/nginx/solucaots-seguranca.conf" "$SNIP"

if ! grep -q "solucaots-seguranca.conf" "$SITE"; then
  # No nível do server (logo após o client_max_body_size) e após cada
  # add_header de location.
  perl -0pi -e 's/(\n(\s*)client_max_body_size[^;]*;)/$1\n$2include snippets\/solucaots-seguranca.conf;/' "$SITE"
  perl -pi -e 's/^(\s*)(add_header Cache-Control[^;]*;)\s*$/$1$2\n$1include snippets\/solucaots-seguranca.conf;\n/' "$SITE"
fi

# Upload de extrato OFX aceita até 10 MB na API; o nginx cortava em 8.
perl -pi -e 's/client_max_body_size\s+8m;/client_max_body_size 12m;/' "$SITE"

# Não anunciar a versão do nginx.
perl -pi -e 's/^\s*#\s*server_tokens off;/\tserver_tokens off;/' "$CONF"

if nginx -t; then
  systemctl reload nginx
  echo "OK: cabeçalhos aplicados. Cópias: $COPIA e $COPIA_CONF"
else
  cp -p "$COPIA" "$SITE"
  cp -p "$COPIA_CONF" "$CONF"
  echo "ERRO: o nginx recusou a configuração. Nada foi mudado (cópias restauradas)." >&2
  exit 1
fi
