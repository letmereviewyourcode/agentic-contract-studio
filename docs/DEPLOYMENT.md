# Deployment Guide

> **Status**: This document describes HOW to deploy. Deployment has NOT been executed yet.

---

## Local Development

```bash
# Install
npm install

# Run dev server (Turbopack)
npm run dev
# → http://localhost:3000

# Optional: enable LLM polish
cp .env.example .env.local
# Edit .env.local:
#   OPENAI_API_KEY=sk-...
#   ENABLE_POLISH=true
```

### Local Demo Mode

For demos where you want polish enabled:
```
OPENAI_API_KEY=sk-...
ENABLE_POLISH=true
```

For demos where you want polish disabled (simulating public):
```
PUBLIC_DEMO=true
```

---

## Vercel (Recommended for Public Demo)

### Prerequisites
- GitHub repo (private recommended)
- Vercel account linked to GitHub

### Steps (EXECUTED: GitHub Push)

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "feat: initial commit of Agent Contract Studio v0.1.0"
   gh repo create agentic-contract-studio --public --source=. --remote=origin --push
   ```
   *Note: This repository is now live at `https://github.com/letmereviewyourcode/agentic-contract-studio`*

2. Import in Vercel:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import the GitHub repo
   - Framework: **Next.js** (auto-detected)
   - Build command: `npm run build`
   - Output directory: `.next`

3. Environment variables in Vercel dashboard:
   ```
   PUBLIC_DEMO=true        # Forces Central Polish to require BYOK Key
   # DO NOT set OPENAI_API_KEY on public deployments
   # DO NOT set OPENAI_API_KEY on public deployments
   ```

4. Deploy → Vercel assigns a URL like `agent-contract-studio.vercel.app`

### Vercel Security Notes

| Variable | Set on Vercel? | Why |
|---|---|---|
| `PUBLIC_DEMO` | ✅ `true` | Forces polish endpoint to require BYOK (400) |
| `OPENAI_API_KEY` | ❌ Never on public | Avoid key abuse |
| `ENABLE_POLISH` | ❌ Not needed | PUBLIC_DEMO overrides |

---

## Cloud Run (Future)

For internal/enterprise deployments where polish is needed:

### Steps (NOT YET EXECUTED)

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:22-alpine
   WORKDIR /app
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json ./
   COPY --from=builder /app/public ./public
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. Deploy:
   ```bash
   gcloud run deploy agent-contract-studio \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "OPENAI_API_KEY=sk-...,ENABLE_POLISH=true"
   ```

3. For internal-only access, remove `--allow-unauthenticated` and use IAM.

---

## Environment Variables Reference

| Variable | Local Dev | Vercel (Public) | Cloud Run (Internal) |
|---|---|---|---|
| `OPENAI_API_KEY` | Optional | ❌ Never | ✅ Set in secrets |
| `ENABLE_POLISH` | `true` | ❌ Not needed | `true` |
| `PUBLIC_DEMO` | `false` | `true` | `false` |
| `E2E` | — | — | — |

---

## Next Steps

- [ ] Create GitHub repo
- [ ] Push initial commit
- [ ] Deploy to Vercel with `PUBLIC_DEMO=true`
- [ ] Add GitHub Actions CI (Playwright on PR)
- [ ] Add license file
- [ ] Add badges + screenshots to README
