# How to Set Up Your Claude API Token (Teams Plan)

A quick guide for team members who've been invited to an Anthropic Claude Teams plan.

**Time needed:** ~5 minutes | **No coding required**

---

## 1. Accept the Invite

- Open the invitation email from Anthropic
- Click the join link — this creates your account on the team workspace

## 2. Sign In

- Go to [console.anthropic.com](https://console.anthropic.com)
- Sign in with the email that received the invite

## 3. Go to API Keys

- Click your profile icon (top right)
- Go to **Settings → API Keys**
- Or navigate directly to: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

## 4. Create a Key

1. Click **Create Key**
2. Name it something meaningful (e.g., `work-laptop`, `dev-machine`)
3. Click **Create**
4. **⚠️ Copy the key immediately** — you won't be able to see it again
5. It looks like: `sk-ant-api03-xxxx...`

## 5. Store It Safely

- Save it in a **password manager** (1Password, Bitwarden, LastPass, etc.)
- Or a secure note on your device
- **Never** share it via chat, email, or commit it to source code

## 6. Where to Use It

Paste it when any tool asks for an "Anthropic API Key" or "Claude API Key". Works with:

| Tool | Where to paste |
|------|---------------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Terminal: `export ANTHROPIC_API_KEY="sk-ant-..."` |
| [Cursor](https://cursor.sh) | Settings → Models → Anthropic API Key |
| [Continue](https://continue.dev) | config.json → apiKey field |
| [Cline](https://github.com/cline/cline) | VS Code settings → Cline API Key |
| [OpenClaw](https://openclaw.ai) | Run `openclaw onboard` → choose Anthropic |
| Any OpenAI-compatible app | Use the API key with base URL `https://api.anthropic.com` |

## Important Notes

- **Usage limits** are set by your team admin — check with them if you hit rate limits
- **Models available** on Teams plan: Claude Opus, Sonnet, and Haiku
- **Billing** is handled by the team — your usage counts toward the team's quota
- If your key is compromised, **revoke it immediately** in the console and create a new one

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid API key" | Make sure you copied the full key including `sk-ant-` prefix |
| "Permission denied" | Check that you accepted the team invite (not just created a personal account) |
| "Rate limit exceeded" | Your team plan has usage caps — contact your team admin |
| Can't find API Keys page | Make sure you're signed into the team workspace, not a personal account |
| Key not working in a tool | Some tools need a restart after setting the API key |

---

*Last updated: March 2, 2026*
