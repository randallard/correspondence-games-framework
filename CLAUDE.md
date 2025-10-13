# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Nature

This is a **PRP (Product Requirement Prompt) Framework** repository, not a traditional software project. The core concept: **"PRP = PRD + curated codebase intelligence + agent/runbook"** - designed to enable AI agents to ship production-ready code on the first pass.

## Core Architecture

### Command-Driven System

- **pre-configured Claude Code commands** in `.claude/commands/`
- Commands organized by function:
  - `PRPs/` - PRP creation and execution workflows
  - `development/` - Core development utilities (prime-core, onboarding, debug)
  - `code-quality/` - Review and refactoring commands
  - `rapid-development/experimental/` - Parallel PRP creation and hackathon tools
  - `git-operations/` - Conflict resolution and smart git operations

### Template-Based Methodology

- **PRP Templates** in `PRPs/templates/` follow structured format with validation loops
- **Context-Rich Approach**: Every PRP must include comprehensive documentation, examples, and gotchas
- **Validation-First Design**: Each PRP contains executable validation gates (syntax, tests, integration)

### AI Documentation Curation

- `PRPs/ai_docs/` contains curated Claude Code documentation for context injection
- `claude_md_files/` provides framework-specific CLAUDE.md examples

## Development Commands

### PRP Execution

```bash
# Interactive mode (recommended for development)
uv run PRPs/scripts/prp_runner.py --prp [prp-name] --interactive

# Headless mode (for CI/CD)
uv run PRPs/scripts/prp_runner.py --prp [prp-name] --output-format json

# Streaming JSON (for real-time monitoring)
uv run PRPs/scripts/prp_runner.py --prp [prp-name] --output-format stream-json
```

### Key Claude Commands

- `/prp-base-create` - Generate comprehensive PRPs with research
- `/prp-base-execute` - Execute PRPs against codebase
- `/prp-planning-create` - Create planning documents with diagrams
- `/prime-core` - Prime Claude with project context
- `/review-staged-unstaged` - Review git changes using PRP methodology

## Critical Success Patterns

### The PRP Methodology

1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance

### PRP Structure Requirements

- **Goal**: Specific end state and desires
- **Why**: Business value and user impact
- **What**: User-visible behavior and technical requirements
- **All Needed Context**: Documentation URLs, code examples, gotchas, patterns
- **Implementation Blueprint**: Pseudocode with critical details and task lists
- **Validation Loop**: Executable commands for syntax, tests, integration

### Validation Gates (Must be Executable)

```bash
# Level 1: Syntax & Style
ruff check --fix && mypy .

# Level 2: Unit Tests
uv run pytest tests/ -v

# Level 3: Integration
uv run uvicorn main:app --reload
curl -X POST http://localhost:8000/endpoint -H "Content-Type: application/json" -d '{...}'

# Level 4: Deployment
# mcp servers, or other creative ways to self validate
```

## Anti-Patterns to Avoid

- L Don't create minimal context prompts - context is everything - the PRP must be comprehensive and self-contained, reference relevant documentation and examples.
- L Don't skip validation steps - they're critical for one-pass success - The better The AI is at running the validation loop, the more likely it is to succeed.
- L Don't ignore the structured PRP format - it's battle-tested
- L Don't create new patterns when existing templates work
- L Don't hardcode values that should be config
- L Don't catch all exceptions - be specific

## Working with This Framework

### When Creating new PRPs

1. **Context Process**: New PRPs must consist of context sections, Context is King!
2.

### When Executing PRPs

1. **Load PRP**: Read and understand all context and requirements
2. **ULTRATHINK**: Create comprehensive plan, break down into todos, use subagents, batch tool etc check prps/ai_docs/
3. **Execute**: Implement following the blueprint
4. **Validate**: Run each validation command, fix failures
5. **Complete**: Ensure all checklist items done

## Correspondence Games Framework - Update Workflow

**CRITICAL**: This section applies to the Correspondence Games Framework (`/games/` and `/packages/core/`).

### Core-First Development Pattern

When making improvements or adding features to the games framework:

1. **STOP and ASK QUESTIONS**
   - Do NOT make updates immediately
   - Ask clarifying questions ONE AT A TIME
   - Wait for user response after each question
   - Build complete context before proceeding

