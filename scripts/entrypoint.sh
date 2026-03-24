#!/bin/bash
# entrypoint.sh — rulat la fiecare pornire de container
# Preia cheia publică SSH din variabila de mediu și configurează accesul

set -e

# Verificăm că avem cheia publică
if [ -z "$PLAYER_PUBLIC_KEY" ]; then
    echo "EROARE: PLAYER_PUBLIC_KEY nu este setată"
    exit 1
fi

# Injectăm cheia publică a jucătorului
echo "$PLAYER_PUBLIC_KEY" > /home/player/.ssh/authorized_keys
chmod 600 /home/player/.ssh/authorized_keys
chown player:player /home/player/.ssh/authorized_keys

# Generăm host keys SSH dacă nu există
ssh-keygen -A

# Scriem parola secretă pe care jucătorul trebuie să o găsească
# (în producție, serverul Go o generează și o trimite prin env)
SECRET_PASSWORD="${SECRET_PASSWORD:-$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16)}"
echo "$SECRET_PASSWORD" > /home/player/nuclearcodes.txt
chmod 644 /home/player/nuclearcodes.txt
chown player:player /home/player/nuclearcodes.txt

echo "=== Container CMD pornit ==="
echo "Arena: $ARENA_ID | Rol: $PLAYER_ROLE"

# Pornim serverul SSH în prim-plan
exec /usr/sbin/sshd -D -e