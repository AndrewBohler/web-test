let gl; // can't be const because it's instantiate on window load


function setupScene()
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL); 
}


function createMVP()
{
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 10000.0;

    const mvp = {
        model: mat4.create(),
        view: mat4.create(),
        projection: mat4.create()
    }

    mat4.perspective(mvp.projection, fieldOfView, aspect, zNear, zFar);
    mat4.translate(mvp.view, mvp.view, [-0.0, 0.0, -50.0]);

    return mvp;
}

let first = true;
function updateVelocities(instances)
{
    // placeholders
    const G = -0.0000001;
    const mass2 = 10000;
    const TS = 0.0001;

    for (const body of instances)
    {
        const gravity = vec3.create();
        for (const other of instances)
        {
            const dist = Math.hypot(
                other.position[0] - body.position[0],
                other.position[1] - body.position[1],
                other.position[2] - body.position[2]
            );

            if (dist == 0) continue;

            const sqrtDist = Math.sqrt(dist);

            body.velocity[0] += (G * mass2 * (body.position[0] - other.position[0])) / sqrtDist * TS;
            body.velocity[1] += (G * mass2 * (body.position[1] - other.position[1])) / sqrtDist * TS;
            body.velocity[2] += (G * mass2 * (body.position[2] - other.position[2])) / sqrtDist * TS;
        }

        const dist = Math.hypot(...body.position);
        if (dist == 0) continue;
        sqrtDist = Math.sqrt(dist);

        body.velocity[0] += (G * mass2 * mass2 * body.position[0]) / sqrtDist * TS;
        body.velocity[1] += (G * mass2 * mass2 * body.position[1]) / sqrtDist * TS;
        body.velocity[2] += (G * mass2 * mass2 * body.position[2]) / sqrtDist * TS;
    }
}

function drawScene(mvp, model, instances)
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const identity = mat4.create();
    for (const inst of instances)
    {
        inst.position[0] += inst.velocity[0];
        inst.position[1] += inst.velocity[1];
        inst.position[2] += inst.velocity[2];

        mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
        mat4.translate(mvp.model, mvp.model, inst.position);
        model.render(mvp);
    }

    updateVelocities(instances);
    
    // const ms = Date.now();
    // const angle = ms / 100000.0 * 2 * Math.PI;
    // const angle = 2 * Math.PI / 100;
    
    // mat4.rotateX(mvp.model, mvp.model, angle);
}


class Shader
{
    // shader program
    program;

    // shaders in program
    vertex;
    fragment;

    // Map[string, int] of locations
    attributes;
    uniforms;

    constructor(vertexSource, fragmentSource)
    {
        this.program = gl.createProgram();

        this.vertex = gl.createShader(gl.VERTEX_SHADER);
        this.fragment = gl.createShader(gl.FRAGMENT_SHADER);

        // load shaders' source code onto graphics card
        gl.shaderSource(this.vertex, vertexSource);
        gl.shaderSource(this.fragment, fragmentSource);

        // compile shaders
        gl.compileShader(this.vertex);
        gl.compileShader(this.fragment);

        // attach shaders to program
        gl.attachShader(this.program, this.vertex);
        gl.attachShader(this.program, this.fragment);

        // link shaders together in program
        gl.linkProgram(this.program);

        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(this.program));
            return null;
        }

        gl.useProgram(this.program);

        // parse shaders for attributes and uniforms, get locations

        const attributeExpression = /attribute [\w\d]+ (\w+)/g;
        const uniformExpression = /uniform [\w\d]+ (\w+)/g;

        this.attributes = new Map();
        this.uniforms = new Map();
        
        for (const shaderSource of [vertexSource, fragmentSource])
        {
            console.log("parsing shader source code for attributes and uniforms:");
            console.log(shaderSource);

            for (const match of [...shaderSource.matchAll(attributeExpression)])
            {
                const name = match[1];
                console.log(`found attribute "${name}" in "${match[0]}"`)
                if (!this.attributes.has(name))
                    this.attributes.set(name, gl.getAttribLocation(this.program, name));
            }
            for (const match of [...shaderSource.matchAll(uniformExpression)])
            {
                const name = match[1]
                console.log(`found uniform "${name}" in "${match[0]}"`)
                if (!this.uniforms.has(name))
                    this.uniforms.set(name, gl.getUniformLocation(this.program, name));
            }
        }
        console.log(this.uniforms);
        console.log(this.attributes);
    }
};

