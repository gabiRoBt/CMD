#!/bin/bash
set -e

# SSH removed — terminal connects via docker exec directly.
# The container is kept alive via sleep infinity at the end.

SECRET_PASSWORD="${SECRET_PASSWORD:-$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16)}"
echo "$SECRET_PASSWORD" > /home/player/nuclearcodes.txt
chmod 644 /home/player/nuclearcodes.txt
chown player:player /home/player/nuclearcodes.txt

echo -n "$SECRET_PASSWORD" | sha256sum | awk '{print $1}' > /etc/nuke_hash
chmod 644 /etc/nuke_hash

# Store raw password for the guardian process (root-only)
echo -n "$SECRET_PASSWORD" > /etc/nuke_raw
chmod 600 /etc/nuke_raw

# Store base64 version for archive detection
echo -n "$SECRET_PASSWORD" | base64 > /etc/nuke_raw_b64
chmod 600 /etc/nuke_raw_b64

# Strike counter file — starts at 0
echo "0" > /tmp/.nuke_strikes
chmod 666 /tmp/.nuke_strikes


SEED="${ARENA_ID:-default}-${PLAYER_ROLE:-player}"
RAND_BASE=$(echo "$SEED" | md5sum | tr -dc '0-9' | head -c 6)

DIRS=(
    "Documents" "Documents/contracts" "Documents/invoices_2023"
    "Documents/invoices_2024" "Pictures/Vacation_Alps"
    "Pictures/Birthday_Party" "Pictures/Christmas_2023"
    "Music/Road_Playlist" "Desktop" "Downloads" "Downloads/temp"
    "Projects/company_site" "Projects/old_backup"
    ".config/app" ".local/share" "logs" "logs/archive" "tmp" "tmp/cache"
)
for d in "${DIRS[@]}"; do mkdir -p "/home/player/$d"; done
chown -R player:player /home/player

cat > /home/player/Documents/notes.txt << 'EOF'
Meeting March 15 - room 3
- discussed Q2 budget
- Andrew sends report by Friday
- call supplier by Monday
EOF

cat > /home/player/Documents/contracts/nda_template.txt << 'EOF'
NON-DISCLOSURE AGREEMENT
Between: _____ and _____
Date: ___________
Subject: protection of commercial information
EOF

cat > /home/player/Downloads/readme.txt << 'EOF'
Downloaded files - to sort
- invoice_amazon_dec.pdf (move to invoices)
- printer_driver.exe (already installed)
EOF

cat > /home/player/Desktop/passwords_hint.txt << 'EOF'
WiFi password: ...see blue notebook
Router password: admin (changed!)
EOF

cat > /home/player/logs/app.log << 'EOF'
2024-01-15 08:23:11 INFO  Application started
2024-01-15 08:23:12 INFO  Database connection established
2024-01-15 09:14:33 WARN  Slow query detected (2341ms)
2024-01-15 11:02:44 INFO  User login: admin
2024-01-15 14:55:01 ERROR Connection timeout - retrying
2024-01-15 14:55:03 INFO  Connection restored
EOF

for i in 1 2 3; do
    python3 -c "
import random
lines = []
for j in range(random.randint(30,60)):
    ts = '2024-0{}-{:02d} {:02d}:{:02d}:{:02d}'.format(
        random.randint(1,9), random.randint(1,28),
        random.randint(6,23), random.randint(0,59), random.randint(0,59))
    lvl = random.choice(['INFO','INFO','INFO','WARN','DEBUG'])
    msg = random.choice([
        'Request processed in {}ms'.format(random.randint(10,500)),
        'Cache hit for key usr_{}'.format(random.randint(1000,9999)),
        'Scheduled task completed', 'Health check OK',
        'Connection pool: {}/20 active'.format(random.randint(1,18)),
    ])
    lines.append(f'{ts} {lvl}  {msg}')
print('\n'.join(lines))
" > "/home/player/logs/archive/system_$i.log" 2>/dev/null || echo "log $i" > "/home/player/logs/archive/system_$i.log"
done

for name in IMG_0142 IMG_0143 photo_group vacation_mountain; do
    dd if=/dev/urandom bs=512 count=4 2>/dev/null > "/home/player/Pictures/Vacation_Alps/${name}.jpg"
done

mkdir -p /home/player/tmp/cache/old
mkdir -p /home/player/Downloads/temp/extracted
mkdir -p /home/player/Projects/old_backup/v1
chown -R player:player /home/player

mkdir -p /home/player/pouch
chown player:player /home/player/pouch

