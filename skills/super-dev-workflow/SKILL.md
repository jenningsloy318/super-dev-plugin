---
name: super-dev-workflow
description: "Dynamic Workflow variant of super-dev — runs all 14 stages as a deterministic JS workflow script with cached resume. Requires Claude Code v2.1.178+."
author: Jennings Liu
version: 2.5.53
license: MIT
---

<purpose>Run the super-dev 14-stage pipeline as a Dynamic Workflow. You resolve paths, call Workflow(), and relay the result. The workflow script handles ALL stage logic autonomously. Automatically resumes from last failure if a prior run exists.</purpose>

<dispatch mandatory="true">
  **Call Workflow() DIRECTLY.** Do NOT spawn any agent.

  Steps:
  1. Get REPO_PATH by running: `pwd`
  2. Extract flags from the user's message:
     - `--skip-worktree` → set skip_worktree=true, strip from message
     - `--skip=N,N,N` → set skip_stages="N,N,N", strip from message
     - `--resume=<runId>` → set resumeFromRunId explicitly, strip from message
     - `--fresh` → force fresh run (ignore any prior runId), strip from message
     Remaining text = REQUEST.
  3. Check for prior run to auto-resume:
     If NO --resume and NO --fresh flag:
       Run: `cat .worktree/*/.last-workflow-run-id 2>/dev/null || cat docs/specifications/*/.last-workflow-run-id 2>/dev/null`
       If output is non-empty and looks like a runId (starts with "wf_"):
         Set resumeFromRunId to that value.
         Log: "Auto-resuming from prior run <runId>"
  4. Call Workflow:
     ```
     Workflow({
       scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/super-dev.workflow.js",
       resumeFromRunId: "<runId if found/provided, otherwise OMIT this field entirely>",
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
     OMIT resumeFromRunId entirely if no prior run found and no --resume flag (do NOT pass null or empty string).
  5. When the workflow completes or fails:
     - Write the runId to `<REPO_PATH>/.worktree/<spec-name>/.last-workflow-run-id` (or spec-dir if worktree path is known)
     - If FAILED: tell the user "To retry fresh (ignoring cache): /super-dev-workflow --fresh <request>"
     - If SUCCEEDED: relay result normally
</dispatch>

<constraints>
  <constraint name="NO agents">Do NOT spawn team-lead-workflow, team-lead, or any other agent. Call Workflow() yourself.</constraint>
  <constraint name="NO implementation">Do NOT write code, create files, or implement anything. The workflow script does all the work.</constraint>
  <constraint name="NO confirmation">Do NOT ask the user for confirmation. Resolve paths → call Workflow() → done.</constraint>
  <constraint name="AUTO-RESUME">Always check for prior runId before starting fresh. Only skip resume if user passes --fresh.</constraint>
</constraints>
