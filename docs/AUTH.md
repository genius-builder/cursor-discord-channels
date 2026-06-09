# Authentication — subscription first, API key last

## The point

**Claude Discord Channel** on GeniusTeam droplets uses `claude --channels` with **OAuth subscription** (`genius reauth`), not Anthropic API keys. Users burn Pro/Max quota, not per-token API billing.

**Cursor Discord Channel** must work the same way: **`cursor agent login` + subscription**, not `CURSOR_API_KEY`.

If this project only supports API keys, almost nobody will adopt it. The value is riding the subscription you already pay for.

## Auth modes

| Mode | Command | Billing | Use case |
|------|---------|---------|----------|
| **Subscription (default)** | `cursor agent login` | Pro/Max included usage | Droplet always-on agents, personal bots |
| API key (opt-in) | `CURSOR_API_KEY=...` | Separate API metering | CI/CD, Enterprise service accounts |

The bridge **defaults to subscription**. It checks `cursor agent status` at startup. No API key required.

## Droplet setup (like `genius reauth`)

```bash
# On droplet (first time)
cursor agent login          # browser OAuth — use SSH -L if headless
cursor agent status         # should show Logged in + subscription tier

# Or from laptop (mirror GeniusTeam reauth.sh)
bash scripts/reauth.sh <droplet-ip>
```

## Verified locally

```bash
unset CURSOR_API_KEY
cursor agent -p --trust "Say exactly: subscription auth ok"
# → subscription auth ok   (uses Pro+ login, no API key)
```

## What we do NOT recommend

- Documenting API key as the primary path
- Requiring `CURSOR_API_KEY` in bridge `.env`
- Positioning this as a "Cursor API wrapper"

API key remains documented only for CI/Enterprise in `docs/DROPLET_VALIDATION.md` appendix.
