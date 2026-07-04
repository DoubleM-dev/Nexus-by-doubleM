const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/meetings", require("./routes/meetingRoutes"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/documents", require("./routes/documentRoutes"));

// Socket.io signaling server for WebRTC
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a call room
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
    // Tell everyone else in the room a new user joined
    socket.to(roomId).emit("user-joined", userId, socket.id);
  });

  // Pass WebRTC offer to the other peer
  socket.on("offer", (offer, roomId) => {
    socket.to(roomId).emit("offer", offer, socket.id);
  });

  // Pass WebRTC answer to the other peer
  socket.on("answer", (answer, roomId) => {
    socket.to(roomId).emit("answer", answer, socket.id);
  });

  // Pass ICE candidates between peers
  socket.on("ice-candidate", (candidate, roomId) => {
    socket.to(roomId).emit("ice-candidate", candidate, socket.id);
  });

  // Toggle audio
  socket.on("toggle-audio", (roomId, enabled) => {
    socket.to(roomId).emit("peer-audio-toggle", socket.id, enabled);
  });

  // Toggle video
  socket.on("toggle-video", (roomId, enabled) => {
    socket.to(roomId).emit("peer-video-toggle", socket.id, enabled);
  });

  // End call
  socket.on("end-call", (roomId) => {
    socket.to(roomId).emit("call-ended", socket.id);
    socket.leave(roomId);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    io.emit("user-disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
