# chan-claw

OpenClaw workspace repo - all projects and video outputs.

## Project Naming Convention

**All tasks/projects follow the format:** `{project-name}-{YYYY-MM-DD}`

Examples:
- `2026-02-12-enterprise-security-hardening/`
- `2026-02-12-vendor-compliance-howto/`
- `openclaw-training-light/` (video project)
- `openclaw-training-dark/` (video project)

## Folder Structure

```
/
├── {project-name}-{YYYY-MM-DD}/    # Individual task projects
│   └── *.md, *.json, etc.
├── videos/                          # Video outputs
│   └── {topic}/{text,audio,video}/
├── .clawhub/                        # ClawHub configuration
├── config/                         # MCP/server configs
├── skills/                          # OpenClaw skills
└── memory/                          # Daily memory notes
```

## Notes

- Never commit secrets/API keys
- Push to GitHub after completing each project
- Keep `videos/` folder for video generation outputs
