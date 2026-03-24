#!/bin/bash
# /bin/nuke_system — Condiția de victorie

CORRECT_PASSWORD=$(cat /home/player/nuclearcodes.txt 2>/dev/null)

if [ -z "$1" ]; then
    echo "Utilizare: /bin/nuke_system <parola>"
    exit 1
fi

if [ "$1" = "$CORRECT_PASSWORD" ]; then
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