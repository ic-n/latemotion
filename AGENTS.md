# LateMotion

LateMotion makes it easy to automate real websites with Playwright and add visual animations through injected JavaScript, producing motion videos of existing pages.

## Product direction

- Use TypeScript and Playwright. Users are expected to clone or fork the project and write TypeScript scenarios through a simple SDK. The scenario file extension is not decided yet.
- Current scope is the runner and supporting SDK. Authoring specific scenarios is outside this scope.
- Launch a visible browser and allow time for manual preparation, including logins and CAPTCHAs. Pressing `p` while the browser is focused starts scenario playback.
- Inject a purely visual cursor overlay using `assets/cursor.png`, `assets/pointer.png`, and the other supplied cursor assets. Support movement from a side of the viewport toward an element and switching to the pointer on hover. Playwright performs the actual clicks, navigation, and other interactions.
- Video capture is handled manually with macOS screen recording tools. The runner does not capture video.
- Keep the TUI simple, similar to a generic test runner: show the current scenario step, progress, and results.
- Cover failure paths and write useful failure details locally to `./logs/trace.txt`; structured JSON is acceptable if it better suits the data.

## Working approach

- Keep implementations straightforward, maintainable, and within the agreed scope. Avoid speculative abstractions and unrequested features.
- Clarify significant choices and present findings and the proposed design before editing. After each substantial part, report progress and proposed next actions, then wait for explicit instruction.
- When asking a question, stop and wait for the answer; do not proceed on an assumed answer.
- Preserve unrelated user changes. Verify current behavior in source.
- Do not add code comments; express intent through names, types, and structure. Preserve legally or operationally required comments.
- Use `rg` and `rg --files` for repository searches. Do not recursively search broad paths such as `/` or the user's home directory.
- Verify code changes with exactly `task check`. Failures, including pre-existing failures, are within scope to fix; checkpoint and approval rules still apply.
