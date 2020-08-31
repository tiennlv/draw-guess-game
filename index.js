// @ts-nocheck
const express = require("express");
const app = express();

const http = require("http");
const server = http.createServer(app);

const socketio = require("socket.io");
const io = socketio(server);

const users = [];
const connections = [];
const rooms = [];

const fs = require("fs");
let words = [];
const content = fs.readFileSync("words.txt", "utf8");
words = content.split("-");
const index = Math.floor(Math.random() * words.length);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", socket => {
  // if(connections.findIndex(connection => connection.id === socket.id) < 0) {
  //   updateUsernames();
  // }
  console.log(connections.findIndex(connection => connection.id === socket.id));
  updateRoom();
  updateListRooms();

  connections.push(socket);
  console.log(`${connections.length} users has connected`);

  socket.on("send message", (message, callback) => {
    io.to(socket.room).emit("send message", {
      message: message,
      user: socket.username
    });
    console.log(rooms.find(room => room.name === socket.room).word, message);
    if (rooms.find(room => room.name === socket.room).word === message) {
      callback(socket.username);
    }
  });

  socket.on("login", (data, callback) => {
    if (data.length === 0) callback({ err: "Please enter name!" });
    else if (users.find(user => user === data)) {
      callback({ err: "Name has existed!" });
    } else {
      callback({ success: true });
      socket.username = data;
      users.push(socket.username);
      updateUsernames();
    }
  });
  socket.on("create", (data, callback) => {
    if (data.length === 0) callback({ err: "Please enter name!" });
    else if (rooms.find(room => room.name === data)) {
      callback({ err: "Name has existed!" });
    } else {
      const newRoom = {
        name: data,
        listMember: [socket.username],
        word: ""
      };
      callback({ success: true });
      socket.join(data, () => {
        // io.to()
      });
      socket.room = data;
      // users.push(socket.username);
      rooms.push(newRoom);
      updateRoom();
      updateListRooms();
    }
  });

  socket.on("join room", (data, callback) => {
    let room = rooms.find(room => room.name === data);
    if (room.listMember.length >= 8) {
      callback({ err: "Room full" });
    } else {
      callback({ success: true });
      room.listMember.push(socket.username);
      socket.room = data;
      socket.join(data, () => {
        socket.to(data).emit("send message", {
          user: "Admin",
          message: `${socket.username} has joined in room`
        });
      });
      // socket.
      updateRoom();
      updateListRooms();
    }
  });

  socket.on("start", (id, callback) => {
    const sock = connections.find(connection => connection.id === id);
    const room = rooms.find(room => room.name === sock.room);
    if (room.listMember.length <= 1) return;
    io.to(room.name).emit("start", {
      user: "Admin",
      message: `Game Start`
    });
    const isDrawing = connections.find(
      connection => connection.username === room.listMember[0]
    ).id;
    // io.to(room.name).emit("playing", { room: room.name, id: isDrawing });

    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < room.listMember.length; i++) {
        const isDrawing = connections.find(
          connection => connection.username === room.listMember[i]
        ).id;
        if (i === 0 && j === 0) {
          setTimeout(() => {
            io.to(room.name).emit("playing", {
              room: room.name,
              id: isDrawing
            });
            let randomWord = words[index];
            io.to(room.name).emit("word", randomWord);
            room.word = randomWord;
          }, 3000);
          clearTimeout();
        } else {
          setTimeout(() => {
            io.to(room.name).emit("playing", {
              room: room.name,
              id: isDrawing
            });
            let randomWord = words[index];
            io.to(room.name).emit("word", randomWord);
            room.word = randomWord;
          }, 30000);
          clearTimeout();
        }
      }
    }
  });

  socket.on("draw", ({ room, x, y, color, width }) => {
    io.to(room).emit("draw", { x, y, color, width });
  });

  function updateUsernames() {
    io.emit("get user", users);
  }
  function updateListRooms() {
    io.emit("get room", rooms);
  }
  function updateRoom() {
    rooms.forEach(room => {
      io.in(room.name).emit("get member", room.listMember);
    });
  }

  function updateId(id) {
    const sock = connections.find(connection => connection.id === id);
  }

  socket.on("disconnect", data => {
    if (!socket.username) return;
    users.splice(users.indexOf(socket.username), 1);
    rooms.forEach((room, i) => {
      room.listMember.splice(room.listMember.indexOf(socket.username), 1);
      if (room.listMember.length === 0) rooms.splice(i, 1);
    });
    connections.splice(connections.indexOf(socket), 1);
    updateUsernames();
    updateListRooms();
  });
});

server.listen(process.env.PORT || 4000);
