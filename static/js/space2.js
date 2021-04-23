let gl; // can't be const because it's instantiate on window load


function setupScene()
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL); 
}


function createFrameAndTextureBuffer(width, height)
{
    if (width <= 0 || height <= 0) return null;

    // create texture to render to
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // define and format of level 0, what is "level 0"?
    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;

    // I think this just set up the metadata above?
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, border, format, type, data);

    // set filtering so we don't need mips
    gl.textParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.textParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.textParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create frame buffer
    const frameBuffer = gl.createFrameBuffer();
    gl.bindFrameBuffer(gl.FRAME_BUFFER, frameBuffer);

    // attach texture as first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.frameBufferTexture2D(gl.FRAME_BUFFER, attachmentPoint, gl.TEXTURE_2D, texture, level);

    return [frameBuffer, textureBuffer];
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
    mat4.translate(mvp.view, mvp.view, [-0.0, 0.0, -150.0]);

    return mvp;
}

let first = true;
function updateVelocities(instances, stars)
{
    // placeholders
    const G = -0.0000001;
    const TS = 0.0001;

    for (const body of instances)
    {
        // other bodies
        for (const other of instances)
        {
            const dist = Math.hypot(
                other.position[0] - body.position[0],
                other.position[1] - body.position[1],
                other.position[2] - body.position[2]
            );

            if (dist < 1) continue;

            const sqrtDist = Math.pow(dist, 2);

            body.velocity[0] += (G * body.mass * other.mass * (body.position[0] - other.position[0])) / sqrtDist * TS;
            body.velocity[1] += (G * body.mass * other.mass * (body.position[1] - other.position[1])) / sqrtDist * TS;
            body.velocity[2] += (G * body.mass * other.mass * (body.position[2] - other.position[2])) / sqrtDist * TS;
        }

        // stars
        for (const star of stars)
        {
            const dist = Math.hypot(
                star.position[0] - body.position[0],
                star.position[1] - body.position[1],
                star.position[2] - body.position[2]
            );

            if (dist < 1) continue;

            const sqrtDist = Math.pow(dist, 2);

            body.velocity[0] += (G * body.mass * star.mass * (body.position[0] - star.position[0])) / sqrtDist * TS;
            body.velocity[1] += (G * body.mass * star.mass * (body.position[1] - star.position[1])) / sqrtDist * TS;
            body.velocity[2] += (G * body.mass * star.mass * (body.position[2] - star.position[2])) / sqrtDist * TS;
        }
    }

    // stars vs stars
    for (const body of stars)
    {
        for (const star of stars)
        {    
            const dist = Math.hypot(
                star.position[0] - body.position[0],
                star.position[1] - body.position[1],
                star.position[2] - body.position[2]
            );

            if (dist < 1) continue;

            const sqrtDist = Math.pow(dist, 2);

            body.velocity[0] += (G * body.mass * star.mass * (body.position[0] - star.position[0])) / sqrtDist * TS;
            body.velocity[1] += (G * body.mass * star.mass * (body.position[1] - star.position[1])) / sqrtDist * TS;
            body.velocity[2] += (G * body.mass * star.mass * (body.position[2] - star.position[2])) / sqrtDist * TS;
        }
    }
}

