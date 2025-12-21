# 🎬 Frame Note

A collaborative video annotation tool that lets you add comments and drawings to videos. Annotations sync across users via a shared database — **without ever uploading the video itself**.

## ✨ Features

- 📝 **Time-based annotations** — Add comments at specific timepoint. Comments can contain any attachments (images and PDF)
  - Select a timerange like below and comment
    <img width="2940" height="1676" alt="image" src="https://github.com/user-attachments/assets/6c97d597-aecf-414f-8063-c5ea97131183" />
  - Or pick a timestamp and comment. You can add an attachment to any comment as shown below
    <img width="2940" height="1676" alt="image" src="https://github.com/user-attachments/assets/e5b73f2a-be1c-4c5c-abe8-445b0af7b1f8" />


- 🎨 **Drawing overlay** — Draw directly on video frames
  <img width="2940" height="1674" alt="image" src="https://github.com/user-attachments/assets/8a1a5683-056e-4283-9554-9fb2c97625bf" />

- 👥 **Collaborative** — Share annotations across team members.
- 🔒 **Privacy-first** — Videos stay local, only annotations are stored
- 🔗 **Smart linking** — Videos identified by content hash (same file = same annotations)

---

## 💡 How Video Identification Works

Videos are identified by their **SHA-256 content hash**, not filename. This means:

- ✅ Same video file → Same annotations (even on different machines)
- ✅ Renamed file → Still matches
- ❌ Re-encoded video → Different hash, won't match

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
POSTGRES_PORT=5432 docker-compose up -d postgres
```

```bash
# Option B: Use existing PostgreSQL
createdb frame_note
psql -d frame_note -f backend/src/db/schema.sql
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
frame-note/
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
| `DB_NAME`     | `frame_note`    | Database name            |
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

## 📄 License

MIT
