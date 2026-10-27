# Rehearse Production Deployment Guide

This guide details the deployment procedures for Rehearse across both supported production configurations:
1. **Option A:** Single VPS with Docker Compose (Recommended for self-hosted instances).
2. **Option B:** Cloud Hybrid Deployment (Vercel + Railway + Neon + LiveKit Cloud).

---

## Option A: Single VPS Deployment with Docker Compose

### 1. Server Requirements
- **OS:** Ubuntu 22.04 LTS or 24.04 LTS
- **Hardware Minimum:** 4 vCPU, 8 GB RAM, 25 GB NVMe SSD
- **Network Ports:**
  - `80` (HTTP) & `443` (HTTPS)
  - `7880` (LiveKit TCP WebRTC signaling)
  - `50000–50100/udp` (LiveKit WebRTC media streams)

### 2. Initial Setup
```bash
# Update system & install Docker
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git

# Clone repository
git clone <YOUR_GIT_REPO_URL> rehearse
cd rehearse

# Configure production environment
cp .env.example .env
nano .env
```

### 3. Database Migration & Seed
```bash
pnpm install
pnpm --filter @rehearse/web prisma migrate deploy
pnpm --filter @rehearse/web prisma db seed
```

### 4. Build & Launch Containers
```bash
docker compose -f docker-compose.yml up -d --build
```

---

## Option B: Managed Cloud Hybrid Deployment

| Component | Target Platform | Service in Repo |
| :--- | :--- | :--- |
| **Frontend & API** | [Vercel](https://vercel.com) | `apps/web` |
| **Database** | [Neon.tech](https://neon.tech) | `apps/web/prisma` |
| **WebRTC Media** | [LiveKit Cloud](https://cloud.livekit.io) | Global Cloud Mesh |
| **Microservices** | [Railway.app](https://railway.app) | `services/ai-engine`, `services/compiler` |
| **Voice Agent** | [Railway.app](https://railway.app) | `interview-bot` |

### Step 1: Provision Neon Database
1. Create a project at [Neon.tech](https://neon.tech).
2. Retrieve the pooled connection string and run migrations locally:
   ```bash
   DATABASE_URL="<NEON_URL>" pnpm --filter @rehearse/web prisma migrate deploy
   DATABASE_URL="<NEON_URL>" pnpm --filter @rehearse/web prisma db seed
   ```

### Step 2: Provision LiveKit Cloud
1. Create a project on [LiveKit Cloud](https://cloud.livekit.io).
2. Copy `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`.

### Step 3: Deploy Microservices & Agent on Railway
Deploy three services from the same repo on [Railway.app](https://railway.app):
1. **`ai-engine`:** Root `services/ai-engine`, start command `pnpm --filter @rehearse/ai-engine start`, port `4001`.
2. **`compiler`:** Root `services/compiler`, start command `pnpm --filter @rehearse/compiler start`, port `4002`.
3. **`interview-bot`:** Root `interview-bot`, start command `python agent.py start`. Supply `LIVEKIT_*` variables and `BACKEND_URL` pointing to your Vercel URL.

### Step 4: Deploy Web Application on Vercel
1. Import repository to [Vercel](https://vercel.com) with Root Directory set to `apps/web`.
2. Populate environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `LIVEKIT_*`, `AI_ENGINE_URL`, `COMPILER_SERVICE_URL`, `INTERNAL_API_KEY`, and `GROQ_API_KEY`.
3. Deploy.
