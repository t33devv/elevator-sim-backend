const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const setupSocketHandlers = require('./src/app');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "*"
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

setupSocketHandlers(io);

server.listen(3000, () => {
  console.log('listening on *:3000');
});