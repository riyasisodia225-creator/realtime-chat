# Prompts.md — Prompt Engineering Strategy

This file documents how AI assistance was used to build the Sprint 12 real-time chat application (Track B: Socket.io).

## Strategy
1. **Give the full spec first.** I supplied the entire assignment (phases P0/P1/P2, engineering FAQ) so the model worked against the real acceptance criteria instead of guessing.
2. **Phase by phase.** Requirements were mapped to phases: P0 handshake + broadcast, P1 identity + typing indicator, P2 rooms.
3. **Constrain the stack.** Node.js/Express + Socket.io on the server, React (Vite) + socket.io-client on the client.
4. **Ask for verification.** I asked for the app to be run end-to-end and tested, not only for code to be written.
5. **Review everything.** I read the generated code and made sure I can explain each socket event.

## Prompts Used
1. "Here is my Sprint 12 Track B assignment. Build the full project so it runs correctly."
2. "Explain the difference between `socket.broadcast.emit`, `io.emit` and `io.to(room).emit`."
3. "Why does React 18 StrictMode create duplicate socket connections and how do I fix it with useEffect cleanup?"
4. "How do I configure CORS separately for Socket.io and Express, and make the allowed origin configurable for deployment?"

## Key Learnings
- Socket.io CORS is configured separately from Express CORS.
- `io.to(room).emit` reaches everyone in the room including the sender; `socket.to(room).emit` excludes the sender (used for typing).
- The socket must be created inside `useEffect` with `socket.disconnect()` cleanup to avoid duplicates under StrictMode.
- Rooms are a server-side concept; room isolation is enforced on the server, not only in the UI.
