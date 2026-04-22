# Server Migration Backup Notes

Created: 2026-04-22 UTC

## Backup files created on source server

### Memory-only backup
- `/home/chanclaw/.openclaw/workspace/backups/openclaw-memory-backup-20260422T011851Z.tar.gz`

Contents:
- `MEMORY.md`
- `USER.md`
- `SOUL.md`
- `IDENTITY.md`
- `TOOLS.md`
- `AGENTS.md`
- `HEARTBEAT.md`
- `memory/`

### Full migration backup
- `/home/chanclaw/.openclaw/workspace/backups/openclaw-full-migration-20260422T011956Z.tar.gz`

Contents intended:
- `~/.openclaw`
- `~/.config/systemd`
- `~/.claude`
- `~/.codex`

Approx size:
- 1.7G

## Restore notes

### Memory-only restore
```bash
mkdir -p /home/chanclaw/.openclaw/workspace
cd /home/chanclaw/.openclaw/workspace
tar xzf /path/to/openclaw-memory-backup-20260422T011851Z.tar.gz
```

### Full restore
```bash
cd /home/chanclaw
tar xzf /path/to/openclaw-full-migration-20260422T011956Z.tar.gz
```

Then usually:
```bash
systemctl --user daemon-reload
systemctl --user enable --now openclaw-gateway
```

## Important caution

The full migration archive likely contains secrets, tokens, and live credentials. Handle it like a private key and avoid storing it in public or loosely shared locations.
