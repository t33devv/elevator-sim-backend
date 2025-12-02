// okay fine, YES, this file is Cursor vibecoded :D

const { TOTAL_FLOORS } = require('../utils/constants');

class BotService {
  constructor(elevatorController) {
    this.elevatorController = elevatorController;
    this.isRunning = false;
    this.interval = null;
    this.botNames = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 
      'Grace', 'Henry', 'Iris', 'Jack', 'Kate', 'Leo'
    ];
  }

  start(intervalMs = 5000) {
    if (this.isRunning) return;
    
    console.log('🤖 Bot service started - making requests every', intervalMs, 'ms');
    this.isRunning = true;

    this.interval = setInterval(() => {
      this.makeRandomRequest();
    }, intervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log('🤖 Bot service stopped');
    this.isRunning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  makeRandomRequest() {
    // Generate random from and to floors (must be different)
    const fromFloor = Math.floor(Math.random() * TOTAL_FLOORS) + 1;
    let toFloor = Math.floor(Math.random() * TOTAL_FLOORS) + 1;
    
    // Ensure different floors
    while (toFloor === fromFloor) {
      toFloor = Math.floor(Math.random() * TOTAL_FLOORS) + 1;
    }

    const direction = toFloor > fromFloor ? 'up' : 'down';
    const botName = this.botNames[Math.floor(Math.random() * this.botNames.length)];

    const request = {
      fromFloor,
      toFloor,
      direction,
      isBot: true,
      botName
    };

    console.log(`🤖 ${botName}: Floor ${fromFloor} → ${toFloor}`);
    this.elevatorController.handleRequest(request);

    // Emit bot request notification
    if (this.elevatorController.io) {
      this.elevatorController.io.emit('requestReceived', {
        fromFloor: request.fromFloor,
        toFloor: request.toFloor,
        timestamp: Date.now(),
        isBot: true,
        botName
      });
    }
  }
}

module.exports = BotService;