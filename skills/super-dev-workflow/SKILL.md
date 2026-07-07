---
name: super-dev-workflow
description: "Dynamic Workflow variant of super-dev — runs all 14 stages as a deterministic JS workflow script with cached resume. Requires Claude Code v2.1.178+."
author: Jennings Liu
version: 2.5.52
license: MIT
---

<purpose>Run the super-dev 14-stage pipeline as a Dynamic Workflow. You resolve paths, call Workflow(), and relay the result. The workflow script handles ALL stage logic autonomously. Supports resume from failure via --resume flag.</purpose>

<dispatch mandatory="true">
  **Call Workflow() DIRECTLY.** Do NOT spawn any agent.

  Steps:
  1. Get REPO_PATH by running: `pwd`
  2. Extract flags from the user's message:
     - `--skip-worktree` → set skip_worktree=true, strip from message
     - `--skip=N,N,N` → set skip_stages="N,N,N", strip from message
     - `--resume=<runId>` → set resumeFromRunId, strip from message
     Remaining text = REQUEST.
  3. Call Workflow:
     ```
     Workflow({
       scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/super-dev.workflow.js",
       resumeFromRunId: "<runId if --resume flag present, otherwise omit this field>",
       args: {
         request: "<REQUEST>",
         plugin_root: "${CLAUDE_PLUGIN_ROOT}",
         repo_path: "<REPO_PATH>",
         skip_worktree: false,
         skip_stages: ""
       }
     })
     ```
     Replace `<REPO_PATH>` with the actual pwd result. Replace `<REQUEST>` with the user's message (flags stripped).
     `${CLAUDE_PLUGIN_ROOT}` is resolved by the harness automatically — use it as-is.
     If `--resume=<runId>` was present, include `resumeFromRunId` — completed agents replay from cache instantly.
  4. When the workflow completes, relay the result to the user.
     If it FAILS, include the runId in your response so the user can resume:
     "Workflow failed at Stage X. To resume: /super-dev-workflow --resume=<runId> <same request>"
</dispatch>

<constraints>
  <constraint name="NO agents">Do NOT spawn team-lead-workflow, team-lead, or any other agent. Call Workflow() yourself.</constraint>
  <constraint name="NO implementation">Do NOT write code, create files, or implement anything. The workflow script does all the work.</constraint>
  <constraint name="NO confirmation">Do NOT ask the user for confirmation. Resolve paths → call Workflow() → done.</constraint>
  <constraint name="RESUME on failure">When a workflow fails, ALWAYS include the runId in your response message so the user can resume with --resume=runId.</constraint>
</constraints>
