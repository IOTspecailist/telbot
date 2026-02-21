# Subagent Reference — telbot project

## WHAT IS A SUBAGENT
- Runs in its own context window with a custom system prompt, restricted tools, and independent permissions
- Claude auto-delegates based on matching `description` field; can also be explicitly requested
- Subagents CANNOT spawn other subagents (no nesting)
- Each invocation starts fresh; use `resume` to continue a prior run

## FILE LOCATIONS (priority: high → low)
| Scope | Path | When to use |
|---|---|---|
| Session only | `--agents` CLI flag (JSON) | Testing, one-off automation |
| Project | `.claude/agents/<name>.md` | Codebase-specific, commit to git |
| User (all projects) | `~/.claude/agents/<name>.md` | Personal reusable agents |
| Plugin | `<plugin>/agents/` | Distributed via plugin |

Same-name conflict → higher priority wins.

## FILE FORMAT
```markdown
---
name: my-agent            # required; lowercase + hyphens
description: "..."        # required; Claude reads this to decide when to delegate
tools: Read, Grep, Glob   # optional allowlist; inherits all if omitted
disallowedTools: Write    # optional denylist
model: haiku              # sonnet | opus | haiku | inherit (default: inherit)
permissionMode: default   # default | acceptEdits | dontAsk | bypassPermissions | plan
skills:                   # preload full skill content at startup
  - skill-name
hooks:                    # lifecycle hooks scoped to this agent
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---

System prompt body here. This is what the subagent receives instead of the full Claude Code system prompt.
```

## KEY FRONTMATTER FIELDS
- `name` + `description` — only required fields
- `tools` — allowlist (overrides inheritance); `disallowedTools` — denylist on top of allowlist
- `model: haiku` — use for cheap read-only tasks; `model: sonnet` for analysis
- `permissionMode: bypassPermissions` — skips all checks; use with extreme caution
- `skills` — injects full skill content at startup (subagents do NOT inherit parent skills)

## BUILT-IN SUBAGENTS (reference only, do not redefine)
| Name | Model | Tools | Purpose |
|---|---|---|---|
| Explore | haiku | read-only | codebase search/analysis |
| Plan | inherit | read-only | planning phase research |
| general-purpose | inherit | all | complex multi-step tasks |
| Bash | inherit | Bash | terminal commands |

## FOREGROUND vs BACKGROUND
- **Foreground** (default): blocks until done; permission prompts pass through; MCP available
- **Background**: concurrent; auto-denies unapproved permissions; MCP NOT available
- User can press `Ctrl+B` to background a running task
- Disable all background tasks: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`

## HOOKS IN SUBAGENT FRONTMATTER
Events available inside a subagent:
- `PreToolUse` — before tool call; exit 2 to block
- `PostToolUse` — after tool call
- `Stop` — when subagent finishes (auto-converted to `SubagentStop`)

Project-level hooks for subagent lifecycle (in `settings.json`):
- `SubagentStart` / `SubagentStop` — matcher = agent name

## DISABLING SUBAGENTS
```json
// .claude/settings.json
{
  "permissions": {
    "deny": ["Task(Explore)", "Task(my-custom-agent)"]
  }
}
```

## CONTEXT / TRANSCRIPT MANAGEMENT
- Transcripts stored at: `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`
- Auto-compaction at ~95% capacity; override: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50`
- Cleanup period: `cleanupPeriodDays` setting (default 30 days)
- Resume by asking Claude to "continue the previous work" — it uses the stored agent ID

## COMMON PATTERNS FOR THIS PROJECT (telbot)
- Use **read-only agents** (tools: Read, Grep, Glob) for code review / analysis tasks
- Use **Haiku model** for log parsing, schema inspection, cheap searches
- Delegate test runs to a subagent so verbose output stays out of main context
- Chain: `code-reviewer` → finds issues → `debugger` → fixes them
- Parallel research: spawn multiple agents for independent modules simultaneously

## EXAMPLE: minimal project subagent
```markdown
---
name: telbot-reviewer
description: Reviews telbot code changes for Telegram bot best practices. Use after modifying handlers or bot logic.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a code reviewer specialized in Telegram bot development (node-telegram-bot-api / telegraf).

When invoked:
1. Run `git diff` to see recent changes
2. Check handler logic, callback query handling, error boundaries
3. Verify environment variables are not hardcoded

Output: Critical issues → Warnings → Suggestions, each with file:line references.
```

## DECISION: SUBAGENT vs MAIN CONVERSATION vs SKILL
| Situation | Use |
|---|---|
| Task produces verbose output (test logs, DB queries) | Subagent |
| Need specific tool restrictions | Subagent |
| Frequent back-and-forth iteration needed | Main conversation |
| Reusable prompt/workflow running inline | Skill |
| Need nested delegation | Skills or chain from main |