function drawScene(mvp, models, instances, stars)
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    mat4.rotateX(mvp.view, mvp.view, 0.005);

    for (let i = 0; i < instances.length; i++)
    {
        const inst = instances[i];
        const model = models[0];
        
        inst.position[0] += inst.velocity[0];
        inst.position[1] += inst.velocity[1];
        inst.position[2] += inst.velocity[2];

        mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
        mat4.translate(mvp.model, mvp.model, inst.position);


        model.render(mvp);
    }

    for (let i = 0; i < stars.length; i++)
    {
        const inst = stars[i];
        const model = models[1];

        inst.position[0] += inst.velocity[0];
        inst.position[1] += inst.velocity[1];
        inst.position[2] += inst.velocity[2];

        mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
        mat4.translate(mvp.model, mvp.model, inst.position);
        mat4.scale(mvp.model, mvp.model, vec3.fromValues(5, 5, 5));

        model.render(mvp);
    }
    updateVelocities(instances, stars);
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

        let compileSuccess;
        let compilationLog;

        compileSuccess = gl.getShaderParameter(this.vertex, gl.COMPILE_STATUS);
        if (!compileSuccess)
        {
            compilationLog = gl.getShaderInfoLog(this.vertex);
            console.log('Vertex shader failed to compile: ', compilationLog);
        }

        compileSuccess = gl.getShaderParameter(this.fragment, gl.COMPILE_STATUS);
        if (!compileSuccess)
        {
            compilationLog = gl.getShaderInfoLog(this.fragment);
            console.log('Fragment shader failed to compile: ', compilationLog);
        }

        // attach shaders to program
        gl.attachShader(this.program, this.vertex);
        gl.attachShader(this.program, this.fragment);

        // link shaders together in program
        gl.linkProgram(this.program);

        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(this.program));
            this.compile_success = false;
            return;
        }
        else this.compile_success = true;

        gl.useProgram(this.program);

        // parse shaders for attributes and uniforms, get locations

        const attributeExpression = /attribute [\w\d]+ (\w+)/g;
        const uniformExpression = /uniform [\w\d]+ (\w+)/g;

        this.attributes = new Map();
        this.uniforms = new Map();
        
        for (const shaderSource of [vertexSource, fragmentSource])
        {
            // console.log("parsing shader source code for attributes and uniforms:");
            // console.log(shaderSource);

            for (const match of [...shaderSource.matchAll(attributeExpression)])
            {
                const name = match[1];
                // console.log(`found attribute "${name}" in "${match[0]}"`)
                if (!this.attributes.has(name))
                    this.attributes.set(name, gl.getAttribLocation(this.program, name));
            }
            for (const match of [...shaderSource.matchAll(uniformExpression)])
            {
                const name = match[1]
                // console.log(`found uniform "${name}" in "${match[0]}"`)
                if (!this.uniforms.has(name))
                    this.uniforms.set(name, gl.getUniformLocation(this.program, name));
            }
        }
        // console.log(this.uniforms);
        // console.log(this.attributes);
    }

    bind() { gl.useProgram(this.program); }
};


class BufferLayout
{
    constructor()
    {
        this.attributes = new Map;
        this.stride = 0;
    }

    // name should be the same as in the vertex shader
    push(name, type, count, normalized)
    {
        const attribute = {};

        // index is set by shader
        // attribute.index = this.attributes.length;

        attribute.size = count;
        attribute.type = type;
        attribute.normalized = normalized ? true : false;
        attribute.offset = this.stride;

        // increase the stride
        switch (type)
        {
            // explicitly catch undefined just incase one of the cases is also undefined
            case undefined: alert(`Invalid attribute "${name}": type undefined`); break;
            case gl.BYTE            : this.stride += count;     break;
            case gl.SHORT           : this.stride += count * 2; break;
            case gl.INT             : this.stride += count * 4; break;
            case gl.UNSIGNED_BYTE   : this.stride += count;     break;
            case gl.UNSIGNED_SHORT  : this.stride += count * 2; break;
            case gl.UNSIGNED_INT    : this.stride += count * 4; break;
            case gl.FLOAT           : this.stride += count * 4; break;
            default: alert(`no case exists for the attribute "${name}" of type ${type}`);
        }
        this.attributes.set(name, attribute);
    }

    setAttributePointers(shader)
    {
        for (const [name, attrib] of this.attributes.entries())
        {
            const index = shader.attributes.get(name);
            if (index === -1 || index === undefined) continue;

            gl.vertexAttribPointer(
                index,
                attrib.size,
                attrib.type,
                attrib.normalized,
                this.stride,
                attrib.offset
            );
            gl.enableVertexAttribArray(index);
        }
    }
};

class VertexBuffer
{
    buffer;
    layout;
    vertexCount;

    constructor(data, layout)
    {
        // data better be a byte array and evenly divisible by the stride of the layout!
        this.vertexCount = data.byteLength / layout.stride;

        // layout information for binding shader attributes
        this.layout = layout;

        // create the buffer
        this.buffer = gl.createBuffer();

        // load the data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    }

    bind() { gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer); }
    bindShader(shader) { this.layout.setAttributePointers(shader); }
}

class Model
{
    // VertexBuffer instance
    vbo;

    // Shader instance
    shader;

    // render method
    renderer;

    constructor(args)
    {
        this.vbo = args.vbo;
        this.shader = args.shader;
        this.renderer = args.renderer;
    }

    setRenderer(renderer)
    {
        this.renderer = renderer;
    }

