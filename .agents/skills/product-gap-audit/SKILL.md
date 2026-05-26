---
name: product-gap-audit
description: 'Use this skill with a short list of reviewed OpenSpec/Spectra changes before AI implementation, for example: product-gap-audit 1.change-a 2.change-b. It converts existing changes into copy-pasteable spectra-apply prompts with AI-proof MVP contracts, verification, code review, bug fixing, and zh-TW commit requirements.'
---

# Product Gap Audit

Use this skill **after the change/spec exists** and **before coding/apply**.

It is not a second requirement review. Do not ask the user to restate the same requirement.

The job is to convert the existing OpenSpec/Spectra change into a copy-pasteable `spectra-apply` prompt with an AI-proof implementation contract.

## Short usage

The user can invoke this skill with only change names:

```text
product-gap-audit
1. change-a
2. change-b
3. change-c
```

Or inline:

```text
product-gap-audit 1.change-a 2.change-b 3.change-c
```

When changes are listed, process those changes in the given order unless the artifacts show a dependency problem. Do not ask the user to explain each change again.

## Why this exists

AI implementation optimizes for explicit artifacts:

- proposal text
- spec requirements
- tasks
- tests
- validation output

If those artifacts do not explicitly block bad shortcuts, AI can produce work that is technically "done" but product-wrong.

This gate prevents that by deriving concrete implementation constraints from the already-reviewed change.

## Default behavior

Do not ask the user again by default.

Instead:

1. Read the existing change artifacts.
2. Infer the intended MVP from them.
3. Inspect the current implementation enough to know the real route and UI surface.
4. Generate implementation guardrails.
5. Produce one apply-ready prompt per change.
6. Only ask the user if the MVP cannot be inferred or artifacts conflict.

## Required contract before coding

For each change, derive this short contract from the existing artifacts:

```text
MVP outcome:
On [route/screen], the user can [visible or operational result].

Implementation must include:
- [route integration]
- [visible UI/control]
- [data persistence/runtime effect if relevant]
- [adjacent same-class items included]

Not complete if:
- [AI shortcut that would be product-wrong]
- [another wrong-but-tempting implementation]

Demo check:
1. Open [route].
2. Perform [user action].
3. Verify [visible result].
```

If the contract cannot be filled from the existing change and codebase, stop and ask one specific question.

## Final output format

The final output MUST be a numbered list of copy-pasteable prompts, one per change, in the same order the user provided.

Each prompt MUST be ready for a new session to run with `spectra-apply` and MUST include:

- the change name
- the MVP contract
- `Not complete if` clauses
- the demo check
- verification requirements
- code review requirement
- bug-fix loop requirement
- Traditional Chinese commit requirement
- a next-change gate that forbids starting the next change before review, fixes, verification, and commit are complete

Use this format:

```text
1. <change-name>

spectra-apply <change-name>

Before coding:
- Read the existing OpenSpec/Spectra artifacts for <change-name>.
- Use this MVP contract as the implementation gate.

MVP outcome:
On [route/screen], the user can [visible or operational result].

Implementation must include:
- [route integration]
- [visible UI/control]
- [data persistence/runtime effect if relevant]
- [adjacent same-class items included]

Not complete if:
- [AI shortcut that would be product-wrong]
- [another wrong-but-tempting implementation]

Demo check:
1. Open [route].
2. Perform [user action].
3. Verify [visible result].

Completion requirements:
- Run affected tests and Spectra validation for this change.
- Run a code-review pass focused on bugs, regressions, missing tests, route visibility, and MVP drift.
- Fix any review findings or bugs before claiming completion.
- Re-run affected verification after fixes.
- Commit only files related to this change with a Traditional Chinese commit message.
- Do not start the next change until this change has passed verification, code review, bug fixes, re-verification, and zh-TW commit.
- Final report must say either:
  - Verified: On [route], the user can now [MVP outcome].
  - Not product-verified yet: [reason].
```

Do not output generic advice after the prompts unless there is a blocking ambiguity.

## AI shortcuts to block

Before coding, explicitly block shortcuts that the written change could otherwise allow:

- standalone page instead of required same-route integration
- component exists but is not reachable
- schema/data added but no editor control
- only examples implemented while the whole product class is expected
- test passes but canvas/inspector/playback route shows no useful result
- old spec direction preserved even though the current change implies a different flow
- tasks checked without browser or route-level verification

Add these as `Not complete if` clauses before implementation.

## How to use existing OpenSpec/Spectra artifacts

Read, do not re-litigate:

- `openspec/changes/<change>/proposal.md`
- `openspec/changes/<change>/design.md`
- `openspec/changes/<change>/tasks.md`
- `openspec/changes/<change>/specs/**/spec.md`

Then map each task to the MVP contract.

If a task does not support the MVP outcome, treat it as suspect:

- remove it if it is speculative
- move it to a later change if it is real but not MVP
- rewrite it if it hides the user-visible result

## Project-specific guardrails

Keep the skill generic. Apply project-specific guardrails only when the change artifacts or implementation surface clearly match them.

For this repository, when a change touches `display-pages/editor`, verify the contract includes the intended route and UI surface:

- `/display-pages/editor`, not a standalone page, unless explicitly requested
- canvas-visible result when visual editing is involved
- right-side property inspector control when property editing is involved
- background images, card icons, ornaments, and decorative primitives when the class is replaceable visual assets
- source connection fields when data/source editing is involved
- header/footer/shell guide visibility when shell decorations are involved

For other repositories or product areas, derive equivalent guardrails from the local artifacts and codebase instead of reusing the `display-pages/editor` list.

## Implementation rule

While coding, every meaningful task must trace back to the contract:

```text
Task -> MVP outcome / Implementation must include / Not complete if / Demo check
```

If the implementation discovers the contract is wrong or incomplete, stop and update the Spectra change before continuing.

## Completion rule

Do not report complete from `spectra validate`, checked tasks, or tests alone.

When multiple changes are provided, the generated prompts MUST make the boundary between changes explicit:

```text
Between-change gate:
- Stop after this change.
- Review the diff before starting the next change.
- Fix review findings and bugs.
- Re-run affected verification.
- Commit only this change with a Traditional Chinese commit message.
- Only after the commit succeeds may the next change begin.
```

Each `spectra-apply` prompt must require this completion sequence:

1. Implement only the current change.
2. Run affected tests and Spectra validation.
3. Review the implemented diff with a code-review mindset.
4. Fix bugs, regressions, missing tests, and MVP drift.
5. Re-run affected verification.
6. Commit only files related to the current change with a Traditional Chinese commit message.
7. Stop; do not begin the next change until the commit succeeds.
8. Report completion only in this form:

```text
Verified: On [route], the user can now [MVP outcome].
Evidence: [test/browser/code evidence].
```

If browser or route verification was not run, say:

```text
Not product-verified yet: [reason].
```
