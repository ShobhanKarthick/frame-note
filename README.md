# 🎬 Video Reviewer

A collaborative video annotation tool that lets you add comments and drawings to videos. Annotations sync across users via a shared database — **without ever uploading the video itself**.

## ✨ Features

- 📝 **Time-based annotations** — Add comments at specific timestamps
- 🎨 **Drawing overlay** — Draw directly on video frames
- 👥 **Collaborative** — Share annotations across team members
- 🔒 **Privacy-first** — Videos stay local, only annotations are stored
- 🔗 **Smart linking** — Videos identified by content hash (same file = same annotations)

---

## 🛠️ Tech Stack

| Layer    | Technology                     |
|----------|--------------------------------|
| Frontend | React 19, Vite, Fabric.js      |
| Backend  | Express, Node.js               |
| Database | PostgreSQL                     |
| Runtime  | Bun (frontend), Node (backend) |

---

## 🚀 Local Development

### Prerequisites

- **Node.js** v20+
- **Bun** (for frontend) — [Install Bun](https://bun.sh)
- **PostgreSQL** running locally (or via Docker)

### 1️⃣ Start the Database

```bash
# Option A: Use Docker (recommended)
docker run -d \
  --name video_reviewer_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=video_reviewer \
  -p 5432:5432 \
  postgres:16-alpine

# Initialize schema
docker exec -i video_reviewer_db psql -U postgres -d video_reviewer < backend/src/db/schema.sql
```

```bash
# Option B: Use existing PostgreSQL
createdb video_reviewer
psql -d video_reviewer -f backend/src/db/schema.sql
```

### 2️⃣ Start the Backend

```bash
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:3000`

### 3️⃣ Start the Frontend

```bash
cd frontend
bun install
bun run dev
```

The app opens at `http://localhost:5173`

---

## 🐳 Production with Docker

Deploy everything with a single command:

```bash
docker compose up -d --build
```

This starts:
- 📦 **PostgreSQL** database with persistent volume
- 🚀 **App server** serving both API and frontend

Access the app at `http://localhost:3000`

### Useful Commands

```bash
# View logs
docker compose logs -f

# Stop everything
docker compose down

# Reset database (⚠️ destroys data)
docker compose down -v
docker compose up -d --build
```

---

## 📁 Project Structure

```
video-reviewer/
├── frontend/           # React + Vite app
│   ├── components/     # UI components
│   ├── services/       # API client
│   └── utils/          # Helper functions
├── backend/            # Express API server
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   └── db/         # Database connection & schema
├── docker-compose.yml  # Production orchestration
└── Dockerfile          # Multi-stage build
```

---

## 🔧 Environment Variables

| Variable      | Default         | Description              |
|---------------|-----------------|--------------------------|
| `PORT`        | `3000`          | Backend server port      |
| `DB_HOST`     | `localhost`     | PostgreSQL host          |
| `DB_PORT`     | `5432`          | PostgreSQL port          |
| `DB_NAME`     | `video_reviewer`| Database name            |
| `DB_USER`     | `postgres`      | Database user            |
| `DB_PASSWORD` | `postgres`      | Database password        |

---

## 📡 API Endpoints

| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| POST   | `/api/users`                      | Create user           |
| GET    | `/api/users/:id`                  | Get user              |
| PATCH  | `/api/users/:id`                  | Update user           |
| GET    | `/api/annotations/video/:videoId` | Get video annotations |
| POST   | `/api/annotations`                | Create annotation     |
| DELETE | `/api/annotations/:id`            | Delete annotation     |
| GET    | `/api/annotations/export/:videoId`| Export as JSON        |
| POST   | `/api/annotations/import`         | Import from JSON      |

---

## 💡 How Video Identification Works

Videos are identified by their **SHA-256 content hash**, not filename. This means:

- ✅ Same video file → Same annotations (even on different machines)
- ✅ Renamed file → Still matches
- ❌ Re-encoded video → Different hash, won't match

---

## 📄 License

MIT
