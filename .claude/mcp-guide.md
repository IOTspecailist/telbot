# MCP (Model Context Protocol) Reference — telbot project

## WHAT IS MCP
- Open standard for connecting Claude to external tools, databases, and APIs
- MCP servers expose tools, resources, and prompts that Claude can call
- Tools auto-loaded into context; resources referenced via `@server:protocol://path`

## INSTALL COMMANDS
```bash
# HTTP (preferred for remote services)
claude mcp add --transport http <name> <url>

# HTTP with auth header
claude mcp add --transport http <name> <url> --header "Authorization: Bearer <token>"

# SSE (deprecated — use HTTP if available)
claude mcp add --transport sse <name> <url>

# stdio (local process — needs direct system access)
claude mcp add --transport stdio --env KEY=value <name> -- <command> [args]

# WINDOWS ONLY: npx requires cmd /c wrapper
claude mcp add --transport stdio <name> -- cmd /c npx -y @some/package
```

**Option ordering rule**: all flags (`--transport`, `--env`, `--scope`, `--header`) BEFORE server name; `--` separates server name from the command.

## SCOPES
| Scope | Storage | Visibility |
|---|---|---|
| `local` (default) | `~/.claude.json` under project path | Only you, current project |
| `project` | `.mcp.json` in project root (commit to git) | All team members |
| `user` | `~/.claude.json` global section | Only you, all projects |

Priority when same name exists: local > project > user

```bash
claude mcp add --scope project --transport http github https://api.githubcopilot.com/mcp/
claude mcp add --scope user   --transport http notion https://mcp.notion.com/mcp
```

## MANAGE SERVERS
```bash
claude mcp list             # list all configured servers
claude mcp get <name>       # details for one server
claude mcp remove <name>    # remove server
claude mcp add-json <name> '<json>'           # add from raw JSON
claude mcp add-from-claude-desktop            # import from Claude Desktop (macOS/WSL only)
claude mcp reset-project-choices              # reset approval prompts for .mcp.json
/mcp                        # within Claude Code: status + OAuth auth
```

## .mcp.json FORMAT (project scope)
```json
{
  "mcpServers": {
    "server-name": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${API_KEY}" }
    },
    "local-tool": {
      "command": "/path/to/binary",
      "args": ["--flag"],
      "env": { "DB_URL": "${DATABASE_URL}" }
    }
  }
}
```

**Env var expansion**: `${VAR}` or `${VAR:-default}` in `command`, `args`, `env`, `url`, `headers`.

## OAUTH AUTHENTICATION
1. `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`
2. Run `/mcp` inside Claude Code
3. Select "Authenticate" → browser opens
4. Tokens stored and auto-refreshed

## USING MCP IN CONVERSATIONS
```
# Reference resources with @
@github:issue://123
@postgres:schema://users

# Use MCP prompts as slash commands
/mcp__github__list_prs
/mcp__jira__create_issue "Bug in login" high
```

## OUTPUT LIMITS
- Warning threshold: 10,000 tokens output per tool call
- Default max: 25,000 tokens
- Override: `MAX_MCP_OUTPUT_TOKENS=50000 claude`

## TOOL SEARCH (auto-scaling)
- Activates when MCP tool definitions exceed 10% of context window
- Switches to on-demand tool loading instead of preloading all tools
- Requires Sonnet 4+ or Opus 4+ (Haiku does NOT support tool search)
- Control: `ENABLE_TOOL_SEARCH=auto` (default) | `auto:<N>%` | `true` | `false`
- Disable MCPSearch tool specifically:
```json
{ "permissions": { "deny": ["MCPSearch"] } }
```

## DYNAMIC TOOL UPDATES
MCP servers can push `list_changed` notifications — Claude Code auto-refreshes without reconnecting.

## SERVERS USEFUL FOR TELBOT PROJECT
| Server | Install | Use case |
|---|---|---|
| GitHub | `claude mcp add --transport http github https://api.githubcopilot.com/mcp/` | PR review, issue tracking |
| Sentry | `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp` | Error monitoring |
| PostgreSQL | `claude mcp add --transport stdio db -- npx -y @bytebase/dbhub --dsn "postgresql://..."` | DB queries |
| Filesystem | `claude mcp add --transport stdio fs -- npx -y @modelcontextprotocol/server-filesystem /path` | Local file access |

## PLUGIN-PROVIDED MCP SERVERS
- Defined in plugin's `.mcp.json` or inline in `plugin.json`
- Auto-start when plugin enabled; restart Claude Code to apply changes
- Use `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths
- Appear in `/mcp` list with plugin indicator

## MANAGED MCP (org/team control)
**Option 1 — exclusive control** (`managed-mcp.json` at system path):
- Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`
- Users cannot add/modify servers when this file exists

**Option 2 — policy-based** (in managed `settings.json`):
```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverUrl": "https://mcp.company.com/*" },
    { "serverCommand": ["npx", "-y", "approved-pkg"] }
  ],
  "deniedMcpServers": [
    { "serverUrl": "https://*.untrusted.com/*" }
  ]
}
```
- Denylist takes absolute precedence over allowlist
- `allowedMcpServers: []` = complete lockdown (no MCP for users)
- Command matching is **exact** (args order matters)
- When allowlist has `serverUrl` entries → remote servers MUST match a URL pattern
- When allowlist has `serverCommand` entries → stdio servers MUST match a command

## SUBAGENTS + MCP
- Foreground subagents: inherit all MCP tools from parent
- Background subagents: MCP tools NOT available
- To preload MCP tool awareness into a subagent, use the `tools` field or rely on inheritance
