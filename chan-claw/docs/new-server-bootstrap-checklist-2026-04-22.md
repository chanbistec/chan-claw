# New Server Bootstrap Checklist

Created: 2026-04-22 UTC

Use this checklist to bring up a fresh VM and restore the OpenClaw environment safely.

## 1. Base server prep

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget jq build-essential
```

Optional but recommended:
```bash
sudo apt install -y ufw fail2ban
sudo ufw allow OpenSSH
sudo ufw enable
```

## 2. Create user and home layout

If needed:
```bash
sudo adduser chanclaw
sudo usermod -aG sudo chanclaw
```

Switch to the working user:
```bash
sudo su - chanclaw
```

## 3. Install Node.js

Use the Node version required by OpenClaw. If using nvm:
```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node -v
npm -v
```

## 4. Install OpenClaw and supporting CLIs

```bash
npm install -g openclaw
```

Optional, depending on your workflow:
```bash
npm install -g @openai/codex
npm install -g @anthropic-ai/claude-code
```

## 5. Restore migration tarball

Copy the archive to the new server, then restore:
```bash
cd /home/chanclaw
tar xzf /path/to/openclaw-full-migration-20260422T011956Z.tar.gz
```

If doing memory-only restore instead:
```bash
mkdir -p /home/chanclaw/.openclaw/workspace
cd /home/chanclaw/.openclaw/workspace
tar xzf /path/to/openclaw-memory-backup-20260422T011851Z.tar.gz
```

## 6. Check ownership and permissions

```bash
sudo chown -R chanclaw:chanclaw /home/chanclaw/.openclaw /home/chanclaw/.config /home/chanclaw/.claude /home/chanclaw/.codex
chmod 700 /home/chanclaw/.ssh 2>/dev/null || true
chmod 600 /home/chanclaw/.ssh/* 2>/dev/null || true
```

## 7. Reinstall dependencies inside important repos

From workspace root, inspect what needs install:
```bash
cd /home/chanclaw/.openclaw/workspace
find . -maxdepth 2 -name package.json
```

Then install per project as needed, for example:
```bash
cd /home/chanclaw/.openclaw/workspace/chan-claw && npm install
```

Repeat for other active repos if they use Node, Python, or other local dependencies.

## 8. Re-enable user services

```bash
systemctl --user daemon-reload
systemctl --user enable --now openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

If other migrated services exist, enable them too:
```bash
systemctl --user list-unit-files | grep enabled
```

## 9. Verify OpenClaw health

```bash
openclaw status
openclaw gateway status
```

If needed:
```bash
openclaw gateway restart
```

## 10. Validate critical integrations

Check these based on your actual setup:
- Discord connectivity
- Cron jobs loaded correctly
- Git SSH access works
- API keys available in shell/service env
- Claude/Codex config still valid

Useful checks:
```bash
crontab -l 2>/dev/null || true
git -C /home/chanclaw/.openclaw/workspace remote -v
ssh -T git@github.com
```

## 11. Security cleanup

Recommended after restore:
- rotate any sensitive tokens copied in the tarball
- move secrets out of memory documents
- verify firewall rules
- verify fail2ban status
- review exposed ports and active services

## 12. Final smoke test

- send a DM to the bot
- confirm replies work
- verify workspace files are present
- verify backups exist
- verify scheduled automations do not duplicate unexpectedly

## Notes

- The full migration tarball likely contains secrets. Treat it like a sensitive credential bundle.
- Be careful not to run duplicate cron jobs or duplicate gateway/service instances across old and new servers at the same time.
- Before cutting over fully, decide whether the old server should be shut down or left online only for rollback.
