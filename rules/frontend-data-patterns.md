---
name: frontend-data-patterns
description: "Frontend data fetching & filtering — convention detection, chained filtering, pagination patterns, and UI state management"
---

<purpose>Enforce awareness of existing frontend data-fetching conventions before adding new patterns. Prevent the common AI agent failure mode of imposing "modern best practices" (SWR/React Query everywhere) that contradict the project's intentional conventions. Also covers production-proven filtering and pagination architectures. Derived from enterprise dashboard with 68 manual-fetch sites + 4 SWR hooks.</purpose>

<directives>
  <directive severity="critical" name="Detect Existing Convention First">Before implementing ANY new data fetch, scan the codebase for the existing pattern. Count call sites: `useEffect + fetch` vs `useSWR/useQuery` vs custom hooks. The DOMINANT pattern is the convention — follow it for consistency unless the spec explicitly says otherwise.</directive>
  <directive severity="critical" name="Never Impose SWR/React Query Globally">DO NOT migrate existing `useEffect + fetch` patterns to SWR/React Query unless explicitly requested. A project with 68 manual-fetch sites has an INTENTIONAL convention. SWR is only warranted when 2+ sibling components on the same page need the same data (cache dedup is the win).</directive>
  <directive severity="high" name="Chained Filtering Architecture">When implementing multi-filter UIs, apply PRIMARY filter first, then derive secondary filter OPTIONS from primary-filtered results. This prevents "no results" states in cascading dropdowns. Example: Topic filter → Status options derived from topic-filtered data.</directive>
  <directive severity="high" name="Page Reset on Filter Change">ALWAYS reset `currentPage = 1` when any filter changes. Common bug: user is on page 5, changes filter → only 2 pages of results → blank page. Implement via useEffect that watches filter state.</directive>
  <directive severity="medium" name="Debounced Search">Search inputs MUST debounce before triggering state updates. Standard: 300ms for client-side filtering, 500ms for server-side queries. Use `setTimeout` + cleanup in useEffect or a dedicated `useDebounce` hook.</directive>
  <directive severity="medium" name="Sprint/Timeframe Mutual Exclusivity">When two filter controls are logically exclusive (e.g., sprint picker vs. timeframe buttons), VISUALLY disable the inactive one (opacity-50 + pointer-events-none). Users must see which control is "winning."</directive>
  <directive severity="medium" name="Multi-Select Filter Pattern">For multi-select filter dropdowns: (1) Popover-based UI with search inside, (2) Apply/OK button to commit (don't filter on every click), (3) Show badge count for >2 selections, individual badges for ≤2, (4) Clear-all button.</directive>
  <directive severity="medium" name="Pagination Calculation">Client-side pagination: `totalPages = Math.ceil(filteredResults.length / pageSize)`, `paginatedResults = filtered.slice((page-1) * size, page * size)`. Page size options: [10, 50, 100]. Row numbering: `(currentPage - 1) * pageSize + index + 1`.</directive>
  <directive severity="low" name="SWR Hook Shape">When SWR IS warranted (shared reference data), follow this shape: `revalidateOnFocus: false`, `dedupingInterval: 60_000`, `errorRetryCount: 2`. Wrap in a named hook (`useKnownAreas()`) in `hooks/` directory.</directive>
</directives>

<decision-guide>
  <question>Is this data used by only ONE component?</question>
  <answer-yes>Use bare `useEffect + fetch`. Match existing 68 call sites.</answer-yes>
  <answer-no>
    <question>Do 2+ sibling components on the same page need it?</question>
    <answer-yes>Create a `useSomething()` SWR hook in `hooks/`. Follow existing hook shape.</answer-yes>
    <answer-no>Use bare `useEffect + fetch`. Separate pages with separate fetches is fine.</answer-no>
  </answer-no>
</decision-guide>

<anti-patterns>
  <anti-pattern name="SWR Everywhere Migration">Converting 68 working `useEffect + fetch` sites to SWR because "it's better." Net-negative: adds complexity, changes error handling, introduces caching bugs for data that doesn't need caching.</anti-pattern>
  <anti-pattern name="Filter Options from Unfiltered Data">Showing all possible status values in the Status dropdown even after Topic filter narrows results to items that only have 3 statuses. Confusing: user selects "Failed" but gets 0 results.</anti-pattern>
  <anti-pattern name="Pagination Without Reset">Changing filters without resetting to page 1. User sees blank table because they're on page 5 of a 2-page result set.</anti-pattern>
  <anti-pattern name="Immediate-Apply Multi-Select">Filter triggers on every checkbox click in multi-select dropdown. Causes N re-renders and flashing UI while user is still selecting.</anti-pattern>
</anti-patterns>

<checklist>
  <check>Existing data-fetching convention detected and documented</check>
  <check>New fetches follow the dominant pattern (not imposed "modern" alternative)</check>
  <check>Cascading filters apply primary filter before deriving secondary options</check>
  <check>Page resets to 1 on any filter change</check>
  <check>Search inputs debounced (300ms client, 500ms server)</check>
  <check>Mutually exclusive controls visually disable the inactive one</check>
  <check>Multi-select uses commit button (not immediate apply)</check>
</checklist>
