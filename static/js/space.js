const renderArea = document.getElementById("render-area");
const center = { x: renderArea.clientWidth / 2, y: renderArea.clientHeight / 2 };

const asteroids = new Map();
const planets = new Map();
const stars = new Map();

const toggleRunningButton = document.getElementById("toggle-running-button");
const resetButton = document.getElementById("reset-button");
const toggleAsteroidSpawningButton = document.getElementById("toggle-asteroid-spawning-button");
const togglePlanetSpawningButton = document.getElementById("toggle-planet-spawning-button");

let nextBodyID = 0;
let asteroidSpawnerID;
let planetSpawnerID;
let runningID;

const state = {
    totalMass: 0,
    maxAsteroidCount: 500,
    maxPlanetCount: 200,
    timeStep: 0.1,
    maxDistFromCenter: 10000,
    scale: renderArea.clientHeight / 10000,
    G: -0.000001,
    E: 0.00000000001,
    drag: 0.0,
    tickTimes: { index: 0, array: new Array(50) },
    solorRadiationPressure: 10000000.0,
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
    if (varname === 'scale') {
        for (let bodies of [asteroids, planets, stars]) {
            for (let body of bodies.values()) {
                body.updateRadius();
            }
        }
        if (!runningID) tick();
    }
}

class Body {
    constructor(args = {}) {
        // add instance to bodies mapping
        this.id = nextBodyID++;

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

        if (args.color) this.color = args.color;
        else this.color = { r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255 };

        this.div.style.backgroundColor = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        this.div.style.animationName = "rotating";
        this.div.style.animationDuration = `${1}s`;
        this.div.style.animationIterationCount = "infinite";
        this.div.style.animationTimingFunction = "linear";

        this.alive = true;
    }

    updatePosition() {
        this.pos.x += this.velocity.x * state.timeStep;
        this.pos.y += this.velocity.y * state.timeStep;

        this.div.style.left = `${(this.pos.x - this.radius) * state.scale + center.x}px`;
        this.div.style.top = `${(this.pos.y + this.radius) * state.scale + center.y}px`;
    }

    updateRadius() {
        this.radius = Math.log2(this.mass);
        let radius = this.radius * 2 * state.scale;
        radius = radius < 1 ? 1 : radius;
        this.div.style.width = `${radius * 2}px`;
        this.div.style.height = `${radius * 2}px`;
    }

    applyRadiationPressure(mappingOfBodies) {
        for (let other of mappingOfBodies.values()) {
            const vec = {
                x: other.pos.x - this.pos.x,
                y: other.pos.y - this.pos.y
            }

            const dist = Math.hypot(vec.x, vec.y);

            vec.x *= Math.log10(other.mass) * state.solorRadiationPressure * state.timeStep;
            vec.y *= Math.log10(other.mass) * state.solorRadiationPressure * state.timeStep;

            vec.x /= dist * dist;
            vec.y /= dist * dist;

            this.velocity.x += vec.x;
            this.velocity.y += vec.y;

            if (this.id === 0) console.log(vec);
        }
    }

    // apply gravity
    updateVelocity(mappingOfBodies) {
        for (let other of mappingOfBodies.values()) {
            if (this.id === other.id) continue;

            let gravityVec = {
                x: this.pos.x - other.pos.x,
                y: this.pos.y - other.pos.y
            };

            const enumerator = state.G * this.mass * other.mass;
            const denominator = Math.hypot(gravityVec.x, gravityVec.y);
            const gravity = enumerator / denominator * state.timeStep;
            this.velocity.x += gravity;
            this.velocity.y += gravity;
        }
    }

    checkForCollisions(mappingOfBodies) {
        for (let other of mappingOfBodies.values()) {
            if (this.id === other.id) continue;
            else if (Math.hypot(this.pos.x - other.pos.x, this.pos.y - other.pos.y) < (this.radius + other.radius)) {
                if (this.mass > other.mass) this.collide(other);
                else other.collide(this);
            }
        }
    }

