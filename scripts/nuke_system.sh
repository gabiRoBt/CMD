#!/bin/bash
# /bin/nuke_system — Condiția de victorie

if [ -z "$1" ]; then
    echo "Utilizare: /bin/nuke_system <parola>"
    exit 1
fi

EXPECTED_HASH=$(cat /etc/nuke_hash 2>/dev/null)
INPUT_HASH=$(echo -n "$1" | sha256sum | awk '{print $1}')

if [ "$INPUT_HASH" = "$EXPECTED_HASH" ]; then
    echo "☢️  NUCLEAR LAUNCH AUTHORIZED ☢️"
    echo "Sistem compromis. Oprire în curs..."
    # Scriem fișierul martor — Go-ul îl detectează și oprește containerul
    echo "$(date)" > /tmp/nuke_success
    sleep 2
    exit 0
else
    echo "❌ Parolă incorectă. Mai încearcă."
    exit 1
fi