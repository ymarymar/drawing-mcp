# drawing-mcp

A process-based pencil drawing MCP server. Connects to Claude Code and produces
layered HTML Canvas drawings using a classical construction methodology.

## What it does

Two tools:

- **`analyse_subject`** — Takes a text description, returns a pencil construction
  drawing as a self-contained HTML canvas snippet. Works gesture → volumes → forms.
- **`refine_drawing`** — Takes the previous output and adds line quality, weight
  variation, or form shadow at detail levels 1–3.

## Local development (Claude Code on your machine)

### 1. Install and build

```bash
npm install
npm run build
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
```

### 3. Add to Claude Code

Edit your Claude Code MCP config (`~/.claude/claude_desktop_config.json`
or equivalent):

```json
{
  "mcpServers": {
    "drawing-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/drawing-mcp/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here"
      }
    }
  }
}
```

Restart Claude Code. You should see `analyse_subject` and `refine_drawing`
in the available tools.

### 4. Test it

In Claude Code:
> "Can you draw a bird perched on a branch, side view?"

Claude will call `analyse_subject`, return an HTML snippet. Paste it into
a Claude artifact or any HTML file to render.

---

## Hosted deployment (DigitalOcean)

### Droplet setup (one time)

```bash
# On the droplet as root

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudflare.com/carlista/caddy/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
apt update && apt install caddy

# Create env file (never in the repo)
cp .env.example /root/drawing-mcp.env
chmod 600 /root/drawing-mcp.env
# Edit /root/drawing-mcp.env with real values

# Generate an API key
openssl rand -hex 32
# Paste the output as API_KEY in /root/drawing-mcp.env

# Copy Caddyfile
cp Caddyfile /etc/caddy/Caddyfile
# Edit /etc/caddy/Caddyfile — replace yourdomain.com with your domain
systemctl restart caddy
```

### Firewall (DO Cloud Firewall or ufw)

Only these ports should be open to the public internet:

| Port | Protocol | Purpose         |
|------|----------|-----------------|
| 22   | TCP      | SSH (restrict to your IP if possible) |
| 80   | TCP      | Caddy HTTP→HTTPS redirect |
| 443  | TCP      | Caddy HTTPS     |

Port 3000 must NOT be public — Caddy proxies to it internally.

### Deploy

```bash
chmod +x deploy.sh
./deploy.sh root@your-droplet-ip
```

### Connect Claude Code to hosted server

```json
{
  "mcpServers": {
    "drawing-mcp": {
      "url": "https://yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer your_api_key_here"
      }
    }
  }
}
```

---

## Project structure

```
src/
  index.ts          — stdio entry point (local Claude Code)
  server.ts         — HTTP/SSE entry point (hosted)
  schema.ts         — Zod schemas for all inputs and outputs
  prompts/
    system.ts       — System prompts (methodology IP — never exposed)
  tools/
    handlers.ts     — Tool logic
    anthropic-client.ts — Inner AI call, validation, security checks
  rendering/
    canvas.ts       — Converts validated commands to HTML canvas snippet
  security/
    sanitise.ts     — Input sanitisation, sentinel checks, error scrubbing
```

## Security notes

- The Anthropic API key and system prompts never leave the server process
- All AI output is validated against a strict Zod schema before returning
- User input is sanitised before touching any prompt
- Sentinel checks detect and block prompt extraction attempts
- The container runs as a non-root user with a read-only filesystem
- Caddy handles TLS — the app only binds to localhost
