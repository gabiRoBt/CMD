#!/bin/bash
# entrypoint.sh — rulat la fiecare pornire de container

set -e

# ── Verificări env ─────────────────────────────────────────────────────────────
if [ -z "$PLAYER_PUBLIC_KEY" ]; then
    echo "EROARE: PLAYER_PUBLIC_KEY nu este setată"; exit 1
fi

# ── SSH setup ──────────────────────────────────────────────────────────────────
echo "$PLAYER_PUBLIC_KEY" > /home/player/.ssh/authorized_keys
chmod 600 /home/player/.ssh/authorized_keys
chown player:player /home/player/.ssh/authorized_keys
ssh-keygen -A

# ── nuclearcodes.txt — MEREU în /home/player, niciodată altundeva ─────────────
SECRET_PASSWORD="${SECRET_PASSWORD:-$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16)}"
echo "$SECRET_PASSWORD" > /home/player/nuclearcodes.txt
chmod 644 /home/player/nuclearcodes.txt
chown player:player /home/player/nuclearcodes.txt

# ── Generare filesystem random ─────────────────────────────────────────────────
# Seed reproducibil per arenă
SEED="${ARENA_ID:-default}"
RAND_BYTE=$(echo "$SEED" | md5sum | tr -dc '0-9' | head -c 4)

# Helper: număr pseudo-random între 0 și N-1
rnd() { echo $(( (RAND_BYTE + $1 * 7 + $2) % $3 )); }

# ── Directoare "de om normal" ──────────────────────────────────────────────────
DIRS=(
    "Documente"
    "Documente/contracte"
    "Documente/facturi_2023"
    "Documente/facturi_2024"
    "Poze/Vacanta_Sinaia"
    "Poze/Botez_Andrei"
    "Poze/Craciun_2023"
    "Muzica/Playlist_drum"
    "Desktop"
    "Downloads"
    "Downloads/temp"
    "Proiecte/site_firma"
    "Proiecte/backup_vechi"
    ".config/app"
    ".local/share"
    "logs"
    "logs/archive"
    "tmp"
    "tmp/cache"
)

for d in "${DIRS[@]}"; do
    mkdir -p "/home/player/$d"
done
chown -R player:player /home/player

# ── Fișiere momeală (noise realist) ───────────────────────────────────────────
# Fișiere text banale în directoare
cat > /home/player/Documente/note.txt << 'EOF'
Reuniune 15 martie - sala 3
- discutat buget Q2
- Andrei trimite raportul pana vineri
- apelat furnizor pana luni
EOF

cat > /home/player/Documente/contracte/model_nda.txt << 'EOF'
CONTRACT DE CONFIDENTIALITATE
Intre partile: _____ si _____
Data: ___________
Obiect: protejarea informatiilor comerciale
EOF

cat > /home/player/Downloads/readme.txt << 'EOF'
Fisiere descarcate - de sortat
- factura_emag_dec.pdf (de mutat in facturi)
- driver_imprimanta.exe (instalat deja)
EOF

cat > /home/player/Desktop/parole_hint.txt << 'EOF'
Parola wifi: ...vezi agenda albastra
Parola router: admin (schimbat!)
EOF

cat > /home/player/logs/app.log << 'EOF'
2024-01-15 08:23:11 INFO  Application started
2024-01-15 08:23:12 INFO  Database connection established
2024-01-15 09:14:33 WARN  Slow query detected (2341ms)
2024-01-15 11:02:44 INFO  User login: admin
2024-01-15 14:55:01 ERROR Connection timeout - retrying
2024-01-15 14:55:03 INFO  Connection restored
EOF

# Fișiere mari de log (zgomot de navigare)
for i in 1 2 3; do
    python3 -c "
import random, string, datetime
lines = []
for j in range(random.randint(30,60)):
    ts = '2024-0{}-{:02d} {:02d}:{:02d}:{:02d}'.format(
        random.randint(1,9), random.randint(1,28),
        random.randint(6,23), random.randint(0,59), random.randint(0,59))
    lvl = random.choice(['INFO','INFO','INFO','WARN','DEBUG'])
    msg = random.choice([
        'Request processed in {}ms'.format(random.randint(10,500)),
        'Cache hit for key usr_{}'.format(random.randint(1000,9999)),
        'Scheduled task completed',
        'Health check OK',
        'Connection pool: {}/20 active'.format(random.randint(1,18)),
    ])
    lines.append(f'{ts} {lvl}  {msg}')
