const { request } = require('express');
const Elevator = require('../models/elevator')

const { NUM_ELEVATORS, TOTAL_FLOORS } = require('../utils/constants')

class ElevatorController {
    constructor(io) {
        this.io = io;
        this.elevators = [];
        this.requestQueue = [];

        const elevator1 = new Elevator(1, 1);
        elevator1.io = io;

        const elevator2 = new Elevator(2, 5);
        elevator2.io = io;

        this.elevators.push(elevator1);
        this.elevators.push(elevator2);

        this.startUpdateLoop();
    }

    handleRequest = (request) => {
        const { fromFloor, toFloor } = request;

        if (fromFloor < 1 || fromFloor > TOTAL_FLOORS || toFloor < 1 || toFloor > TOTAL_FLOORS) {
            console.log('Invalid request: ', request);
            return;
        }

        console.log(`New request: From floor ${fromFloor} to ${toFloor}`);

        const bestElevator = this.findBestElevator(fromFloor, toFloor);

        if (bestElevator) {
            bestElevator.addRequest(fromFloor, toFloor);

            if (bestElevator.status === 'idle') {
                bestElevator.startMoving();
            }
        } else {
            this.requestQueue.push(request);
        }
    }

    // holy grail of elevator logic
    findBestElevator = (fromFloor, toFloor) => {
        let bestElevator = null;
        let bestScore = Infinity;

        for (const elevator of this.elevators) {
            const distance = elevator.distanceTo(fromFloor);

            if (elevator.status == 'idle') {
                const score = distance;
                if (score < bestScore) {
                    bestScore = score;
                    bestElevator = elevator;
                }
            } else if (elevator.canServeRequest(fromFloor, toFloor)) {
                const requestDirection = toFloor > fromFloor ? 'up' : 'down';
                if (elevator.direction === requestDirection) {
                    let score = distance;
                    score += elevator.destinationQueue.length * 3;

                    if (score < bestScore) {
                        bestScore = score;
                        bestElevator = elevator;
                    }
                } else {
                    const score = distance + (elevator.destinationQueue.length * 5);
                    if (score < bestScore) {
                        bestScore = score;
                        bestElevator = elevator;
                    }
                }
            }
        }
        return bestElevator;
    }

    processRequestQueue = () => {
        if (this.requestQueue.length === 0) return;

        const remainingRequests = [];

        for (const request of this.requestQueue) {
            const elevator = this.findBestElevator(request.fromFloor, request.toFloor);

            if (elevator && elevator.status === 'idle') {
                elevator.addRequest(request.fromFloor, request.toFloor);
                elevator.startMoving();
            } else {
                remainingRequests.push(request);
            }
        }
        this.requestQueue = remainingRequests;
    }
    // runs continuously
    startUpdateLoop = () => {
        setInterval(() => {
            this.processRequestQueue();

            for (const elevator of this.elevators) {
                if (elevator.status === 'idle' && elevator.destinationQueue.length > 0) {
                    elevator.startMoving();
                }
            }
            this.broadcastState();
        }, 100)
    }

    broadcastState = () => {
        const state = {
            elevators: this.elevators.map(elevator => elevator.getState()),
            timestamp: Date.now()
        }

        this.io.emit('elevatorStateUpdate', state);
    }

    getState = () => {
        return {
            elevators: this.elevators.map(elevator => elevator.getState()),
            requestQuee: this.requestQueue.length
        }
    }
}

module.exports = ElevatorController;