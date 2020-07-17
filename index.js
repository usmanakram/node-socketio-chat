const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const users = require("./utils/users");
const formatMessage = require("./utils/messages");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "LiveChat Bot";

// Run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = users.userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    // This message wil only be received by current user
    socket.emit("message", formatMessage(botName, "Welcome to LiveChat!"));

    // Broadcast when a user connects
    // This message will be received by all room members (except current users)
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    // This message will be received by all room members (including current users)
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: users.getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = users.getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = users.userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: users.getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// docker run -it -p 3000:3000 -d -v "$PWD":/usr/src/app --name node_chat_app node:13.8.0
// docker exec -w //usr/src/app node_chat_app bash -c "npm install; npm i -g nodemon; nodemon index.js"
// docker exec -w //usr/src/app node_chat_app bash -c "npm install; node index.js"

// docker run -it -p 3000:3000 -d -v //d/localhost/htdocs/projects/LudoApp/ludo_app_socketio_api:/usr/src/app --name ludo_app node:13.8.0
// docker exec -w //usr/src/app ludo_app bash -c "npm install; npm i -g nodemon; nodemon index.js"
// docker exec -w //usr/src/app ludo_app bash -c "npm install; node index.js"
