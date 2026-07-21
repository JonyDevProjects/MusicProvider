# workflow
- After completing implementations and validations, automatically create taste learnings from project decisions made during the session. Confidence: 0.85
- After running tests that required starting external services (Node.js backend, iproxy, emulators, etc.), automatically verify and stop all services that were started for those tests. Confidence: 0.90
- Persist implementation decisions and testing outcomes in Engram after finishing work, ensuring coherence with taste learnings and avoiding memory conflicts. Confidence: 0.85
- For complex tasks: Follow a structured workflow from plan to implementation step by step. Confidence: 0.85
- Before starting complex tasks: Create a new branch to avoid introducing noise into the main branch. Confidence: 0.70
- During test runs that involve external devices or services, when a repetitive error pattern emerges across attempts, proactively ask the user if they need to perform a check on the device or external application (e.g., Developer Mode, Developer Trust, USB connection, Wi-Fi) before retrying. Confidence: 0.85
- Use GitFlow with `develop` as the integration branch, `feature/*` for new features, `bugfix/*` for bug fixes, `hotfix/*` for urgent production patches, and `release/*` for release preparation; `main` is production-only. Confidence: 0.80
