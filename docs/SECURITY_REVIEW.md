# Security Review (Agent Contract Studio)
Date: 2026-02-21

## Objective
A strict preflight security review prior to Vercel deployment and GitHub publication.

## Findings & Mitigations

**1. Secret Leakage & Hardcoded Keys**
- **Finding**: Scanned entire repository for `OPENAI_API_KEY`, API tokens, or hardcoded secrets. 
- **Result**: **None found**. Keys are strictly injected via `process.env.OPENAI_API_KEY`. The public instance will NOT have a developer key embedded.
- **Log Leakage**: Scanned for `console.log`, `console.warn`, and `console.error` that might accidentally leak stack traces or request bodies. No leakage points identified in API routes.

**2. `.gitignore` Configuration**
- **Finding**: Reviewed the root `.gitignore`.
- **Mitigation**: Confirmed `.env*`, `.vercel`, `test-results/`, and `playwright-report/` are correctly ignored to prevent accidental commit of local environments.

**3. API Endpoint Vulnerability**
- **Finding**: Audited `/api/import/github` for SSRF (Server-Side Request Forgery).
- **Mitigation**: The route parses the URL using strict Regex `github\.com\/([^/]+)\/([^/]+)` and internally reconstructs it to `raw.githubusercontent.com`. Arbitrary URLs cannot be fetched. A 5-second `AbortSignal.timeout` is in place to prevent resource exhaustion.
- **Finding**: Audited `/api/polish` and `/api/chatkit/session` for unauthorized access.
- **Mitigation**: Error handling gracefully returns standardized JSON (`(e as Error).message`) without dumping Node.js stack traces to the client.

**4. Public Demo Logic Enforcement**
- **Finding**: Ensured `PUBLIC_DEMO` toggle properly disabled LLM usage.
- **Result**: Confirmed. `src/app/api/polish/route.ts` hard-rejects with a 403 `POLISH_DISABLED` if `process.env.PUBLIC_DEMO === 'true'` or if `process.env.ENABLE_POLISH !== 'true'`.

## Conclusion
The application is secure for public deployment. **The public demo does not use the developer's personal OpenAI API key by default.**