    render(mvp)
    {
        if (this.renderer) this.renderer(this, mvp);
        else // defaul renderer
        {
            this.shader.bind();
            this.vbo.bind();
            this.vbo.bindShader(this.shader);
            
            gl.uniformMatrix4fv(this.shader.uniforms.get("uModelMatrix"), false, mvp.model);
            gl.uniformMatrix4fv(this.shader.uniforms.get("uViewMatrix"), false, mvp.view);
            gl.uniformMatrix4fv(this.shader.uniforms.get("uProjectionMatrix"), false, mvp.projection);
            
            gl.drawArrays(gl.LINES, 0, this.vbo.vertexCount);
        }
    }
};

function createCube()
{
    console.log("creating cube");
    const vertices = [
        // position  3D  | textcoord 2D

        // front
         1.0,  1.0,  1.0,   1.0,  1.0,
        -1.0,  1.0,  1.0,   0.0,  1.0,
         1.0, -1.0,  1.0,   1.0,  0.0,
        -1.0, -1.0,  1.0,   0.0,  0.0,

        // back
         1.0,  1.0, -1.0,   1.0,  1.0,
        -1.0,  1.0, -1.0,   0.0,  1.0,
         1.0, -1.0, -1.0,   1.0,  0.0,
        -1.0, -1.0, -1.0,   0.0,  0.0,

        // top
         1.0,  1.0, -1.0,   1.0,  0.0,
        -1.0,  1.0, -1.0,   0.0,  0.0,
         1.0,  1.0,  1.0,   1.0,  1.0,
        -1.0,  1.0,  1.0,   0.0,  1.0,

        // bottom
         1.0, -1.0, -1.0,   1.0,  0.0,
        -1.0, -1.0, -1.0,   0.0,  0.0,
         1.0, -1.0,  1.0,   1.0,  1.0,
        -1.0, -1.0,  1.0,   0.0,  1.0,

        // left
        -1.0,  1.0,  1.0,   1.0,  1.0,
        -1.0,  1.0, -1.0,   0.0,  1.0,
        -1.0, -1.0,  1.0,   1.0,  0.0,
        -1.0, -1.0, -1.0,   0.0,  0.0,

        // right
         1.0,  1.0, -1.0,   1.0,  1.0,
         1.0,  1.0,  1.0,   0.0,  1.0,
         1.0, -1.0, -1.0,   1.0,  0.0,
         1.0, -1.0,  1.0,   0.0,  0.0,
    ];

    const vbLayout = new BufferLayout();
    vbLayout.push("aVertexPosition", gl.FLOAT, 3, false);
    vbLayout.push("aTextureCoord", gl.FLOAT, 2, false);

    console.log("cube layout: ", vbLayout);

    const vbo = new VertexBuffer(new Float32Array(vertices), vbLayout);

    console.log(`cube vertices length: ${vertices.length}, buffer vertex count: ${vbo.vertexCount}`)

    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;

        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying vec4 vFragColor;
        varying vec2 vTextureCoord;

        void main()
        {
            vFragColor = vec4(aVertexPosition.xyz * 0.5 + 0.5, 1.0);
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
            // vTextureCoord = aTextureCoord;
        }
    `;

    const fsSource = `
        precision highp float;

        varying vec4 vFragColor;
        varying vec2 vTextureCoord;

        // uniform Sampler2D uSampler;
        void main()
        {
            // gl_FragColor = texture2D(uSampler, vTextureCoord);
            // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            gl_FragColor = vFragColor;
        }
    
    `;

    const shader = new Shader(vsSource, fsSource);

    if (!shader.compile_success) return null;

    const model = new Model({ shader: shader, vbo: vbo });

    model.renderer = (model, mvp) => {
        model.shader.bind();
        model.vbo.bind();
        model.vbo.bindShader(model.shader);

        
        gl.uniformMatrix4fv(model.shader.uniforms.get("uModelMatrix"), false, mvp.model);
        gl.uniformMatrix4fv(model.shader.uniforms.get("uViewMatrix"), false, mvp.view);
        gl.uniformMatrix4fv(model.shader.uniforms.get("uProjectionMatrix"), false, mvp.projection);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.drawArrays(gl.TRIANGLE_STRIP, 4, 4);
        gl.drawArrays(gl.TRIANGLE_STRIP, 8, 4);
        gl.drawArrays(gl.TRIANGLE_STRIP, 12, 4);
        gl.drawArrays(gl.TRIANGLE_STRIP, 16, 4);
        gl.drawArrays(gl.TRIANGLE_STRIP, 20, 4);
    };

    return model;
}


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
        
        const point = vec3.create();
        const latAngle = 1.0 / (lattitudeDivisions + 1) * Math.PI;

        for (let i = 0; i < longitudeDivisions + 1; i++)
        {
            const longAngle = twoPI * (i / longitudeDivisions)
            vec3.rotateX(point, topPoint, origin, latAngle);
            vec3.rotateY(point, point, origin, longAngle);
            vertices.push(...point);
        }
    }

    // triangle stips between lattitude lines
    // vertex count = (lattitudeDivisions - 1) * 2(longitudeDivisions + 1)
    {
        const p0 = vec3.create();
        const p1 = vec3.create();

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
            }
        }
    }

    // bottom cap
    // vertex count = ongitudeDivisions + 2
    {
        const bottomPoint = vec3.fromValues(0.0, -1.0, 0.0);
        const point = vec3.create();
        const latAngle = lattitudeDivisions / (lattitudeDivisions + 1) * Math.PI;

        vertices.push(...bottomPoint);

        for (let i = 0; i < longitudeDivisions + 1; i++)
        {
            const longAngle = i / longitudeDivisions * twoPI;
            vec3.rotateX(point, topPoint, origin, latAngle);
            vec3.rotateY(point, point, origin, longAngle);

            vertices.push(...point);
        }
    }

    const vbLayout = new BufferLayout();
    vbLayout.push("aVertexPosition", gl.FLOAT, 3, false);

    console.log("sphere layout: ", vbLayout);

    const vbo = new VertexBuffer(new Float32Array(vertices), vbLayout);

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
    
    if (!shader.compile_success) return null;
    
    const model = new Model({shader: shader, vbo: vbo});

    model.setRenderer((model, mvp) => {
        model.shader.bind();
        model.vbo.bind();
        model.vbo.bindShader(model.shader);

        gl.uniformMatrix4fv(model.shader.uniforms.get("uModelMatrix"), false, mvp.model);
        gl.uniformMatrix4fv(model.shader.uniforms.get("uViewMatrix"), false, mvp.view);
        gl.uniformMatrix4fv(model.shader.uniforms.get("uProjectionMatrix"), false, mvp.projection);

        const capVertexCount = longitudeDivisions + 2;
        const stripVertexCount = 2 * (longitudeDivisions + 1);
        const botCapOffset = capVertexCount + stripVertexCount * (lattitudeDivisions - 1);
    
        gl.drawArrays(gl.TRIANGLE_FAN, 0, capVertexCount);

        for (let i = 0; i < lattitudeDivisions - 1; i++)
        {
            const offset = capVertexCount + i * stripVertexCount;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, stripVertexCount);
        }

        gl.drawArrays(gl.TRIANGLE_FAN, botCapOffset, capVertexCount);
    });
    // model.render = Function.bind(render, model);

    return model;
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
            position: vec3.fromValues(px * 100, py * 100, pz * 100),
            velocity: vec3.fromValues(dx * 0.0, dy * 0.0, dz * 0.0),
            mass: Math.random() + 1.0 * 1000 + 100,
        }

        instances.push(body);
    }

    const stars = [];

    for (let i = 0; i < 5; i++)
    {
        const posAngle = i / 5 * 2 * Math.PI;
        const velAngle = i / 5 * 2 * Math.PI + 0.5 * Math.PI;

        const px = Math.sin(posAngle);
        const py = Math.cos(posAngle);
        
        const dx = Math.sin(velAngle);
        const dy = Math.cos(velAngle);

        star = {
            position: vec3.fromValues(px * 50, py * 50, 0.0),
            velocity: vec3.fromValues(dx * 5, dy * 5, 0.0),
            mass: 1000000,
        };
        stars.push(star);
    }

    const cube = createCube();
    const sphere = createSphere(30, 30);
    
    if (!cube)
    {
        console.log("failed to create cube");
        return;
    }
    else if (!sphere)
    {
        console.log("failed to create sphere");
        return;
    }

    const models = [cube, sphere];

    console.log(models);

    // Draw the scene
    setInterval(drawScene, 1000 / 60, mvp, models, instances, stars);
}

window.onload = main;
