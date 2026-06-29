---
name: test-quality
description: Test quality heuristics from real reviewer feedback — eliminate redundant tests, assert observable outcomes, use proper test patterns
---

<purpose>Enforce test quality standards that real reviewers care about. Tests should prove behavior works, not prove Rust compiles. Every test must have an observable outcome that would fail if the code broke.</purpose>

<directives>
  <directive severity="critical" name="Observable Outcomes Only">Every test MUST assert an observable outcome that would FAIL if the code under test broke. A test that constructs objects but never asserts behavior is worthless. "Does not test anything" = immediate delete.</directive>
  <directive severity="critical" name="No Basic Language Tests">NEVER test basic Rust/language functionality (struct construction, enum variant matching, Option wrapping). If no function from the crate is called, the test is testing the compiler, not your code.</directive>
  <directive severity="high" name="Assert Error Content">Never use bare `is_err()` assertions. Assert the actual error variant, message, or relevant context. `assert!(result.is_err())` tells you nothing when it fails.</directive>
  <directive severity="high" name="Test Names Must Match Behavior">Test name MUST describe the observable behavior being verified. If the test "does not use `sync_once` or anything", rename or delete. Misleading test names are worse than no tests.</directive>
  <directive severity="high" name="No Duplicate Tests">Before writing a test, check if the same assertion already exists elsewhere. Consolidate overlapping tests. Ask: "if this test failed, would a DIFFERENT test also fail for the same reason?" If yes, one is redundant.</directive>
  <directive severity="high" name="Helper Factories for Setup">Extract repeated test setup into helper factories. Modify only the specific value being tested. Never copy-paste full config construction across tests.</directive>
  <directive severity="medium" name="Use localhost in Test URLs">All test URLs MUST use `localhost` or `127.0.0.1` to prevent accidental network calls to external services during test runs.</directive>
  <directive severity="medium" name="Use indoc for Multiline">Use the `indoc` crate (or equivalent) for multiline string literals in tests to maintain readable indentation.</directive>
  <directive severity="medium" name="Verify Correct Item">When testing collections/ordering, assert the SPECIFIC item (not just count). Verify the correct episode is downloaded, the correct track is at index N.</directive>
  <directive severity="medium" name="Static Content as Static Slices">Test data that never changes should be `static` slices or `const`, not heap-allocated in every test run.</directive>
  <directive severity="low" name="Spy for Never-Called">To verify something was NOT called, use a spy/counter pattern rather than relying on "no panic = success".</directive>
</directives>

<anti-patterns>
  <anti-pattern name="The Do-Nothing Test">Sets up elaborate state but asserts nothing meaningful. "Does a lot of setup but does not get any different result it wants to test."</anti-pattern>
  <anti-pattern name="The Compiler Test">Tests that a struct can be created or an enum has a variant. Tests basic Rust functionality which is guaranteed by the type system.</anti-pattern>
  <anti-pattern name="The Duplicate">Same assertion exists in another test. "Wasn't this literally a test above?"</anti-pattern>
  <anti-pattern name="The Misleading Name">Test named `test_sync_once_sends_commands` but never actually calls `sync_once` or sends commands.</anti-pattern>
  <anti-pattern name="The Optimistic Assert">Uses `assert!(result.is_ok())` or `assert!(result.is_err())` without checking WHAT succeeded or failed.</anti-pattern>
  <anti-pattern name="The Time Bomb">Uses static dates that may cause inconsistent ordering. If the date is static, insert order ≠ real behavior.</anti-pattern>
</anti-patterns>

<checklist>
  <check>Every test calls at least one function from the crate under test</check>
  <check>Every test has at least one assertion on an observable outcome</check>
  <check>Error tests assert specific error variant or message content</check>
  <check>No test duplicates assertions from another test</check>
  <check>Test URLs use localhost, not external domains</check>
  <check>Test name accurately describes what behavior is verified</check>
  <check>Repeated setup extracted to helper factory</check>
  <check>Collection tests verify specific items, not just counts</check>
</checklist>
