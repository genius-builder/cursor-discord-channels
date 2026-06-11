# Authentication — subscription first, API key last

## The point

Always-on Discord agents should use **your Cursor subscription** (`agent login`), not a separate API key bill.

If this project only supported API keys, almost nobody would adopt it. The value is riding the subscription you already pay for.

## Auth modes

| Mode | Command | Billing | Use case |
|------|---------|---------|----------|
| **Subscription (default)** | `cursor agent login` | Pro/Max included usage | Always-on agents, personal bots |
| API key (opt-in) | `CURSOR_API_KEY=...` | Separate API metering | CI/CD, Enterprise service accounts |

The bridge **defaults to subscription**. It checks `cursor agent status` at startup. No API key required.

## Server setup

```bash
# On the server (first time)
cursor agent login          # browser OAuth — use SSH port-forward if headless
cursor agent status         # should show Logged in + subscription tier

# Or from your laptop
bash scripts/reauth.sh user@your-server-ip
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

Use API keys only for CI or Enterprise automation where subscription login is not available.