    // this consumes the other body
    collide(other) {
        if (other === undefined) return false;

        const combinedMass = this.mass + other.mass;
        const otherMassRatio = other.mass / combinedMass;
        const thisMassRatio = this.mass / combinedMass;
        this.velocity.x = this.velocity.x * thisMassRatio + other.velocity.x * otherMassRatio;
        this.velocity.y = this.velocity.y * thisMassRatio + other.velocity.y * otherMassRatio;
        this.mass = combinedMass;
        state.totalMass += other.mass;

        this.pos.x += (other.pos.x - this.pos.x) * otherMassRatio;
        this.pos.y += (other.pos.y - this.pos.y) * otherMassRatio;

        other.remove();

        this.updateRadius();
        // this.updateColor();
    }

    remove() {
        if (asteroids.has(this.id)) {
            state.totalMass -= this.mass;
            asteroids.delete(this.id);
            this.div.parentNode.removeChild(this.div);
        }

        if (planets.has(this.id)) {
            state.totalMass -= this.mass;
            planets.delete(this.id);
            this.div.parentNode.removeChild(this.div);
        }

        if (stars.has(this.id)) {
            state.totalMass -= this.mass;
            stars.delete(this.id);
            this.div.parentNode.removeChild(this.div);
        }
    }
}

function tick() {

    for (let asteroid of asteroids.values()) {
        asteroid.checkForCollisions(planets);
        asteroid.checkForCollisions(stars);
        asteroid.updateVelocity(planets);
        asteroid.updateVelocity(stars);
        asteroid.applyRadiationPressure(stars);
    }


    // handle collisions
    for (let planet of planets.values()) {
        planet.checkForCollisions(planets);
        planet.checkForCollisions(stars);
    }

    // apply gravity
    for (let planet of planets.values()) {
        planet.updateVelocity(planets);
        planet.updateVelocity(stars);
        planet.applyRadiationPressure(stars);
    }

    // move
    for (let bodies of [asteroids, planets]) {
        for (let body of bodies.values()) {
            body.updatePosition();
            if (Math.hypot(body.pos.x, body.pos.y) > state.maxDistFromCenter) {
                body.remove();
            }
        }
    }

    state.tickTimes.array[state.tickTimes.index++] = new Date().getTime();
    if (state.tickTimes.index >= state.tickTimes.array.length) state.tickTimes.index = 0;
}

function updateStats() {
    const stats = document.getElementById("frame-time");

    let avgTickTime = 0;
    for (let i = 1; i < state.tickTimes.array.length; i++) {
        avgTickTime += state.tickTimes.array[i] - state.tickTimes.array[i - 1];
    }
    avgTickTime /= state.tickTimes.array.length - 1;

    stats.textContent = `${avgTickTime} ms per frame `
    stats.textContent += `${asteroids.size} asteroids `
    stats.textContent += `${planets.size} planets `
    stats.textContent += `${stars.size} stars `
    stats.textContent += `${Math.floor(state.totalMass)} mass`
}

setInterval(updateStats, 500);

function centerBodies() {
    const averagePos = { x: 0, y: 0 };
    const totalSize = planets.size + stars.size;

    // don't count asteroids
    for (let bodies of [planets, stars]) {
        for (let body of bodies.values()) {
            averagePos.x += body.pos.x;
            averagePos.y += body.pos.y;
        }
    }

    averagePos.x /= totalSize;
    averagePos.y /= totalSize;

    // reposition all bodies
    for (let bodies of [asteroids, planets, stars]) {
        for (let body of bodies.values()) {
            body.pos.x -= averagePos.x;
            body.pos.y -= averagePos.y;
            if (!runningID) body.updatePosition();
        }
    }

}