2. **UPDATE FRAMEWORK CORE FIRST**
   - All patterns, components, and utilities go into `/packages/core/` FIRST
   - Update shared CSS in `/packages/core/src/styles/correspondence-games.css`
   - Add reusable React components/patterns to core
   - Document in `/packages/core/DARK_MODE_GUIDE.md` or `/packages/core/NEW_GAME_GUIDE.md`
   - Update `/packages/core/FRAMEWORK_UPDATES.md` with changes

3. **THEN PROPAGATE TO GAMES**
   - After core is updated and documented
   - Apply changes to existing games (`/games/tic-tac-toe/`, `/games/emoji-chain/`)
   - Ensure consistency across all games
   - Test each game after updates

4. **VALIDATE EVERYTHING**
   - Run tests in core package (`npm test` in `/packages/core/`)
   - Run tests in each updated game
   - Verify dev servers still work
   - Check dark mode in both light and dark modes

### Example Workflow

**Bad Pattern** ❌:
```
User: "The name form in tic-tac-toe looks better, update emoji-chain"
Assistant: *immediately updates emoji-chain/src/App.tsx*
```

**Good Pattern** ✅:
```
User: "The name form in tic-tac-toe looks better, update emoji-chain"
Assistant: "Let me understand the differences first. What specifically do you like better?"
User: "The styled form fields instead of prompt() dialogs"
Assistant: "Got it. Should I:
1. Extract the name form pattern into the core framework?
2. Make it reusable for all games?
3. Then update both games to use it?"
User: "Yes, update core first"
Assistant:
  - Creates shared form component/pattern in core
  - Documents in guides
  - Updates shared CSS if needed
  - Then applies to both games
```

### Questions to Ask Before Changes

Before implementing any improvement:

1. **What problem are we solving?**
   - Understand the user's actual need
   - Clarify which aspect they want improved

2. **Should this be in the framework core?**
   - If it's reusable across games → Yes, add to core
   - If it's game-specific → Keep in game directory

3. **What's the scope?**
   - Single game or all games?
   - UI change or logic change?
   - New feature or improvement?

4. **What needs to be documented?**
   - New patterns go in guides
   - CSS changes go in DARK_MODE_GUIDE.md
   - Component patterns go in NEW_GAME_GUIDE.md

5. **How will this affect existing games?**
   - Breaking changes?
   - Requires updates to all games?
   - Backwards compatible?

### Core Framework Files

When adding reusable patterns:

**Styles:**
- `/packages/core/src/styles/correspondence-games.css` - Shared CSS
- `/packages/core/src/styles/README.md` - Style documentation

**Documentation:**
- `/packages/core/DARK_MODE_GUIDE.md` - Dark mode patterns
- `/packages/core/NEW_GAME_GUIDE.md` - Game creation guide
- `/packages/core/FRAMEWORK_UPDATES.md` - Change log

**Code:**
- `/packages/core/src/lib/` - Shared utilities
- `/packages/core/__tests__/` - Core tests

### Red Flags

Stop and ask questions if:
- ❌ Making changes to a game without checking core first
- ❌ Duplicating code between games
- ❌ Adding styles that could be shared
- ❌ Creating patterns that aren't documented
- ❌ Not considering how other games will use this

### Success Criteria

A good framework update:
- ✅ Pattern is in core and documented
- ✅ All games can use it consistently
- ✅ Tests pass in core and all games
- ✅ Documentation is updated
- ✅ Changes are logged in FRAMEWORK_UPDATES.md
- ✅ Dark mode works (if UI change)
- ✅ No duplication across games

### Command Usage

- Read the .claude/commands directory
- Access via `/` prefix in Claude Code
- Commands are self-documenting with argument placeholders
- Use parallel creation commands for rapid development
- Leverage existing review and refactoring commands

## Project Structure Understanding

```
PRPs-agentic-eng/
.claude/
  commands/           # 28+ Claude Code commands
  settings.local.json # Tool permissions
PRPs/
  templates/          # PRP templates with validation
  scripts/           # PRP runner and utilities
  ai_docs/           # Curated Claude Code documentation
   *.md               # Active and example PRPs
 claude_md_files/        # Framework-specific CLAUDE.md examples
 pyproject.toml         # Python package configuration
```

Remember: This framework is about **one-pass implementation success through comprehensive context and validation**. Every PRP should contain the exact context for an AI agent to successfully implement working code in a single pass.