# ── Weapon placement: random dir per ability, different per player/role ───────
WEAPON_DIRS=(
    "Documents" "Documents/invoices_2023" "Documents/contracts"
    "Downloads" "Downloads/temp" "Projects/company_site"
    "logs/archive" ".config/app" "tmp" "Music/Road_Playlist"
    "Desktop" "Pictures/Vacation_Alps"
)
ABILITIES=("scramble" "repair" "rocket" "sonar")
ABILITY_ENVS=("ABILITY_SCRAMBLE" "ABILITY_REPAIR" "ABILITY_ROCKET" "ABILITY_SONAR")

for i in "${!ABILITIES[@]}"; do
    ability="${ABILITIES[$i]}"
    env_var="${ABILITY_ENVS[$i]}"
    hash_val="${!env_var}"
    
    # Exclude empty values strictly
    if [ -z "$hash_val" ]; then continue; fi

    # Generate a random index safely using internal $RANDOM (0-32767)
    dir_idx=$(( RANDOM % ${#WEAPON_DIRS[@]} ))
    target_dir="/home/player/${WEAPON_DIRS[$dir_idx]}"
    mkdir -p "$target_dir"

    # Save weapon to file with a random suffix
    weapon_file="$target_dir/weapon_${ability}_${RANDOM}.bin"
    printf '%s' "$hash_val" > "$weapon_file"
    chmod 644 "$weapon_file"
done


chown -R player:player /home/player/

# ── Phase-transition hook: delete uncollected weapon files ───────────────────
# This script is called by the server (via docker exec) at setup→infiltrate
cat > /home/player/.on_infiltrate.sh << 'HOOKEOF'
#!/bin/bash
# Remove all weapon_*.bin files outside ~/pouch (player didn't collect them)
find /home/player -name 'weapon_*.bin' \
    -not -path '/home/player/pouch/*' -delete 2>/dev/null
# Clear all bash_aliases from scramble
printf '' > /home/player/.bash_aliases 2>/dev/null
true
HOOKEOF
chmod 700 /home/player/.on_infiltrate.sh
chown player:player /home/player/.on_infiltrate.sh


# ── MOTD ─────────────────────────────────────────────────────────────────────
if [ "$PLAYER_LANG" = "ro" ]; then
cat > /home/player/.motd << 'EOF'

    ╔══════════════════════════════════════════════╗
    ║         CMD :: ARENA  —  FAZA DE SETUP       ║
    ║                                              ║
    ║   Protejează nuclearcodes.txt                ║
    ║   Găsește    weapon_*.bin  →  ~/pouch/       ║
    ║   Câștigă cu /bin/nuke_system <parola>       ║
    ║                                              ║
    ║   ⚠️  Ștergerea codurilor = 3 STRIKE = PIERZI ║
    ║   Rulează  cmdhelp  pentru ghidul complet    ║
    ╚══════════════════════════════════════════════╝

EOF
elif [ "$PLAYER_LANG" = "fr" ]; then
cat > /home/player/.motd << 'EOF'

    ╔══════════════════════════════════════════════╗
    ║      CMD :: ARENA  —  PHASE DE PRÉPARATION   ║
    ║                                              ║
    ║   Protégez   nuclearcodes.txt                ║
    ║   Trouvez    weapon_*.bin  →  ~/pouch/       ║
    ║   Gagnez avec /bin/nuke_system <mdp>         ║
    ║                                              ║
    ║   ⚠️  Supprimer les codes = 3 STRIKES = PERDU ║
    ║   Tapez  cmdhelp  pour le guide du jeu       ║
    ╚══════════════════════════════════════════════╝

EOF
elif [ "$PLAYER_LANG" = "es" ]; then
cat > /home/player/.motd << 'EOF'

    ╔══════════════════════════════════════════════╗
    ║      CMD :: ARENA  —  FASE DE PREPARACIÓN    ║
    ║                                              ║
    ║   Protege    nuclearcodes.txt                ║
    ║   Encuentra  weapon_*.bin  →  ~/pouch/       ║
    ║   Gana con   /bin/nuke_system <contraseña>   ║
    ║                                              ║
    ║   ⚠️  Borrar códigos = 3 STRIKES = PIERDES    ║
    ║   Ejecuta  cmdhelp  para la guía del juego   ║
    ╚══════════════════════════════════════════════╝

EOF
else
cat > /home/player/.motd << 'EOF'

    ╔══════════════════════════════════════════════╗
    ║         CMD :: ARENA  —  SETUP PHASE         ║
    ║                                              ║
    ║   Protect   nuclearcodes.txt                 ║
    ║   Find      weapon_*.bin  →  ~/pouch/        ║
    ║   Win with  /bin/nuke_system <password>      ║
    ║                                              ║
    ║   ⚠️  Deleting codes = 3 STRIKES → YOU LOSE   ║
    ║   Run  cmdhelp  for the full game guide      ║
    ╚══════════════════════════════════════════════╝

EOF
fi
chown player:player /home/player/.motd

# ── cmdhelp: custom command — avoids collision with bash builtin 'help' ───────
# First: inject PLAYER_LANG as a literal value so it survives into the player shell.
# We CANNOT rely on the 'BASHRC' quoted heredoc to expand variables.
echo "export PLAYER_LANG=${PLAYER_LANG:-en}" >> /home/player/.bashrc
echo "export MANPAGER=cat"                   >> /home/player/.bashrc
cat >> /home/player/.bashrc << 'BASHRC'

# CMD :: Arena game guide
cmdhelp() {
    if [ "$PLAYER_LANG" = "ro" ]; then
        cat << 'GUIDE'

  ╔════════════════════════════════════════════════════════════════╗
  ║                CMD :: ARENA  —  GHIDUL JOCULUI                 ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  OBIECTIV                                                      ║
  ║    Găsește parola inamicului și lansează atacul nuclear:       ║
  ║      /bin/nuke_system <parola>                                 ║
  ║    Parola se află în  nuclearcodes.txt  pe serverul inamic.    ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  FAZA 1 — SETUP  (3 min 30 sec)                                ║
  ║    Ești pe containerul TĂU.                                    ║
  ║                                                                ║
  ║    ASCUNDE-ȚI nuclearcodes.txt:                                ║
  ║      mv nuclearcodes.txt .nume_ascuns                          ║
  ║      cat nuclearcodes.txt | base64 > encoded.txt               ║
  ║      tar czf codes.tar.gz nuclearcodes.txt                     ║
  ║                                                                ║
  ║    ⚠️  NU POȚI șterge codurile! 3 încercări = PIERZI.           ║
  ║    Parola trebuie să rămână recuperabilă undeva.               ║
  ║                                                                ║
  ║    COLECTEAZĂ arme (deblochează abilități în UI):              ║
  ║      find ~/ -name "weapon_*.bin" 2>/dev/null                  ║
  ║      mv ~/path/to/weapon_scramble_*.bin ~/pouch/               ║
  ║      Armele necolectate sunt ȘTERSE la finalul fazei.          ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  FAZA 2 — INFILTRARE  (3 min)                                  ║
  ║    Terminalul tău se conectează pe containerul INAMIC.         ║
  ║                                                                ║
  ║    Caută parola lor:                                           ║
  ║      find / -name "nuclearcodes*" 2>/dev/null                  ║
  ║      grep -r "nuclear" /home/player/ 2>/dev/null               ║
  ║                                                                ║
  ║    Lansează atacul ca să câștigi:                              ║
  ║      /bin/nuke_system <parola_gasita>                          ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  ABILITĂȚI  (activează din bara UI de jos)                     ║
  ║                                                                ║
  ║    🌀 SCRAMBLE   Schimbă comenzile terminalului 30s            ║
  ║       (ex. ls devine rm). Harta se scrie în /tmp/scramble...   ║
  ║    🚀 ROCKET     Blochează tastatura inamicului 15s            ║
  ║    📡 SONAR      Dezvăluie fișierele + șterge foldere goale    ║
  ║    🔧 REPAIR     Anulează ultimul atac în primele 5 secunde    ║
  ╚════════════════════════════════════════════════════════════════╝

GUIDE
    elif [ "$PLAYER_LANG" = "fr" ]; then
        cat << 'GUIDE'

  ╔════════════════════════════════════════════════════════════════╗
  ║                CMD :: ARENA  —  GUIDE DU JEU                   ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  OBJECTIF                                                      ║
  ║    Trouvez le mot de passe ennemi et lancez l'attaque :        ║
  ║      /bin/nuke_system <mot_de_passe>                           ║
  ║    Il se trouve dans  nuclearcodes.txt  chez l'ennemi.         ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  PHASE 1 — PRÉPARATION  (3 min 30 sec)                         ║
  ║    Vous êtes sur VOTRE conteneur.                              ║
  ║                                                                ║
  ║    CACHEZ votre nuclearcodes.txt:                              ║
  ║      mv nuclearcodes.txt .nom_cache                            ║
  ║      cat nuclearcodes.txt | base64 > encoded.txt               ║
  ║      tar czf codes.tar.gz nuclearcodes.txt                     ║
  ║                                                                ║
  ║    ⚠️  Vous NE POUVEZ PAS le supprimer ! 3 essais = PERDU.      ║
  ║                                                                ║
  ║    RÉCUPÉREZ les armes (débloque les capacités) :              ║
  ║      find ~/ -name "weapon_*.bin" 2>/dev/null                  ║
  ║      mv ~/path/to/weapon_scramble_*.bin ~/pouch/               ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  PHASE 2 — INFILTRATION  (3 min)                               ║
  ║    Vous êtes sur le conteneur ENNEMI.                          ║
  ║                                                                ║
  ║    Cherchez leur mot de passe et lancez l'attaque :            ║
  ║      /bin/nuke_system <mdp_trouve>                             ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  CAPACITÉS                                                     ║
  ║    🌀 SCRAMBLE   Mélange les commandes du terminal 30s         ║
  ║    🚀 ROCKET     Bloque le clavier ennemi 15s                  ║
  ║    📡 SONAR      Révèle les fichiers + supprime dossiers vides ║
  ║    🔧 REPAIR     Annule la dernière attaque (délai 5s)         ║
  ╚════════════════════════════════════════════════════════════════╝

GUIDE
    elif [ "$PLAYER_LANG" = "es" ]; then
        cat << 'GUIDE'

  ╔════════════════════════════════════════════════════════════════╗
  ║                CMD :: ARENA  —  GUÍA DEL JUEGO                 ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  OBJETIVO                                                      ║
  ║    Encuentra la contraseña y lanza el ataque nuclear:          ║
  ║      /bin/nuke_system <contraseña>                             ║
  ║    La contraseña está en  nuclearcodes.txt  en el enemigo.     ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  FASE 1 — PREPARACIÓN  (3 min 30 sec)                          ║
  ║    Estás en TU propio contenedor.                              ║
  ║                                                                ║
  ║    OCULTA tu nuclearcodes.txt:                                 ║
  ║      mv nuclearcodes.txt .nombre_oculto                        ║
  ║      cat nuclearcodes.txt | base64 > encoded.txt               ║
  ║      tar czf codes.tar.gz nuclearcodes.txt                     ║
  ║                                                                ║
  ║    ⚠️  ¡NO PUEDES borrarla! 3 intentos = PIERDES.               ║
  ║                                                                ║
  ║    RECOLECTA armas (desbloquea habilidades):                   ║
  ║      find ~/ -name "weapon_*.bin" 2>/dev/null                  ║
  ║      mv ~/path/to/weapon_scramble_*.bin ~/pouch/               ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  FASE 2 — INFILTRACIÓN  (3 min)                                ║
  ║    Tu terminal se conecta al contenedor ENEMIGO.               ║
  ║                                                                ║
  ║    Busca su contraseña y lanza el misil:                       ║
  ║      /bin/nuke_system <contraseña_encontrada>                  ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  HABILIDADES                                                   ║
  ║    🌀 SCRAMBLE   Mezcla los comandos del terminal 30s          ║
  ║    🚀 ROCKET     Bloquea el teclado enemigo 15s                ║
  ║    📡 SONAR      Revela archivos + borra carpetas vacías       ║
  ║    🔧 REPAIR     Anula el último ataque (ventana de 5s)        ║
  ╚════════════════════════════════════════════════════════════════╝

GUIDE
    else
        cat << 'GUIDE'

  ╔════════════════════════════════════════════════════════════════╗
  ║                CMD :: ARENA  —  GAME GUIDE                     ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  OBJECTIVE                                                     ║
  ║    Find the enemy password and launch the nuclear strike:      ║
  ║      /bin/nuke_system <password>                               ║
  ║    The password lives in  nuclearcodes.txt  on the enemy box.  ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  PHASE 1 — SETUP  (3 min 30 sec)                               ║
  ║    You are on YOUR OWN container.                              ║
  ║                                                                ║
  ║    HIDE your nuclearcodes.txt:                                 ║
  ║      mv nuclearcodes.txt .hidden_name                          ║
  ║      cat nuclearcodes.txt | base64 > encoded.txt               ║
  ║      tar czf codes.tar.gz nuclearcodes.txt                     ║
  ║                                                                ║
  ║    ⚠️  You CANNOT delete the codes! 3 attempts = YOU LOSE.      ║
  ║                                                                ║
  ║    COLLECT weapon files (unlock abilities in the UI footer):   ║
  ║      find ~/ -name "weapon_*.bin" 2>/dev/null                  ║
  ║      mv ~/path/to/weapon_scramble_*.bin ~/pouch/               ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  PHASE 2 — INFILTRATE  (3 min)                                 ║
  ║    Your terminal now connects to the ENEMY container.          ║
  ║                                                                ║
  ║    Search for their password and launch the nuke:              ║
  ║      /bin/nuke_system <found_password>                         ║
  ╠════════════════════════════════════════════════════════════════╣
  ║  ABILITIES  (activate from the web UI footer bar)              ║
  ║    🌀 SCRAMBLE   Remaps YOUR terminal commands randomly 30s    ║
  ║    🚀 ROCKET     Blocks ALL your keyboard input for 15s        ║
  ║    📡 SONAR      Reveals enemy files + deletes empty dirs      ║
  ║    🔧 REPAIR     Counters last received attack (5s window)     ║
  ╚════════════════════════════════════════════════════════════════╝

GUIDE
    fi
}

# ── Nuclear Codes Protection — 3-strike system ──────────────────────────────
# Checks if removing a file would destroy the ONLY remaining copy of the
# nuclear password. If so, increments the strike counter. 3 strikes = auto-loss.
_nuke_check_password_exists_after() {
    local PW
    PW=$(cat /etc/nuke_raw 2>/dev/null) || return 0
    [ -z "$PW" ] && return 0

    local B64
    B64=$(cat /etc/nuke_raw_b64 2>/dev/null)

    # Check plaintext
    grep -rq --include='*' "$PW" /home/player/ 2>/dev/null && return 0
    # Check base64
    [ -n "$B64" ] && grep -rq --include='*' "$B64" /home/player/ 2>/dev/null && return 0
    # Check archives exist
    find /home/player -type f \( -name '*.tar' -o -name '*.tar.gz' -o -name '*.tgz' \
        -o -name '*.gz' -o -name '*.zip' -o -name '*.bz2' -o -name '*.xz' \
        -o -name '*.7z' -o -name '*.rar' \) 2>/dev/null | grep -q . && return 0

    return 1
}

_nuke_strike() {
    local strikes
    strikes=$(cat /tmp/.nuke_strikes 2>/dev/null || echo "0")
    strikes=$((strikes + 1))
    echo "$strikes" > /tmp/.nuke_strikes
    local remaining=$((3 - strikes))

    # W=59 = visible chars between the two ║ borders.
    # Emoji-safe padding: we pad using "XX" (2 ASCII chars = 2 display cols) as a
    # placeholder, then bash-substitute the real emoji AFTER printf is done.
    # This means printf never sees wide/multi-byte emoji → alignment is exact.
    local W=59
    local BOX_TOP="  ╔═══════════════════════════════════════════════════════════╗"
    local BOX_BOT="  ╚═══════════════════════════════════════════════════════════╝"

    # _bl : plain text line
    _bl()  { printf "  ║%-${W}s║\n" "$1"; }
    # _bl_x : red [X] prefix (violation/death) — pad with ASCII marker, colorize after
    _bl_x() {
        local _p
        _p=$(printf "%-${W}s" "   [X]  $1")
        printf "  ║%s║\n" "${_p/\[X\]/$'\033[1;31m[X]\033[0m'}"
    }
    # _bl_w : yellow [!] prefix (warning) — pad with ASCII marker, colorize after
    _bl_w() {
        local _p
        _p=$(printf "%-${W}s" "   [!]  $1")
        printf "  ║%s║\n" "${_p/\[!\]/$'\033[1;33m[!]\033[0m'}"
    }

    echo ""
    echo "$BOX_TOP"

    if [ "$PLAYER_LANG" = "ro" ]; then
        _bl_x "INCALCAREA INTEGRITATII - CODURI DISTRUSE"
        _bl ""
        if [ "$remaining" -gt 0 ]; then
            _bl_w "STRIKE $strikes/3 - mai ai $remaining avertisment(e)"
            _bl ""
            _bl "  Codurile au fost RESTAURATE."
            _bl "  Poti MUTA, COPIA, ARHIVA - dar nu sterge."
            _bl "  Urmatoarea incalcare: strike $((strikes + 1))/3"
        else
            _bl_x "STRIKE 3/3 - INFRANGERE AUTOMATA"
            _bl ""
            _bl "  Ai fost descalificat pentru distrugerea codurilor."
        fi
    elif [ "$PLAYER_LANG" = "fr" ]; then
        _bl_x "VIOLATION D'INTEGRITE - CODES DETRUITS"
        _bl ""
        if [ "$remaining" -gt 0 ]; then
            _bl_w "STRIKE $strikes/3 - $remaining avertissement(s) restant(s)"
            _bl ""
            _bl "  Les codes ont ete RESTAURES."
            _bl "  Vous pouvez DEPLACER, COPIER, ARCHIVER - pas supprimer."
            _bl "  Prochaine violation : strike $((strikes + 1))/3"
        else
            _bl_x "STRIKE 3/3 - DEFAITE AUTOMATIQUE"
            _bl ""
            _bl "  Disqualifie pour avoir detruit les codes."
        fi
    elif [ "$PLAYER_LANG" = "es" ]; then
        _bl_x "VIOLACION - CODIGOS NUCLEARES DESTRUIDOS"
        _bl ""
        if [ "$remaining" -gt 0 ]; then
            _bl_w "STRIKE $strikes/3 - $remaining advertencia(s) restante(s)"
            _bl ""
            _bl "  Los codigos han sido RESTAURADOS."
            _bl "  Puedes MOVER, COPIAR o ARCHIVAR - pero no borrar."
            _bl "  Proxima violacion: strike $((strikes + 1))/3"
        else
            _bl_x "STRIKE 3/3 - DERROTA AUTOMATICA"
            _bl ""
            _bl "  Descalificado por destruir los codigos nucleares."
        fi
    else
        _bl_x "INTEGRITY VIOLATION - NUCLEAR CODES DESTROYED"
        _bl ""
        if [ "$remaining" -gt 0 ]; then
            _bl_w "STRIKE $strikes/3 - $remaining warning(s) remaining"
            _bl ""
            _bl "  The codes have been RESTORED."
            _bl "  You may MOVE, COPY, or ARCHIVE them - not delete."
            _bl "  Next violation: strike $((strikes + 1))/3"
        else
            _bl_x "STRIKE 3/3 - AUTOMATIC DEFEAT"
            _bl ""
            _bl "  You have been disqualified for destroying nuclear codes."
        fi
    fi

    echo "$BOX_BOT"
    echo ""

    if [ "$remaining" -le 0 ]; then
        # Write violation sentinel — server picks this up as a loss
        echo "$(date)" > /tmp/player_violation
        return 1
    fi
    return 0
}

# Wrapper for rm — intercepts deletion of files containing the password
rm() {
    # Run the actual rm first
    command rm "$@" 2>/dev/null
    local rc=$?

    # Now check if the password still exists somewhere
    if ! _nuke_check_password_exists_after; then
        # Password is gone — record a strike and restore it
        local PW
        PW=$(cat /etc/nuke_raw 2>/dev/null)
        if [ -n "$PW" ]; then
            echo "$PW" > /home/player/nuclearcodes.txt
            chmod 644 /home/player/nuclearcodes.txt
        fi
        _nuke_strike
        return $?
    fi
    return $rc
}

# Wrapper for shred
shred() {
    command shred "$@" 2>/dev/null
    if ! _nuke_check_password_exists_after; then
        local PW
        PW=$(cat /etc/nuke_raw 2>/dev/null)
        if [ -n "$PW" ]; then
            echo "$PW" > /home/player/nuclearcodes.txt
            chmod 644 /home/player/nuclearcodes.txt
        fi
        _nuke_strike
        return $?
    fi
}

# Wrapper for unlink
unlink() {
    command unlink "$@" 2>/dev/null
    if ! _nuke_check_password_exists_after; then
        local PW
        PW=$(cat /etc/nuke_raw 2>/dev/null)
        if [ -n "$PW" ]; then
            echo "$PW" > /home/player/nuclearcodes.txt
            chmod 644 /home/player/nuclearcodes.txt
        fi
        _nuke_strike
        return $?
    fi
}

# ── Exit / Surrender control ────────────────────────────────────────────────
if [ "$ARENA_TYPE" = "competitive" ]; then
    exit() {
        local W=59
        local BOX_TOP="  ╔═══════════════════════════════════════════════════════════╗"
        local BOX_BOT="  ╚═══════════════════════════════════════════════════════════╝"
        local BOX_BLK
        printf -v BOX_BLK "  ║%-${W}s║" " "

        echo ""
        echo "$BOX_TOP"
        if [ "$PLAYER_LANG" = "ro" ]; then
            printf "  ║%-${W}s║\n" "  ⚠️   MECI COMPETITIV — AVERTISMENT DE PREDARE"
            echo "$BOX_BLK"
            printf "  ║%-${W}s║\n" "  Ieșirea va conta ca o ÎNFRÂNGERE."
            printf "  ║%-${W}s║\n" "  Scorul tău ELO va fi penalizat."
            echo "$BOX_BLK"
            printf "  ║%-${W}s║\n" "  Scrie 'surrender' pentru a confirma, sau Enter anulează."
        elif [ "$PLAYER_LANG" = "fr" ]; then
            printf "  ║%-${W}s║\n" "  ⚠️   MATCH COMPÉTITIF — AVERTISSEMENT D'ABANDON"
            echo "$BOX_BLK"
            printf "  ║%-${W}s║\n" "  Quitter comptera comme une DÉFAITE."
            printf "  ║%-${W}s║\n" "  Votre score ELO sera pénalisé."
            echo "$BOX_BLK"
            printf "  ║%-${W}s║\n" "  Tapez 'surrender' pour confirmer, ou Entrée annule."
        elif [ "$PLAYER_LANG" = "es" ]; then
            printf "  ║%-${W}s║\n" "  ⚠️   PARTIDA COMPETITIVA — ADVERTENCIA DE RENDICIÓN"
            echo "$BOX_BLK"
            printf "  ║%-${W}s║\n" "  Salir contará como una DERROTA."
            printf "  ║%-${W}s║\n" "  Tu puntuación ELO será penalizada."
            echo "$BOX_BLK"
            printf "  ║%-${W}s║\n" "  Escribe 'surrender' para confirmar, o Enter para anular."
        else
            printf "  ║%-${W}s║\n" "  ⚠️   COMPETITIVE MATCH — SURRENDER WARNING"
            echo "$BOX_BLK"
            printf "  ║%-${W}s║\n" "  Exiting will count as a LOSS."
            printf "  ║%-${W}s║\n" "  Your ELO rating will be penalized."
            echo "$BOX_BLK"
            printf "  ║%-${W}s║\n" "  Type 'surrender' to confirm, or press Enter to cancel."
        fi
        echo "$BOX_BOT"
        echo ""
        read -p "  > " confirm
        if [ "$confirm" = "surrender" ]; then
            echo ""
            if [ "$PLAYER_LANG" = "ro" ]; then
                echo "  ☠️  Te-ai predat. GG."
            elif [ "$PLAYER_LANG" = "fr" ]; then
                echo "  ☠️  Vous avez abandonné. GG."
            elif [ "$PLAYER_LANG" = "es" ]; then
                echo "  ☠️  Te has rendido. GG."
            else
                echo "  ☠️  You have surrendered. GG."
            fi
            echo "$(date)" > /tmp/player_surrendered
            sleep 0.5
            builtin exit 0
        else
            if [ "$PLAYER_LANG" = "ro" ]; then
                echo "  Predare anulată. Continuă lupta!"
            elif [ "$PLAYER_LANG" = "fr" ]; then
                echo "  Abandon annulé. Continuez le combat !"
            elif [ "$PLAYER_LANG" = "es" ]; then
                echo "  Rendición cancelada. ¡Sigue luchando!"
            else
                echo "  Surrender cancelled. Keep fighting!"
            fi
        fi
    }
    surrender() {
        echo "$(date)" > /tmp/player_surrendered
        echo ""
        echo "  ☠️  You have surrendered. GG."
        sleep 0.5
        builtin exit 0
    }
else
    # Casual — exit works normally, no penalty
    true
fi

[ -f ~/.motd ] && cat ~/.motd
[ -f ~/.bash_aliases ] && source ~/.bash_aliases
BASHRC

chown player:player /home/player/.bashrc

# ── Background Password Guardian (root-owned safety net) ─────────────────────
# Runs every 3 seconds. If the password is completely gone from /home/player/
# (not found in plaintext, base64, or archives), restore it and log a strike.
# This catches bypasses like /bin/rm, python, perl, etc.
cat > /usr/local/bin/nuke_guardian.sh << 'GUARDIAN'
#!/bin/bash
PW=$(cat /etc/nuke_raw 2>/dev/null)
B64=$(cat /etc/nuke_raw_b64 2>/dev/null)
[ -z "$PW" ] && exit 0

while true; do
    sleep 3

    # Skip if game is already over
    [ -f /tmp/nuke_success ] && exit 0
    [ -f /tmp/player_violation ] && exit 0
    [ -f /tmp/player_surrendered ] && exit 0

    # Check plaintext
    grep -rq "$PW" /home/player/ 2>/dev/null && continue
    # Check base64
    [ -n "$B64" ] && grep -rq "$B64" /home/player/ 2>/dev/null && continue
    # Check archives
    find /home/player -type f \( -name '*.tar' -o -name '*.tar.gz' -o -name '*.tgz' \
        -o -name '*.gz' -o -name '*.zip' -o -name '*.bz2' -o -name '*.xz' \
        -o -name '*.7z' \) 2>/dev/null | grep -q . && continue

    # Password is completely gone — restore + strike
    echo "$PW" > /home/player/nuclearcodes.txt
    chmod 644 /home/player/nuclearcodes.txt
    chown player:player /home/player/nuclearcodes.txt

    # Increment strike counter
    strikes=$(cat /tmp/.nuke_strikes 2>/dev/null || echo "0")
    strikes=$((strikes + 1))
    echo "$strikes" > /tmp/.nuke_strikes
    remaining=$((3 - strikes))

    # Print warning to ALL player terminals
    # ASCII+ANSI approach: pad with [X]/[!] markers (3 ASCII chars = 3 display cols),
    # then bash-substitute the color codes AFTER printf. Zero wide-char issues.
    W=59
    _gx() { local _p; _p=$(printf "%-${W}s" "   [X]  $1"); printf "  ║%s║\n" "${_p/\[X\]/$'\033[1;31m[X]\033[0m'}"; }
    _gw() { local _p; _p=$(printf "%-${W}s" "   [!]  $1"); printf "  ║%s║\n" "${_p/\[!\]/$'\033[1;33m[!]\033[0m'}"; }
    for pts in /dev/pts/*; do
        [ "$pts" = "/dev/pts/ptmx" ] && continue
        {
            echo ""
            echo "  ╔═══════════════════════════════════════════════════════════╗"
            if [ "$PLAYER_LANG" = "ro" ]; then
                _gx "INCALCAREA INTEGRITATII - CODURI DISTRUSE"
                printf "  ║%-${W}s║\n" " "
                if [ "$remaining" -gt 0 ]; then
                    _gw "STRIKE $strikes/3 - mai ai $remaining avertisment(e)"
                    printf "  ║%-${W}s║\n" " "
                    printf "  ║%-${W}s║\n" "  Codurile au fost RESTAURATE."
                    printf "  ║%-${W}s║\n" "  Poti MUTA, COPIA, ARHIVA - dar nu sterge."
                else
                    _gx "STRIKE 3/3 - INFRANGERE AUTOMATA"
                    printf "  ║%-${W}s║\n" " "
                    printf "  ║%-${W}s║\n" "  Ai fost descalificat."
                fi
            elif [ "$PLAYER_LANG" = "fr" ]; then
                _gx "VIOLATION D'INTEGRITE - CODES DETRUITS"
                printf "  ║%-${W}s║\n" " "
                if [ "$remaining" -gt 0 ]; then
                    _gw "STRIKE $strikes/3 - $remaining avertissement(s) restant(s)"
                    printf "  ║%-${W}s║\n" " "
                    printf "  ║%-${W}s║\n" "  Les codes ont ete RESTAURES."
                    printf "  ║%-${W}s║\n" "  Vous pouvez DEPLACER, COPIER, ARCHIVER."
                else
                    _gx "STRIKE 3/3 - DEFAITE AUTOMATIQUE"
                    printf "  ║%-${W}s║\n" " "
                    printf "  ║%-${W}s║\n" "  Disqualifie pour avoir detruit les codes."
                fi
            elif [ "$PLAYER_LANG" = "es" ]; then
                _gx "VIOLACION - CODIGOS NUCLEARES DESTRUIDOS"
                printf "  ║%-${W}s║\n" " "
                if [ "$remaining" -gt 0 ]; then
                    _gw "STRIKE $strikes/3 - $remaining advertencia(s) restante(s)"
                    printf "  ║%-${W}s║\n" " "
                    printf "  ║%-${W}s║\n" "  Los codigos han sido RESTAURADOS."
                    printf "  ║%-${W}s║\n" "  Puedes MOVER, COPIAR o ARCHIVAR."
                else
                    _gx "STRIKE 3/3 - DERROTA AUTOMATICA"
                    printf "  ║%-${W}s║\n" " "
                    printf "  ║%-${W}s║\n" "  Descalificado por destruir los codigos."
                fi
            else
                _gx "INTEGRITY VIOLATION - NUCLEAR CODES DESTROYED"
                printf "  ║%-${W}s║\n" " "
                if [ "$remaining" -gt 0 ]; then
                    _gw "STRIKE $strikes/3 - $remaining warning(s) remaining"
                    printf "  ║%-${W}s║\n" " "
                    printf "  ║%-${W}s║\n" "  The codes have been RESTORED."
                    printf "  ║%-${W}s║\n" "  You may MOVE, COPY, or ARCHIVE them - not delete."
                else
                    _gx "STRIKE 3/3 - AUTOMATIC DEFEAT"
                    printf "  ║%-${W}s║\n" " "
                    printf "  ║%-${W}s║\n" "  Disqualified for destroying nuclear codes."
                fi
            fi
            echo "  ╚═══════════════════════════════════════════════════════════╝"
            echo ""
        } > "$pts" 2>/dev/null
    done

    if [ "$remaining" -le 0 ]; then
        echo "$(date)" > /tmp/player_violation
        exit 0
    fi
done
GUARDIAN
chmod 755 /usr/local/bin/nuke_guardian.sh

echo "=== CMD Arena container started ==="
echo "Arena: $ARENA_ID | Role: $PLAYER_ROLE | Type: ${ARENA_TYPE:-casual}"
# Signal to Go that setup is complete
touch /tmp/.ready
# Start guardian in background, then keep container alive
/usr/local/bin/nuke_guardian.sh &
# Keep container alive — players connect via docker exec
exec sleep infinity