function spawnAsteroids(amount = 1) {
    if (asteroids.size < state.maxAsteroidCount) {
        const speed = Math.random() * 1000;

        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dir = (Math.random() - 0.5) * Math.PI;

            args = {};
            args.pos = {
                x: (Math.random() - 0.5) * state.maxDistFromCenter,
                y: (Math.random() - 0.5) * state.maxDistFromCenter
            }
            args.velocity = {
                x: Math.sin(angle + dir) * speed,
                y: Math.cos(angle + dir) * speed
            }
            args.color = { r: 200, g: 200, b: 200 };

            newAsteroid = new Body(args);
            asteroids.set(newAsteroid.id, newAsteroid);
        }
    }
}

function spawnPlanets(amount = 1) {
    if (planets.size < state.maxPlanetCount) {

        for (let i = 0; i < amount; i++) {
            const speed = Math.random() * 1000;
            const dir = (Math.random() - 0.5) * Math.PI;
            const angle = Math.random() * Math.PI * 2;

            args = {};
            args.pos = {
                x: Math.sin(angle) * state.maxDistFromCenter * 0.8,
                y: Math.cos(angle) * state.maxDistFromCenter * 0.8
            }
            args.velocity = {
                x: Math.sin(angle + dir) * speed,
                y: Math.cos(angle + dir) * speed
            }
            args.mass = Math.random() * 999000 + 1000;

            newPlanet = new Body(args);
            planets.set(newPlanet.id, newPlanet);
        }
    }
}

function toggleAsteroidSpawning(rate = 10) {
    if (asteroidSpawnerID) {
        clearInterval(asteroidSpawnerID);
        asteroidSpawnerID = 0;
        toggleAsteroidSpawningButton.state = false;
        toggleAsteroidSpawningButton.style.backgroundColor = "red";

    } else {
        asteroidSpawnerID = setInterval(spawnAsteroids, rate);
        toggleAsteroidSpawningButton.state = true;
        toggleAsteroidSpawningButton.style.backgroundColor = "green";
    }
}

function togglePlanetSpawning(rate = 10) {
    if (planetSpawnerID) {
        clearInterval(planetSpawnerID);
        planetSpawnerID = 0;
        togglePlanetSpawningButton.state = false;
        togglePlanetSpawningButton.style.backgroundColor = "red";

    } else {
        planetSpawnerID = setInterval(spawnPlanets, rate);
        togglePlanetSpawningButton.state = true;
        togglePlanetSpawningButton.style.backgroundColor = "green";
    }
}

function toggleRunning() {
    if (runningID) {
        console.log("pausing simulation...");
        clearInterval(runningID);
        runningID = 0;

        if (planetSpawnerID) clearInterval(planetSpawnerID);
        planetSpawnerID = 0;

        if (asteroidSpawnerID) clearInterval(asteroidSpawnerID);
        toggleRunningButton.textContent = "Play";

    } else {
        console.log("resuming simulation...");
        runningID = setInterval(tick, 10);
        toggleRunningButton.textContent = "Pause";

        if (!planetSpawnerID && togglePlanetSpawningButton.state === true) {
            planetSpawnerID = setInterval(spawnPlanets, 10);
        }

        if (!asteroidSpawnerID && toggleAsteroidSpawningButton.state === true) {
            asteroidSpawnerID = setInterval(spawnAsteroids, 10);
        }
    }

}

function reset() {
    console.log("resetting simulation...");
    if (runningID) clearInterval(runningID);
    runningID = 0;

    if (planetSpawnerID) clearInterval(planetSpawnerID);
    bodySpawnerID = 0;

    if (asteroidSpawnerID) clearInterval(asteroidSpawnerID);
    asteroidSpawnerID = 0;

    for (let bodies of [asteroids, planets, stars]) {
        for (let body of bodies.values()) body.remove();
    }

    nextBodyID = 0;
    state.totalMass = 0;

    for (let i = 0; i < state.maxPlanetCount; i++) {
        let newPlanet = new Body();
        planets.set(newPlanet.id, newPlanet);
    }

    star = new Body({
        pos: { x: 0, y: 0 },
        mass: 1000,
        color: { r: 200, g: 150, b: 50 }
    })
    stars.set(star.id, star);

    toggleRunningButton.textContent = "Start";
}
