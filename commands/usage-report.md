---
name: usage-report
description: View skill and agent usage statistics for the super-dev plugin
---

<platform-paths>
  PLUGIN_ROOT:
    claude: ${CLAUDE_PLUGIN_ROOT}
    gemini: ${extensionPath}
  PLUGIN_DATA:
    claude: ${CLAUDE_PLUGIN_DATA}
    gemini: ${extensionPath}/.data
  Use whichever value resolved to an actual path (not a literal variable name).
</platform-paths>

<purpose>Read `${PLUGIN_DATA}/global/stats.json` and `${PLUGIN_DATA}/global/usage.log` to display total invocations, top skills, top agents, and recent activity.</purpose>

<usage>/super-dev:usage-report</usage>

<output name="What It Displays">
  Total invocations: How many times skills and agents have been used. Top skills: Most frequently used, sorted by count. Top agents: Most frequently used, sorted by count. Recent activity: Last 10 invocations from usage.log.
</output>

<constraints>
  <constraint>Usage data stored in `${PLUGIN_DATA}/global/` — persists across sessions and projects</constraint>
  <constraint>Stats updated automatically via PreToolUse hook</constraint>
  <constraint>No sensitive data collected — only tool names and timestamps</constraint>
</constraints>
