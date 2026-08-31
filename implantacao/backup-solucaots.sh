#!/usr/bin/env bash
#
# Backup do banco da Solução TS.
#
# O dump é o arquivo do sistema INTEIRO: os PDFs das notas fiscais ficam
# dentro do PostgreSQL, não em disco. Perder isto é perder as prestações e os
# documentos junto.
#
#   0 3 * * * /usr/local/bin/backup-solucaots.sh >> /var/log/backup-solucaots.log 2>&1

set -euo pipefail

DESTINO=/var/backups/solucaots
BANCO=solucaots
DIAS_MANTIDOS=30

mkdir -p "$DESTINO"
ARQUIVO="$DESTINO/$BANCO-$(date +%Y%m%d-%H%M%S).sql.gz"

sudo -u postgres pg_dump "$BANCO" | gzip > "$ARQUIVO"

# Um dump que falhou no meio deixa arquivo pequeno e válido só na aparência.
TAMANHO=$(stat -c%s "$ARQUIVO")
if [ "$TAMANHO" -lt 10240 ]; then
  echo "$(date -Is) ERRO: dump de apenas $TAMANHO bytes — verifique agora" >&2
  exit 1
fi

find "$DESTINO" -name "$BANCO-*.sql.gz" -mtime +"$DIAS_MANTIDOS" -delete

echo "$(date -Is) ok: $ARQUIVO ($TAMANHO bytes)"

# ATENÇÃO: até aqui a cópia está na MESMA máquina. Se o disco falhar, some
# junto com o original. Acrescente o envio para fora, por exemplo:
#
#   rclone copy "$ARQUIVO" remoto:solucaots-backups/
