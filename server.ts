import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });
  const PORT = process.env.PORT || 3000;

  // Simple in-memory room state
  const rooms: Record<string, any> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      if (!rooms[roomId]) {
        rooms[roomId] = {
          players: [],
          state: null,
          setupPlayers: [null, null, null, null, null],
          hostId: null,
          initialCoins: 100,
        };
      }
      socket.emit("room_state", rooms[roomId]);
      // Broadcast to others that a new player joined
      socket.to(roomId).emit("player_joined", { socketId: socket.id });
    });

    socket.on("update_state", (roomId, state) => {
      if (rooms[roomId]) {
        rooms[roomId].state = state;
        socket.to(roomId).emit("state_updated", state);
      }
    });

    // Setup phase synchronization
    socket.on("update_setup_players", (roomId, setupPlayers) => {
      if (rooms[roomId]) {
        rooms[roomId].setupPlayers = setupPlayers;
        socket.to(roomId).emit("setup_players_updated", setupPlayers);
      }
    });

    socket.on("update_host", (roomId, hostId) => {
      if (rooms[roomId]) {
        rooms[roomId].hostId = hostId;
        socket.to(roomId).emit("host_updated", hostId);
      }
    });

    socket.on("update_initial_coins", (roomId, coins) => {
      if (rooms[roomId]) {
        rooms[roomId].initialCoins = coins;
        socket.to(roomId).emit("initial_coins_updated", coins);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files from dist folder
    app.use(express.static(path.join(__dirname, "dist")));
    
    // Serve index.html for all routes (SPA)
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
