const ElevatorController = require('./controllers/elevatorController')
const BotService = require('./services/BotService')

let elevatorController = null;
let botService = null;

function setupSocketHandlers(io) {
  elevatorController = new ElevatorController(io);

  // Initialize and start bot service
  botService = new BotService(elevatorController);
  botService.start();

  io.on('connection', (socket) => {
    console.log('a user connected');

    if (elevatorController) {
      socket.emit('elevatorStateUpdate', {
        elevators: elevatorController.elevators.map(e => e.getState()),
        timestamp: Date.now()
      })
    }
    
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
    
    socket.on('elevatorRequest', (msg) => {
      console.log('elevator request' + msg);

      if (elevatorController) {
        elevatorController.handleRequest(msg);

        io.emit('requestReceived', {
          fromFloor: msg.fromFloor,
          toFloor: msg.toFloor,
          timestamp: Date.now()
        });
      }
    });
  });
}

module.exports = setupSocketHandlers;