class Model
{
    // vbo;
    vertexBuffer;

    // Shader class instance
    shader;

    // list of rendering steps [func, [...args]]
    renderSequence;

    // model transformation matrix
    transform;

    constructor(shader, vbo, renderSequence)
    {
        this.vertexBuffer = vbo;
        this.shader = shader;
        this.renderSequence = renderSequence;
        this.transform = mat4.create();
        this.debugRender = true;

        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        /* since we're using a vbo and not changing the vao
         * setting the pointers here conflicts when we rebind
         * the ARRAY_BUFFER, instead set these up right before
         * rendering the model, for each model 
        */

        // const aVertexPosition = shader.attributes.get("aVertexPosition");
        // gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 3 * 4, 0);
        // gl.enableVertexAttribArray(aVertexPosition);

        // const uModelMatrix = shader.uniforms.get("uModelMatrix");
        // gl.useProgram(shader.program);
        // gl.uniformMatrix4fv(uModelMatrix, false, this.transform);
    }

    render(mvp)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.useProgram(this.shader.program);

        const aVertexPosition = this.shader.attributes.get("aVertexPosition");
        gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 3 * 4, 0);
        gl.enableVertexAttribArray(aVertexPosition);

        const uModelMatrix = this.shader.uniforms.get("uModelMatrix");
        const uViewMatrix = this.shader.uniforms.get("uViewMatrix");
        const uProjectionMatrix = this.shader.uniforms.get("uProjectionMatrix");

        gl.uniformMatrix4fv(uModelMatrix, false, mvp.model);
        gl.uniformMatrix4fv(uViewMatrix, false, mvp.view);
        gl.uniformMatrix4fv(uProjectionMatrix, false, mvp.projection);

        if (this.debugRender)
        {
            for (const [ mode, offset, count ] of this.renderSequence)
            {
                console.log(`rendering model with mode: ${mode}, offset: ${offset}, count: ${count}`);
                gl.drawArrays(mode, offset, count);
            }
            this.debugRender = !this.debugRender;
        } else {
            for (const [ mode, offset, count ] of this.renderSequence)
            {
                gl.drawArrays(mode, offset, count);
            }
        }
    }
};


