const { FLOOR_TRAVEL_TIME, DOOR_OPEN_TIME } = require('../utils/constants')

class Elevator {
    constructor(id, startingFloor = 1) {
        this.id = id;
        this.currentFloor = startingFloor;
        this.status = 'idle';
        this.direction = 'none';
        this.destinationQueue = [];
        this.pendingFloors = new Set();
        this.isMoving = false;
        this.moveTimer = null;
        this.floorTimers = [];
        this.requestPairs = [];
        this.io = null;
    }

    addRequest = (fromFloor, toFloor) => {
        this.requestPairs.push({ pickup: fromFloor, destination: toFloor })
        if (fromFloor != this.currentFloor) {
            this.pendingFloors.add(fromFloor);
        }

        this.pendingFloors.add(toFloor);

        this.updateQueue();
    }

    updateQueue = () => {
        if (this.status === 'idle' && this.requestPairs.length > 0) {
            const oldestRequest = this.requestPairs[0];

            const queue = [];

            if (oldestRequest.pickup !== this.currentFloor) {
                queue.push(oldestRequest.pickup);
            }

            queue.push(oldestRequest.destination);

            const otherFloors = Array.from(this.pendingFloors)
                .filter(f => f !== oldestRequest.pickup && f !== oldestRequest.destination)
                .sort((a, b) => a - b);

            this.destinationQueue = [...queue, ...otherFloors];

            if (queue.length > 0 && queue[0] !== this.currentFloor) {
                this.direction = queue[0] > this.currentFloor ? 'up' : 'down';
            }

            return;
        }

        const floors = Array.from(this.pendingFloors).sort((a, b) => a - b);

        if (this.direction == 'up') {
            const above = floors.filter(f => f > this.currentFloor);
            const below = floors.filter(f => f < this.currentFloor);
            this.destinationQueue = [...above, ...below.reverse()]
        } else if (this.direction == 'down') {
            const below = floors.filter(f => f < this.currentFloor);
            const above = floors.filter(f => f > this.currentFloor);
            this.destinationQueue = [...below.reverse(), ...above]
        } else {
            this.destinationQueue = floors.sort((a, b) => {
                return Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor)
            })
        }
    }

    startMoving = () => {
        if (this.isMoving || this.status === 'loading') return;
        if (this.destinationQueue.length == 0) {
            this.status = 'idle';
            this.direction = 'none';
            return;
        }
        
        const nextFloor = this.destinationQueue[0];

        if (nextFloor == this.currentFloor) {
            this.pendingFloors.delete(nextFloor);
            this.destinationQueue.shift();
            this.startMoving();
            return;
        }

        this.isMoving = true;
        this.status = 'moving';
        this.direction = nextFloor > this.currentFloor ? 'up' : 'down';

        this.moveToNextFloor(nextFloor);
    }

    moveToNextFloor = (finalDestination) => {
        const floorsToMove = Math.abs(finalDestination - this.currentFloor);
        
        if (floorsToMove === 0) {
            this.isMoving = false;
            this.arriveAtFloor();
            return;
        }

        for (let i = 1; i <= floorsToMove; i++) {
            const timer = setTimeout(() => {
                if (this.direction === 'up') {
                    this.currentFloor += 1;
                } else {
                    this.currentFloor -= 1;
                }
                
                console.log(`Elevator ${this.id} is now at floor ${this.currentFloor}`);
                
                if (this.currentFloor === finalDestination) {
                    this.isMoving = false;
                    this.arriveAtFloor();
                }
            }, FLOOR_TRAVEL_TIME * i);
            
            this.floorTimers.push(timer);
        }
    }

    arriveAtFloor = () => {
        this.status = 'loading';
        this.pendingFloors.delete(this.currentFloor);

        const fulfilledPairs = this.requestPairs.filter(pair => {
            return pair.destination === this.currentFloor &&
                !this.pendingFloors.has(pair.pickup) &&
                !this.pendingFloors.has(pair.destination)
        })

        if (this.io && fulfilledPairs.length > 0) {
            fulfilledPairs.forEach(pair => {
                this.io.emit('requestFulfilled', {
                    elevatorId: this.id,
                    fromFloor: pair.pickup,
                    toFloor: pair.destination,
                    timestamp: Date.now()
                })
            })
        }

        this.requestPairs = this.requestPairs.filter(pair => {
            return !(
                !this.pendingFloors.has(pair.pickup) &&
                !this.pendingFloors.has(pair.destination)
            )
        })

        if (this.currentFloor == this.destinationQueue[0]) {
            this.destinationQueue.shift();
        }

        // Wait for doors, then continue
        this.moveTimer = setTimeout(() => {
            // Check if there are more destinations
            if (this.destinationQueue.length > 0) {
                this.status = 'moving';
                this.updateQueue();
                this.startMoving();
            } else {
                // No more destinations, go idle
                this.status = 'idle';
                this.direction = 'none';
            }
        }, DOOR_OPEN_TIME)
    }

    getState = () => {
        return {
            id: this.id,
            currentFloor: this.currentFloor,
            status: this.status,
            direction: this.direction,
            queueLength: this.destinationQueue.length,
        }
    }

    distanceTo = (floor) => {
        return Math.abs(this.currentFloor - floor);
    }

    canServeRequest(fromFloor, toFloor) {
        if (this.status === 'idle') return true;

        const requestDirection = toFloor > fromFloor ? 'up' : 'down';

        if (this.direction === requestDirection) {
            if (this.direction === 'up') {
                return fromFloor >= this.currentFloor;
            } else {
                return fromFloor <= this.currentFloor;
            }
        }
        return true;
    }

}

module.exports = Elevator;