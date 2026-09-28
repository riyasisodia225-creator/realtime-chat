# Real-Time Chat (Socket.io) — Sprint 12 Track B

Features: P0 handshake + broadcast · P1 usernames (`[Name]: msg`) + typing indicator · P2 "General" / "Tech Support" rooms with strict isolation.

## Run locally
Terminal 1:
    cd server && npm install && npm start      # http://localhost:5000
Terminal 2:
    cd client && npm install && npm run dev    # http://localhost:3000
Open two tabs, use different names, and try both rooms.

## Deploy
**Backend (Render)** — Web Service, root dir `server`, build `npm install`, start `npm start`.
Env var: `CLIENT_ORIGIN=https://<your-frontend>.vercel.app`

**Frontend (Vercel)** — root dir `client`, framework Vite.
Env var: `VITE_SERVER_URL=https://<your-backend>.onrender.com`
Redeploy the frontend after setting the env var.

## Postman test
New → WebSocket Request → Socket.io mode → `http://localhost:5000`; listen to `chat_message`, emit `join_room` with `{"username":"Test","room":"General"}`.