function createSphere(lattitudeDivisions, longitudeDivisions)
{
    console.log(`createSphere(${lattitudeDivisions}, ${longitudeDivisions})`);

    const vertices = [];
    const twoPI = Math.PI * 2;

    const topPoint = vec3.fromValues(0.0, 1.0, 0.0);
    const origin = vec3.fromValues(0.0, 0.0, 0.0);
    
    // top cap
    // vertex count = longitudeDivisions + 2
    {
        vertices.push(...topPoint); // top point
        
        console.log("top cap:");
        console.log(...topPoint);

        const point = vec3.create();
        const latAngle = 1.0 / (lattitudeDivisions + 1) * Math.PI;

        for (let i = 0; i < longitudeDivisions + 1; i++)
        {
            const longAngle = twoPI * (i / longitudeDivisions)
            vec3.rotateX(point, topPoint, origin, latAngle);
            vec3.rotateY(point, point, origin, longAngle);
            vertices.push(...point);
            console.log(i, ": ", ...point);
        }
    }

    console.log(vertices.length / 3);

    // triangle stips between lattitude lines
    // vertex count = (lattitudeDivisions - 1) * 2(longitudeDivisions + 1)
    {
        const p0 = vec3.create();
        const p1 = vec3.create();

        console.log("triangle strips:");

        // there are (lattitudeDivisions - 1) triagle strips
        for (let i = 0; i < lattitudeDivisions - 1; i++)
        {
            const latAngle0 = (i + 1) / (lattitudeDivisions + 1) * Math.PI;
            const latAngle1 = (i + 2) / (lattitudeDivisions + 1) * Math.PI;
            
            // there are (longitudeDivisions + 1) pairs, so the triangle strip connects to itself
            for (j = 0; j < longitudeDivisions + 1; j++)
            {
                const longAngle = j / longitudeDivisions * twoPI;

                // align lattitudes
                vec3.rotateX(p0, topPoint, origin, latAngle0);
                vec3.rotateX(p1, topPoint, origin, latAngle1);

                // align longitutdes
                vec3.rotateY(p0, p0, origin, longAngle);
                vec3.rotateY(p1, p1, origin, longAngle);

                vertices.push(...p0, ...p1);
                console.log(i, ", ", j, ": (", ...p0, "), (", ...p1, ")");
            }
        }
    }

    // bottom cap
    // vertex count = ongitudeDivisions + 2
    {
        const bottomPoint = vec3.fromValues(0.0, -1.0, 0.0);
        const point = vec3.create();
        const latAngle = lattitudeDivisions / (lattitudeDivisions + 1) * Math.PI;

        console.log("bottom cap:");
        console.log(...bottomPoint);

        vertices.push(...bottomPoint);

        for (let i = 0; i < longitudeDivisions + 1; i++)
        {
            const longAngle = i / longitudeDivisions * twoPI;
            vec3.rotateX(point, topPoint, origin, latAngle);
            vec3.rotateY(point, point, origin, longAngle);

            vertices.push(...point);
            console.log(i, ": ", ...point);
        }

    }

    const data = new Float32Array(vertices);
    
    console.log(`vertices.length: ${vertices.length}, data.byteLength: ${data.byteLength}`);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // vertex shader
    const vsSource = `
        attribute vec3 aVertexPosition;

        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying vec4 fragPos;
        varying vec4 fragColor;
        void main() {
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
            fragPos = vec4(aVertexPosition * 0.5 + 0.5, 1.0);
        }
    `;
  
    // Fragment shader
    const fsSource = `
        precision highp float;
        varying vec4 fragPos;
        varying vec4 fragColor;

        void main() {
            float mag = length(fragPos.xyz);
            gl_FragColor = vec4(fragPos.xyz / mag, 1.0);
        }
    `;

    const shader = new Shader(vsSource, fsSource);

    // sequence of gl.drawArrays calls to render full sphere
    const renderSequence = []

    const capVertexCount = longitudeDivisions + 2;
    const stripVertexCount = 2 * (longitudeDivisions + 1);
    const botCapOffset = capVertexCount + stripVertexCount * (lattitudeDivisions - 1);
    
    renderSequence.push([gl.TRIANGLE_FAN, 0, capVertexCount]);

    for (let i = 0; i < lattitudeDivisions - 1; i++)
    {
        const offset = capVertexCount + i * stripVertexCount;
        renderSequence.push([gl.TRIANGLE_STRIP, offset, stripVertexCount]);
    }

    renderSequence.push([gl.TRIANGLE_FAN, botCapOffset, capVertexCount]);

    return new Model(shader, vbo, renderSequence);
}

function main() {
    const canvas = document.querySelector('#render-canvas');
    gl = canvas.getContext('webgl');
  
    // If we don't have a GL context, give up now
  
    if (!gl) {
      alert('Unable to initialize WebGL. Your browser or machine may not support it.');
      return;
    }

    const mvp = createMVP();

    setupScene();

    const sphere = createSphere(30, 30);

    const instances = [];
    for (let i = 0; i < 100; i++)
    {
        const px = Math.random() - 0.5;
        const py = Math.random() - 0.5;
        const pz = Math.random() - 0.5;
        const dx = Math.random() - 0.5;
        const dy = Math.random() - 0.5;
        const dz = Math.random() - 0.5;

        body = {
            position: vec3.fromValues(px * 10, py * 10, pz * 10),
            velocity: vec3.fromValues(dx, dy, dz)
        }

        instances.push(body);
    }

    console.log(instances);
    console.log("setting interval for drawScene");
    // Draw the scene
    setInterval(drawScene, 1000 / 60, mvp, sphere, instances);
}

window.onload = main;
