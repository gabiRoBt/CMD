#!/bin/bash
# /bin/nuke_system — Victory condition

if [ -z "$1" ]; then
    if [ "$PLAYER_LANG" = "ro" ]; then
        echo "Utilizare: /bin/nuke_system <parola>"
    elif [ "$PLAYER_LANG" = "fr" ]; then
        echo "Utilisation: /bin/nuke_system <mot_de_passe>"
    elif [ "$PLAYER_LANG" = "es" ]; then
        echo "Uso: /bin/nuke_system <contraseña>"
    else
        echo "Usage: /bin/nuke_system <password>"
    fi
    exit 1
fi

EXPECTED_HASH=$(cat /etc/nuke_hash 2>/dev/null)
INPUT_HASH=$(echo -n "$1" | sha256sum | awk '{print $1}')

if [ "$INPUT_HASH" = "$EXPECTED_HASH" ]; then
    if [ "$PLAYER_LANG" = "ro" ]; then
        echo "☢️  LANSARE NUCLEARĂ AUTORIZATĂ ☢️"
        echo "Sistem compromis. Oprire în curs..."
    elif [ "$PLAYER_LANG" = "fr" ]; then
        echo "☢️  LANCEMENT NUCLÉAIRE AUTORISÉ ☢️"
        echo "Système compromis. Arrêt en cours..."
    elif [ "$PLAYER_LANG" = "es" ]; then
        echo "☢️  LANZAMIENTO NUCLEAR AUTORIZADO ☢️"
        echo "Sistema comprometido. Apagando..."
    else
        echo "☢️  NUCLEAR LAUNCH AUTHORIZED ☢️"
        echo "System compromised. Shutting down..."
    fi
    # Write the sentinel file — Go detects it and stops the container
    echo "$(date)" > /tmp/nuke_success
    # Stop all player processes so bash stops showing the prompt
    # (Go will stop the container anyway in <1s via WatchForWinner)
    sleep 0.5
    pkill -u player 2>/dev/null
    exit 0
else
    if [ "$PLAYER_LANG" = "ro" ]; then
        echo "❌ Parolă incorectă. Mai încearcă."
    elif [ "$PLAYER_LANG" = "fr" ]; then
        echo "❌ Mot de passe incorrect. Réessayez."
    elif [ "$PLAYER_LANG" = "es" ]; then
        echo "❌ Contraseña incorrecta. Inténtalo de nuevo."
    else
        echo "❌ Incorrect password. Try again."
    fi
    exit 1
fi