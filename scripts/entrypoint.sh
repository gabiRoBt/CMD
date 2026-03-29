#!/bin/bash
set -e

if [ -z "$PLAYER_PUBLIC_KEY" ]; then
    echo "ERROR: PLAYER_PUBLIC_KEY not set"; exit 1
fi

echo "$PLAYER_PUBLIC_KEY" > /home/player/.ssh/authorized_keys
chmod 600 /home/player/.ssh/authorized_keys
chown player:player /home/player/.ssh/authorized_keys
ssh-keygen -A

SECRET_PASSWORD="${SECRET_PASSWORD:-$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16)}"
echo "$SECRET_PASSWORD" > /home/player/nuclearcodes.txt
chmod 644 /home/player/nuclearcodes.txt
chown player:player /home/player/nuclearcodes.txt

SEED="${ARENA_ID:-default}"
RAND_BYTE=$(echo "$SEED" | md5sum | tr -dc '0-9' | head -c 4)

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

WEAPON_DIRS=(
    "Documents" "Documents/invoices_2023" "Downloads"
    "Downloads/temp" "Projects/company_site"
    "logs/archive" ".config/app" "tmp" "Music/Road_Playlist"
)
ABILITIES=(scramble repair rocket sonar)
ABILITY_ENVS=(ABILITY_SCRAMBLE ABILITY_REPAIR ABILITY_ROCKET ABILITY_SONAR)

for i in "${!ABILITIES[@]}"; do
    ability="${ABILITIES[$i]}"
    env_var="${ABILITY_ENVS[$i]}"
    hash_val="${!env_var}"
    [ -z "$hash_val" ] && continue
    dir_idx=$(( (RAND_BYTE + i * 13) % ${#WEAPON_DIRS[@]} ))
    target_dir="/home/player/${WEAPON_DIRS[$dir_idx]}"
    mkdir -p "$target_dir"
    suffix=$(cat /dev/urandom | tr -dc '0-9' | head -c 4)
    weapon_file="$target_dir/weapon_${ability}_${suffix}.bin"
    printf '%s' "$hash_val" > "$weapon_file"
    chown player:player "$weapon_file"
    chmod 644 "$weapon_file"
done

chown -R player:player /home/player

# Centered MOTD
cat > /home/player/.motd << 'EOF'

    ╔══════════════════════════════════════════╗
    ║         CMD :: ARENA  —  SETUP           ║
    ║                                          ║
    ║   Protect  nuclearcodes.txt              ║
    ║   Find     weapon_*.bin → ~/pouch/       ║
    ║   Win with /bin/nuke_system <password>   ║
    ╚══════════════════════════════════════════╝

EOF
chown player:player /home/player/.motd

cat >> /home/player/.bashrc << 'EOF'
[ -f ~/.motd ] && cat ~/.motd
[ -f ~/.bash_aliases ] && source ~/.bash_aliases
EOF
chown player:player /home/player/.bashrc

echo "=== CMD Arena container started ==="
echo "Arena: $ARENA_ID | Role: $PLAYER_ROLE"
exec /usr/sbin/sshd -D -e