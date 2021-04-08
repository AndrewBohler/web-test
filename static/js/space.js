const renderArea = document.getElementById("render-area");
const center = { x: renderArea.clientWidth / 2, y: renderArea.clientHeight / 2 };
const bodies = new Map();
const collisions = [];

const toggleRunningButton = document.getElementById("toggle-running-button");
const resetButton = document.getElementById("reset-button");
const toggleSpawningButton = document.getElementById("toggle-spawning-button");

let nextBodyID = 0;
let bodySpawnerID;
let runningID;

const state = {
    totalMass: 0,
    maxBodyCount: 300,
    timeStep: 0.01,
    maxDistFromCenter: 750,
    scale: renderArea.clientHeight / 750,
    G: -0.000001,
    E: 0.00000000001,
    drag: 0.0,
}

function addToState(varname, amount) {
    let variable = state[varname];
    if (variable) {
        console.log(`${varname}: ${variable} += ${amount}`);
        state[varname] += amount;
    } else {
        console.log(`cannot add ${amount} to ${varaible} (${varname})`);
    }
}

function multiplyToState(varname, amount) {
    let variable = state[varname];
    if (variable) {
        console.log(`${varname}: ${variable} *= ${amount}`)
        state[varname] *= amount;
    } else {
        console.log(`cannot multiply "${variable} (${varname}) by ${amount}`);
    }
}

class Body {
    constructor(args = {}) {
        // add instance to bodies mapping
        this.id = nextBodyID++;
        bodies.set(this.id, this);

        if (args.pos) this.pos = args.pos;
        else this.pos = {
            x: (Math.random() - 0.5) * state.maxDistFromCenter / 2,
            y: (Math.random() - 0.5) * state.maxDistFromCenter / 2
        };
        if (args.mass) this.mass = args.mass;
        else this.mass = 1000 * Math.random();

        state.totalMass += this.mass;

        if (args.velocity) this.velocity = args.velocity;
        else this.velocity = { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 };

        this.radius = 0;
        this.div = document.createElement("div");

        renderArea.appendChild(this.div);

        this.div.style.position = "absolute";
        this.updateRadius();
        this.updatePosition();
        // this.updateColor();
        const color = { r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255 };
        this.div.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

        this.alive = true;
    }

    updatePosition() {
        this.pos.x += this.velocity.x * state.timeStep;
        this.pos.y += this.velocity.y * state.timeStep;

        this.div.style.left = `${(this.pos.x - this.radius) * state.scale + center.x}px`;
        this.div.style.top = `${(this.pos.y + this.radius) * state.scale + center.y}px`;
    }

    updateRadius() {
        this.radius = Math.log10(this.mass);
        this.div.style.width = `${this.radius * 2}px`;
        this.div.style.height = `${this.radius * 2}px`;
    }

    // returns new position so that all bodies can be updated later
    updateVelocity(mappingOfBodies) {
        for (let other of mappingOfBodies.values()) {
            if (this.id === other.id) continue;

            let gravityVec = {
                x: this.pos.x - other.pos.x,
                y: this.pos.y - other.pos.y
            };

            const dist = Math.hypot(gravityVec.x, gravityVec.y);

            this.velocity.x += (state.G * other.mass * gravityVec.x) / dist * state.timeStep;
            this.velocity.y += (state.G * other.mass * gravityVec.y) / dist * state.timeStep;
            this.velocity.x *= 1 - state.drag;
            this.velocity.y *= 1 - state.drag;
        }
    }

    checkForCollisions(mappingOfBodies) {
        for (let other of mappingOfBodies.values()) {
            if (this.id === other.id) continue;
            else if (this.mass > other.mass && Math.hypot(this.pos.x - other.pos.x, this.pos.y - other.pos.y) < (this.radius + other.radius)) {
                this.collide(other);
            }
        }
    }

    // this consumes the other body
    collide(other) {
        if (other === undefined) return false;

        const combinedMass = this.mass + other.mass;
        this.velocity.x = this.velocity.x * (this.mass / combinedMass) + other.velocity.x * (other.mass / combinedMass);
        this.velocity.y = this.velocity.y * (this.mass / combinedMass) + other.velocity.y * (other.mass / combinedMass);
        this.mass = combinedMass;
        state.totalMass += other.mass;

        this.pos.x = (this.pos.x + other.pos.x) / 2;
        this.pos.y = (this.pos.y + other.pos.y) / 2;

        other.remove();

        this.updateRadius();
        // this.updateColor();
    }

    remove() {
        if (bodies.has(this.id)) {
            state.totalMass -= this.mass;
            bodies.delete(this.id);
            this.div.parentNode.removeChild(this.div);
        }
    }
}

function tick() {
    const start_time = new Date().getTime();

    if (bodies.size > 1) {

        // handle collisions
        for (let body of bodies.values()) {
            body.checkForCollisions(bodies);
        }

        // apply gravity
        for (let body of bodies.values()) {
            body.updateVelocity(bodies);
        }

        // move bodies
        for (let body of bodies.values()) {
            body.updatePosition(bodies);
        }
    }
    document.getElementById("frame-time").textContent = `${new Date().getTime() - start_time} ms per frame ${bodies.size} bodies ${state.totalMass} mass`
}

function spawnBodies(amount = 1) {
    if (bodies.size < state.maxBodyCount) {
        for (let i = 0; i < amount; i++) {
            const dir = (Math.random() - 0.5) * Math.PI;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * state.totalMass / 100000;
            const offset = state.maxDistFromCenter / 4;
            args = {};
            args.pos = {
                x: Math.sin(angle) * offset,
                y: Math.cos(angle) * offset
            }
            args.velocity = {
                x: Math.sin(angle + dir) * speed,
                y: Math.cos(angle + dir) * speed
            }

            newBody = new Body(args);
            bodies.set(newBody.id, newBody);
        }
    }
}

function toggleSpawning(rate = 10) {
    if (bodySpawnerID) {
        clearInterval(bodySpawnerID);
        bodySpawnerID = 0;
        toggleSpawningButton.textContent = "Start Spawnning";
        toggleSpawningButton.state = false;

    } else {
        bodySpawnerID = setInterval(spawnBodies, rate);
        toggleSpawningButton.textContent = "Stop Spawnning";
        toggleSpawningButton.state = true;
    }
}

function toggleRunning() {
    if (runningID) {
        console.log("pausing simulation...");
        clearInterval(runningID);
        runningID = 0;

        if (bodySpawnerID) clearInterval(bodySpawnerID);
        bodySpawnerID = 0;
        toggleRunningButton.textContent = "Play";

    } else {
        console.log("resuming simulation...");
        runningID = setInterval(tick, 10);
        toggleRunningButton.textContent = "Pause";
        if (!bodySpawnerID && toggleSpawningButton.state === true) {
            bodySpawnerID = setInterval(spawnBodies, 10);
        }
    }

}

function reset() {
    console.log("resetting simulation...");
    if (runningID) clearInterval(runningID);
    runningID = 0;
    if (bodySpawnerID) clearInterval(bodySpawnerID);
    bodySpawnerID = 0;

    for (let body of bodies.values()) body.remove();

    nextBodyID = 0;
    state.totalMass = 0;

    for (let i = 0; i < state.maxBodyCount; i++) {
        new Body();
    }

    toggleRunningButton.textContent = "Start";
}
