import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
const ROOMS = ["General", "Tech Support"];

export default function App() {
  const [username, setUsername] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [room, setRoom] = useState("General");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typers, setTypers] = useState([]);
  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const roomRef = useRef(room);
  roomRef.current = room;

  // Create the socket only after the user has chosen an identity.
  useEffect(() => {
    if (!username) return;

    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_room", { username, room: roomRef.current }); // also re-joins after reconnect
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("history", ({ room: r, messages: m }) => {
      if (r === roomRef.current) setMessages(m.map((x) => ({ ...x, type: "chat" })));
    });
    socket.on("chat_message", (msg) => {
      if (msg.room !== roomRef.current) return;
      setMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [...prev, { ...msg, type: "chat" }]));
    });
    socket.on("system", ({ text: t, room: r }) => {
      if (r !== roomRef.current) return;
      setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type: "system", text: t }]);
    });
    socket.on("typing", ({ username: who, isTyping }) => {
      setTypers((prev) => {
        const without = prev.filter((n) => n !== who);
        return isTyping ? [...without, who] : without;
      });
    });
    socket.on("room_users", ({ room: r, users: u }) => {
      if (r === roomRef.current) setUsers(u);
    });

    // Cleanup: prevents duplicate connections under React 18 StrictMode
    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [username]);

  const switchRoom = (next) => {
    if (next === room) return;
    setRoom(next);
    roomRef.current = next;
    setMessages([]);
    setTypers([]);
    setUsers([]);
    socketRef.current?.emit("join_room", { username, room: next });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typers]);

  const handleChange = (e) => {
    setText(e.target.value);
    const s = socketRef.current;
    if (!s) return;
    s.emit("typing", { isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => s.emit("typing", { isTyping: false }), 1200);
  };

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !socketRef.current) return;
    socketRef.current.emit("chat_message", { text: t });
    socketRef.current.emit("typing", { isTyping: false });
    clearTimeout(typingTimeout.current);
    setText("");
  };

  if (!username) {
    return (
      <div className="center">
        <form
          className="card login"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameInput.trim()) setUsername(nameInput.trim());
          }}
        >
          <h1>💬 Live Chat</h1>
          <p>Enter a unique name to join</p>
          <input
            autoFocus
            maxLength={20}
            placeholder="e.g. Nakul"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <button type="submit" disabled={!nameInput.trim()}>Join Chat</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Channels</h2>
        {ROOMS.map((r) => (
          <button key={r} className={`room ${r === room ? "active" : ""}`} onClick={() => switchRoom(r)}>
            # {r}
          </button>
        ))}
        <h3>Online in {room} ({users.length})</h3>
        <ul>{users.map((u, i) => <li key={u + i}>🟢 {u}{u === username ? " (you)" : ""}</li>)}</ul>
        <div className="status">{connected ? "🟢 Connected" : "🔴 Reconnecting..."}</div>
      </aside>

      <main className="chat">
        <header># {room}</header>
        <div className="messages">
          {messages.map((m) =>
            m.type === "system" ? (
              <div key={m.id} className="system">{m.text}</div>
            ) : (
              <div key={m.id} className={`msg ${m.username === username ? "mine" : ""}`}>
                <span className="who">[{m.username}]</span>: {m.text}
              </div>
            )
          )}
          <div className="typing">
            {typers.length > 0 && `${typers.join(", ")} ${typers.length > 1 ? "are" : "is"} typing...`}
          </div>
          <div ref={bottomRef} />
        </div>
        <form className="composer" onSubmit={send}>
          <input placeholder={`Message #${room}`} value={text} onChange={handleChange} />
          <button type="submit" disabled={!text.trim()}>Send</button>
        </form>
      </main>
    </div>
  );
}