print('\n'.join(lines))
" > "/home/player/logs/archive/system_$i.log" 2>/dev/null || echo "log $i" > "/home/player/logs/archive/system_$i.log"
done

# Fișiere imagine placeholder (fișiere binare mici ca momeală)
for name in IMG_0142 IMG_0143 foto_grup vacanta_munte; do
    dd if=/dev/urandom bs=512 count=4 2>/dev/null > "/home/player/Poze/Vacanta_Sinaia/${name}.jpg"
done

# ── Directoare goale suplimentare (ținte pentru sonar) ────────────────────────
mkdir -p /home/player/tmp/cache/old
mkdir -p /home/player/Downloads/temp/extracted
mkdir -p /home/player/Proiecte/backup_vechi/v1
chown -R player:player /home/player

# ── Ability tokens — fișiere cu hash-uri pentru pouch ─────────────────────────
# Serverul injectează hash-ul prin env; jucătorul găsește fișierul și-l mută în ~/pouch/
# Fișierele sunt ascunse aleatoriu în directoare.
# Fișierul se cheamă weapon_<ability>_<suffix>.bin și conține DOAR hash-ul.

mkdir -p /home/player/pouch
chown player:player /home/player/pouch

WEAPON_DIRS=(
    "Documente"
    "Documente/facturi_2023"
    "Downloads"
    "Downloads/temp"
    "Proiecte/site_firma"
    "logs/archive"
    ".config/app"
    "tmp"
    "Muzica/Playlist_drum"
)

ABILITIES=(scramble repair rocket sonar)
ABILITY_ENVS=(ABILITY_SCRAMBLE ABILITY_REPAIR ABILITY_ROCKET ABILITY_SONAR)

for i in "${!ABILITIES[@]}"; do
    ability="${ABILITIES[$i]}"
    env_var="${ABILITY_ENVS[$i]}"
    hash_val="${!env_var}"

    # Dacă hash-ul nu e setat, skip
    [ -z "$hash_val" ] && continue

    # Alegeam un director pseudo-random pentru fișier
    dir_idx=$(( (RAND_BYTE + i * 13) % ${#WEAPON_DIRS[@]} ))
    target_dir="/home/player/${WEAPON_DIRS[$dir_idx]}"
    mkdir -p "$target_dir"

    # Suffix random de 4 cifre pentru a nu fi predictibil
    suffix=$(cat /dev/urandom | tr -dc '0-9' | head -c 4)
    weapon_file="$target_dir/weapon_${ability}_${suffix}.bin"

    # Scriem DOAR hash-ul (fără newline extra — serverul compară exact)
    printf '%s' "$hash_val" > "$weapon_file"
    chown player:player "$weapon_file"
    chmod 644 "$weapon_file"
done

chown -R player:player /home/player

# ── Mesaj de bun venit ─────────────────────────────────────────────────────────
cat > /home/player/.motd << 'EOF'
╔══════════════════════════════════════════╗
║         CMD :: ARENA — SETUP PHASE       ║
║                                          ║
║  Ascunde nuclearcodes.txt                ║
║  Cauta weapon_*.bin si muta-le in        ║
║  ~/pouch/ pentru abilitati               ║
║                                          ║
║  nuke: /bin/nuke_system <parola>         ║
╚══════════════════════════════════════════╝
EOF
chown player:player /home/player/.motd

# Afișăm motd la conectare
cat >> /home/player/.bashrc << 'EOF'
[ -f ~/.motd ] && cat ~/.motd
[ -f ~/.bash_aliases ] && source ~/.bash_aliases
EOF
chown player:player /home/player/.bashrc

echo "=== Container CMD pornit ==="
echo "Arena: $ARENA_ID | Rol: $PLAYER_ROLE"
exec /usr/sbin/sshd -D -e