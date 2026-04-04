package arena

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/pkg/stdcopy"
)

// Damage / heal constants.
// Max total ability damage is 60 HP — victory still requires a successful nuke.
const (
	dmgScramble = 20
	dmgRocket   = 25
	dmgSonar    = 15
	healRepair  = 15
)

// ExecuteAbility applies the named ability to targetContainer and decrements HP.
func (m *Manager) ExecuteAbility(targetContainerID, ability string, target *Player) error {
	target.LastAttack = ability
	target.AttackAt = time.Now()

	var dmg int
	var execFn func(string) error

	switch ability {
	case "scramble":
		dmg = dmgScramble
		execFn = m.execScramble
	case "rocket":
		dmg = dmgRocket
		execFn = m.execRocket
	case "sonar":
		dmg = dmgSonar
		execFn = m.execSonar
	default:
		return fmt.Errorf("unknown ability: %s", ability)
	}

	target.HP -= dmg
	if target.HP < 0 {
		target.HP = 0
	}
	return execFn(targetContainerID)
}

// ExecuteRepair cancels the last received attack within the 5-second window.
func (m *Manager) ExecuteRepair(p *Player) error {
	if p.LastAttack == "" {
		return fmt.Errorf("no attack to repair")
	}
	if time.Since(p.AttackAt) > 5*time.Second {
		return fmt.Errorf("repair window expired (>5s)")
	}
	var err error
	switch p.LastAttack {
	case "scramble":
		err = m.dockerExec(p.ContainerID, []string{"bash", "-c",
			`printf '' > /home/player/.bash_aliases 2>/dev/null; true`})
	case "rocket":
		err = m.dockerExec(p.ContainerID, []string{"bash", "-c",
			`pids=$(pgrep -u player -f bash 2>/dev/null); [ -n "$pids" ] && kill -CONT $pids 2>/dev/null; true`})
	default:
		return fmt.Errorf("ability '%s' cannot be repaired", p.LastAttack)
	}
	if err != nil {
		return err
	}
	p.HP += healRepair
	if p.HP > 100 {
		p.HP = 100
	}
	p.LastAttack = ""
	return nil
}

// ── Ability implementations ───────────────────────────────────────────────────

// execScramble randomises command aliases via Python so the mapping differs each time.
func (m *Manager) execScramble(id string) error {
	script := `python3 -c "
import random
cmds    = ['ls','find','cat','head','tail','grep','mkdir','touch','mv','cp']
targets = ['/bin/ls','/usr/bin/find','/bin/cat','/usr/bin/head',
           '/usr/bin/tail','/bin/grep','/bin/mkdir','/usr/bin/touch','/bin/mv','/bin/cp']
idx = list(range(len(targets)))
random.shuffle(idx)
lines = []
for i, c in enumerate(cmds):
    t = targets[idx[i]]
    if t.split('/')[-1] != c:
        lines.append('alias {}={}'.format(c, repr(t)))
print('\n'.join(lines))
" > /home/player/.bash_aliases 2>/dev/null
chown player:player /home/player/.bash_aliases 2>/dev/null; true`
	return m.dockerExec(id, []string{"bash", "-c", script})
}

// execRocket freezes all player bash processes for 10 seconds.
func (m *Manager) execRocket(id string) error {
	return m.dockerExec(id, []string{"bash", "-c",
		`pids=$(pgrep -u player -f bash 2>/dev/null)
if [ -n "$pids" ]; then kill -STOP $pids 2>/dev/null; ( sleep 10; kill -CONT $pids 2>/dev/null ) & fi`})
}

// execSonar lists all files, deletes empty directories, and broadcasts the
// file listing to every active player tty.
func (m *Manager) execSonar(id string) error {
	script := `bash -c '
FILES=$(find /home/player -type f ! -path "*/.ssh/*" 2>/dev/null \
    | sed "s|/home/player/||" | sort)

find /home/player -mindepth 1 -type d -empty \
    ! -path "*/pouch" ! -path "*/.ssh" -delete 2>/dev/null

if [ -z "$FILES" ]; then
    MSG="[SONAR] Scan complete. No files found."
else
    MSG="[SONAR] Files detected on enemy system:\n$(echo "$FILES" | awk "{print \"  \" \$0}")"
fi

for tty in /dev/pts/[0-9]* /dev/tty[0-9]*; do
    [ -w "$tty" ] || continue
    printf "\r\n\033[33m%b\033[0m\r\n" "$MSG" > "$tty" 2>/dev/null || true
done
true'`
	return m.dockerExec(id, []string{"bash", "-c", script})
}

// ── Pouch validation ──────────────────────────────────────────────────────────

// ValidatePouch reads ~/pouch/, matches filenames+contents against the arena tokens,
// and returns the list of unlocked ability names.
func (m *Manager) ValidatePouch(containerID string, tokens AbilityTokens) []string {
	script := `for f in /home/player/pouch/*; do
    [ -f "$f" ] || continue
    echo "$(basename "$f"):$(cat "$f" | tr -d '[:space:]')"
done`

	out, err := m.dockerExecOutput(containerID, []string{"bash", "-c", script})
	if err != nil {
		return nil
	}

	tokenMap := map[string]string{
		"scramble": tokens.Scramble,
		"repair":   tokens.Repair,
		"rocket":   tokens.Rocket,
		"sonar":    tokens.Sonar,
	}

	unlocked := []string{}
	seen := map[string]bool{}

	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		filename := strings.ToLower(parts[0])
		content := strings.TrimSpace(parts[1])
		for ability, hash := range tokenMap {
			if seen[ability] {
				continue
			}
			if strings.Contains(filename, ability) && content == hash {
				unlocked = append(unlocked, ability)
				seen[ability] = true
			}
		}
	}
	return unlocked
}

// ── Win condition sentinel ────────────────────────────────────────────────────

func (m *Manager) checkNukeFile(containerID string) bool {
	ctx := context.Background()
	exec, err := m.docker.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		Cmd: []string{"test", "-f", "/tmp/nuke_success"},
	})
	if err != nil {
		return false
	}
	if err := m.docker.ContainerExecStart(ctx, exec.ID, types.ExecStartCheck{}); err != nil {
		return false
	}
	for i := 0; i < 10; i++ {
		ins, err := m.docker.ContainerExecInspect(ctx, exec.ID)
		if err != nil {
			return false
		}
		if !ins.Running {
			return ins.ExitCode == 0
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}

// ── Docker exec helpers ───────────────────────────────────────────────────────

func (m *Manager) dockerExec(containerID string, cmd []string) error {
	ctx := context.Background()
	exec, err := m.docker.ContainerExecCreate(ctx, containerID, types.ExecConfig{Cmd: cmd})
	if err != nil {
		return err
	}
	return m.docker.ContainerExecStart(ctx, exec.ID, types.ExecStartCheck{})
}

func (m *Manager) dockerExecOutput(containerID string, cmd []string) (string, error) {
	ctx := context.Background()
	exec, err := m.docker.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		Cmd: cmd, AttachStdout: true, AttachStderr: true,
	})
	if err != nil {
		return "", err
	}
	resp, err := m.docker.ContainerExecAttach(ctx, exec.ID, types.ExecStartCheck{})
	if err != nil {
		return "", err
	}
	defer resp.Close()
	var buf bytes.Buffer
	stdcopy.StdCopy(&buf, &buf, resp.Reader)
	return buf.String(), nil
}
