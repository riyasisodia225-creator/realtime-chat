const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;
// Comma separated list of allowed frontend origins (set this on Render after deploying frontend)
const ORIGINS = (process.env.CLIENT_ORIGIN ||
  "http://localhost:3000,http://localhost:5173").split(",").map((s) => s.trim());

const ROOMS = ["General", "Tech Support"];
const HISTORY_LIMIT = 50;
const history = Object.fromEntries(ROOMS.map((r) => [r, []]));

const app = express();
app.use(cors({ origin: ORIGINS, methods: ["GET", "POST"] }));
app.get("/", (_req, res) => res.send("Chat server is running"));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

// Socket.io has its own CORS config, separate from Express
const io = new Server(server, {
  cors: { origin: ORIGINS, methods: ["GET", "POST"] },
});

function roomUsers(room) {
  const ids = io.sockets.adapter.rooms.get(room) || new Set();
  return [...ids].map((id) => io.sockets.sockets.get(id)?.data.username).filter(Boolean);
}

io.on("connection", (socket) => {
  console.log(`✅ Client handshake successful: ${socket.id}`);

  socket.on("join_room", ({ username, room }) => {
    if (!ROOMS.includes(room)) return;
    const name = String(username || "").trim().slice(0, 20) || "Anonymous";

    // leave previous room
    const prev = socket.data.room;
    if (prev && prev !== room) {
      socket.leave(prev);
      socket.to(prev).emit("typing", { username: socket.data.username, isTyping: false });
      io.to(prev).emit("system", { text: `${socket.data.username} left`, room: prev });
      io.to(prev).emit("room_users", { room: prev, users: roomUsers(prev) });
    }

    socket.data.username = name;
    socket.data.room = room;
    socket.join(room);

    socket.emit("history", { room, messages: history[room] });
    io.to(room).emit("system", { text: `${name} joined`, room });
    io.to(room).emit("room_users", { room, users: roomUsers(room) });
    console.log(`👤 ${name} joined "${room}"`);
  });

  socket.on("chat_message", ({ text }) => {
    const { username, room } = socket.data;
    const clean = String(text || "").trim().slice(0, 1000);
    if (!room || !clean) return;
    const msg = { id: `${Date.now()}-${socket.id}`, username, text: clean, room, time: Date.now() };
    history[room].push(msg);
    if (history[room].length > HISTORY_LIMIT) history[room].shift();
    // io.to(room) => everyone in that room INCLUDING the sender, nobody outside the room
    io.to(room).emit("chat_message", msg);
  });

  socket.on("typing", ({ isTyping }) => {
    const { username, room } = socket.data;
    if (!room) return;
    // everyone in the room EXCEPT the sender
    socket.to(room).emit("typing", { username, isTyping: !!isTyping });
  });

  socket.on("disconnect", () => {
    const { username, room } = socket.data;
    console.log(`❌ Client disconnected: ${socket.id}`);
    if (room) {
      socket.to(room).emit("typing", { username, isTyping: false });
      io.to(room).emit("system", { text: `${username} left`, room });
      io.to(room).emit("room_users", { room, users: roomUsers(room) });
    }
  });
});

server.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
