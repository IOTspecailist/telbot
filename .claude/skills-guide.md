# Skills Reference — telbot project

## WHAT IS A SKILL
- A `SKILL.md` file that extends Claude's behavior with custom instructions
- Creates a `/skill-name` slash command automatically
- Claude can load skills automatically when relevant (based on `description`), or you invoke directly
- Runs **inline in main conversation** by default; use `context: fork` to isolate in a subagent
- Compatible with `.claude/commands/` (legacy); skills take precedence on name conflict

## FILE LOCATIONS (priority: high → low)
| Scope | Path | Applies to |
|---|---|---|
| Enterprise | Managed settings | All org users |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin is enabled |

Plugin skills use `plugin-name:skill-name` namespace — no conflicts with other levels.

## SKILL DIRECTORY STRUCTURE
```
my-skill/
├── SKILL.md          # required entrypoint
├── template.md       # optional: template for Claude to fill in
├── examples/
│   └── sample.md     # optional: example showing expected output
└── scripts/
    └── helper.sh     # optional: script Claude can execute
```
Keep `SKILL.md` under 500 lines — move large reference material to supporting files.

## SKILL.md FORMAT
```yaml
---
name: skill-name                    # optional; defaults to directory name; lowercase + hyphens (max 64 chars)
description: "..."                  # recommended; Claude uses this to auto-invoke
argument-hint: "[issue-number]"     # optional; shown in autocomplete
disable-model-invocation: true      # optional; prevents Claude from auto-loading (user must type /name)
user-invocable: false               # optional; hides from / menu (Claude-only invocation)
allowed-tools: Read, Grep, Glob     # optional; limits tools when skill is active
model: sonnet                       # optional; model for this skill
context: fork                       # optional; run in isolated subagent
agent: Explore                      # optional; which subagent type (requires context: fork)
hooks:                              # optional; scoped to skill lifecycle
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/check.sh"
---

Skill instructions here. Use $ARGUMENTS for user-supplied input.
```

## INVOCATION CONTROL MATRIX
| Frontmatter | You can invoke (/name) | Claude auto-invokes | In Claude's context |
|---|---|---|---|
| (default) | Yes | Yes | Description only; full content on invoke |
| `disable-model-invocation: true` | Yes | No | Not in context at all |
| `user-invocable: false` | No | Yes | Description only; full content on invoke |

Use `disable-model-invocation: true` for: `/deploy`, `/commit`, `/send-message` — side-effect tasks where timing matters.
Use `user-invocable: false` for: background knowledge skills (e.g., `legacy-system-context`).

## STRING SUBSTITUTIONS IN SKILL CONTENT
| Variable | Value |
|---|---|
| `$ARGUMENTS` | Everything typed after `/skill-name` |
| `${CLAUDE_SESSION_ID}` | Current session ID (logging, session-specific files) |

If `$ARGUMENTS` not present in content → appended as `ARGUMENTS: <value>` at end.

## DYNAMIC CONTEXT INJECTION
Use `` !`command` `` syntax to run shell commands **before** the skill is sent to Claude:
```markdown
## Live data
- PR diff: !`gh pr diff`
- Changed files: !`gh pr diff --name-only`
```
Commands execute first; output replaces the placeholder. Claude only sees the rendered result.

## RUNNING IN A SUBAGENT (context: fork)
```yaml
---
name: deep-research
context: fork
agent: Explore          # Explore | Plan | general-purpose | custom-agent-name
---

Research $ARGUMENTS:
1. Find relevant files
2. Read and analyze
3. Summarize with file:line references
```
- Skill content becomes the subagent's task prompt
- Does NOT have access to main conversation history
- `agent` field picks system prompt + tools (defaults to `general-purpose` if omitted)
- Only useful for skills with explicit task instructions — not for pure reference/convention content

## SKILL vs SUBAGENT (when to use which)
| Need | Use |
|---|---|
| Reusable prompt in main conversation | Skill (inline) |
| Isolated execution with no conversation history | Skill with `context: fork` |
| Specialized agent with custom system prompt + tool limits | Subagent |
| Subagent that needs domain knowledge | Subagent with `skills:` field (preloads full skill content) |

## PRELOADING SKILLS INTO SUBAGENTS
In a subagent `.md` file:
```yaml
---
name: api-developer
skills:
  - api-conventions
  - error-handling-patterns
---
Implement API endpoints following preloaded conventions.
```
Full skill content is injected at subagent startup. Subagents do NOT inherit parent skills automatically.

## RESTRICTING CLAUDE'S SKILL ACCESS
```
# In /permissions deny list:
Skill                   # block all skills
Skill(deploy)           # exact match
Skill(deploy:*)         # prefix match (skill + any args)
```

## SKILLS CONTEXT BUDGET
- Skill descriptions loaded into context for Claude awareness
- Default budget: 15,000 characters
- Warning shown in `/context` if skills exceed budget
- Override: `SLASH_COMMAND_TOOL_CHAR_BUDGET=30000`

## EXAMPLE SKILLS FOR TELBOT PROJECT

### Inline reference skill (auto-invoked by Claude)
```yaml
---
name: telbot-conventions
description: Telegram bot coding conventions for this project. Use when writing or reviewing bot handlers, commands, or callback queries.
user-invocable: false
---

## Bot handler conventions
- All command handlers in `src/handlers/`; filename = command name (e.g., `start.js`)
- Callback query data format: `action:param1:param2`
- Always call `ctx.answerCbQuery()` at start of callback handlers
- Error handling: wrap in try/catch, log with `logger.error`, send user-facing message

## Environment variables (never hardcode)
- `BOT_TOKEN` — Telegram bot token
- `DATABASE_URL` — PostgreSQL connection string
```

### Task skill (user-invoked only)
```yaml
---
name: add-command
description: Scaffold a new Telegram bot command with handler and registration
disable-model-invocation: true
argument-hint: "<command-name>"
---

Create a new Telegram bot command: $ARGUMENTS

1. Create `src/handlers/$ARGUMENTS.js` with:
   - Handler function exported as default
   - JSDoc with command description and params
   - try/catch with proper error handling

2. Register in `src/bot.js` under the commands section

3. Add to `src/commands/index.js` export list

4. Create test at `tests/handlers/$ARGUMENTS.test.js`
```

### Fork skill (isolated subagent research)
```yaml
---
name: audit-bot
description: Full security and quality audit of the telbot codebase
context: fork
agent: Explore
disable-model-invocation: true
---

Audit the Telegram bot codebase:

1. Find all files that handle user input (messages, commands, callbacks)
2. Check for: hardcoded tokens, unvalidated input, missing error handling, exposed sensitive data in logs
3. Check dependency versions in package.json for known vulnerabilities
4. Report findings as: [CRITICAL] / [WARNING] / [INFO] with file:line references
```

## TROUBLESHOOTING
| Problem | Fix |
|---|---|
| Skill not triggering | Check description has matching keywords; try `/skill-name` direct invoke |
| Skill triggers too often | Make description more specific; add `disable-model-invocation: true` |
| Skills not in Claude's context | Run `/context` to check budget; increase `SLASH_COMMAND_TOOL_CHAR_BUDGET` |
| New skill not loading | Restart session or use `/agents` to reload (skills load at session start) |
