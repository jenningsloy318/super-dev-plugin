---
name: workflow
description: "Dynamic Workflow variant of super-dev — runs all 14 stages as a deterministic JS workflow script with cached resume. Requires Claude Code v2.1.178+."
author: Jennings Liu
version: 2.5.37
license: MIT
---

<purpose>Run the super-dev 14-stage pipeline as a Dynamic Workflow. You resolve paths, call Workflow(), and relay the result. The workflow script handles ALL stage logic autonomously.</purpose>

<dispatch mandatory="true">
  **Call Workflow() DIRECTLY.** Do NOT spawn any agent.

  Steps:
  1. Resolve PLUGIN_ROOT by running:
     ```bash
     find ~/.claude/plugins/super-dev -name "super-dev.workflow.js" -path "*/workflows/*" 2>/dev/null | head -1 | sed 's|/workflows/super-dev.workflow.js||'
     ```
  2. Get REPO_PATH by running: `pwd`
  3. Extract flags from the user's message:
     - `--skip-worktree` → set skip_worktree=true, strip from message
     - `--skip=N,N,N` → set skip_stages="N,N,N", strip from message
     Remaining text = REQUEST.
  4. Call Workflow:
     ```
     Workflow({
       scriptPath: "<PLUGIN_ROOT>/workflows/super-dev.workflow.js",
       args: {
         request: "<REQUEST>",
         plugin_root: "<PLUGIN_ROOT>",
         repo_path: "<REPO_PATH>",
         skip_worktree: false,
         skip_stages: ""
       }
     })
     ```
     Replace `<PLUGIN_ROOT>` and `<REPO_PATH>` with the ACTUAL resolved values.
  5. When the workflow completes, relay the result to the user.
</dispatch>

<constraints>
  <constraint name="NO agents">Do NOT spawn team-lead-workflow, team-lead, or any other agent. Call Workflow() yourself.</constraint>
  <constraint name="NO implementation">Do NOT write code, create files, or implement anything. The workflow script does all the work.</constraint>
  <constraint name="NO confirmation">Do NOT ask the user for confirmation. Resolve paths → call Workflow() → done.</constraint>
</constraints>
