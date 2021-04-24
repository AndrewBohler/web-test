import { VertexBuffer, BufferLayout } from './modules/vertexBuffer.js';
import { Model } from './modules/model.js';
import { Shader } from './modules/shader.js';
import { gl, setContext } from './modules/common.js';


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
    mat4.translate(mvp.view, mvp.view, [-0.0, 0.0, -150.0]);

    return mvp;
}


function updateVelocities(instances, stars)
{
    // placeholders
    const G = -0.00000001;
    const TS = 1.0;

    for (let body of instances)
    {
        // other bodies
        for (let other of instances)
        {
            if (body.id == other.id) continue;

            const dist = Math.hypot(
                other.position[0] - body.position[0],
                other.position[1] - body.position[1],
                other.position[2] - body.position[2]
            );

            if (dist < 1) continue;

            const distSquared = Math.pow(dist, 2);

            body.velocity[0] += (G * body.mass * other.mass * (body.position[0] - other.position[0])) / distSquared / body.mass;
            body.velocity[1] += (G * body.mass * other.mass * (body.position[1] - other.position[1])) / distSquared / body.mass;
            body.velocity[2] += (G * body.mass * other.mass * (body.position[2] - other.position[2])) / distSquared / body.mass;
        }

        // stars
        for (let star of stars)
        {
            const dist = Math.hypot(
                star.position[0] - body.position[0],
                star.position[1] - body.position[1],
                star.position[2] - body.position[2]
            );

            if (dist < 1) continue;

            const distSquared = Math.pow(dist, 2);

            body.velocity[0] += (G * body.mass * star.mass * (body.position[0] - star.position[0])) / distSquared / body.mass;
            body.velocity[1] += (G * body.mass * star.mass * (body.position[1] - star.position[1])) / distSquared / body.mass;
            body.velocity[2] += (G * body.mass * star.mass * (body.position[2] - star.position[2])) / distSquared / body.mass;
        }
    }

    // stars vs stars
    for (let star of stars)
    {
        for (let other of stars)
        {    
            if (star.id == other.id) continue;

            const dist = Math.hypot(
                other.position[0] - star.position[0],
                other.position[1] - star.position[1],
                other.position[2] - star.position[2]
            );

            if (dist < 10) continue;

            const sqrtDist = Math.pow(dist, 2);

            star.velocity[0] += (G * star.mass * other.mass * (star.position[0] - other.position[0])) / sqrtDist / star.mass;
            star.velocity[1] += (G * star.mass * other.mass * (star.position[1] - other.position[1])) / sqrtDist / star.mass;
            star.velocity[2] += (G * star.mass * other.mass * (star.position[2] - other.position[2])) / sqrtDist / star.mass;
        }

        for (let other of instances)
        {    
            const dist = Math.hypot(
                other.position[0] - star.position[0],
                other.position[1] - star.position[1],
                other.position[2] - star.position[2]
            );

            if (dist < 10) continue;

            const sqrtDist = Math.pow(dist, 2);

            star.velocity[0] += (G * star.mass * other.mass * (star.position[0] - other.position[0])) / sqrtDist / star.mass;
            star.velocity[1] += (G * star.mass * other.mass * (star.position[1] - other.position[1])) / sqrtDist / star.mass;
            star.velocity[2] += (G * star.mass * other.mass * (star.position[2] - other.position[2])) / sqrtDist / star.mass;
        }
    }
}


function drawScene(frameBuffer, texture, mvp, models, instances, stars)
{   
    mat4.rotateX(mvp.view, mvp.view, 0.01);

    const cubeShader = models[0].shader;

    cubeShader.bind();
    const uUseTexture = cubeShader.uniforms.get("uUseTexture");
    const uTexture = cubeShader.uniforms.get("uTexture");

    // draw to framebuffer
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        cubeShader.bind();

        gl.uniform1i(uUseTexture, false);
        gl.uniform1i(uTexture, 0);

        for (let i = 0; i < instances.length; i++)
        {
            const inst = instances[i];
            const model = models[1];

            mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
            mat4.translate(mvp.model, mvp.model, inst.position);


            model.render(mvp);
        }

        for (let i = 0; i < stars.length; i++)
        {
            const inst = stars[i];
            const model = models[0];

            mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
            mat4.translate(mvp.model, mvp.model, inst.position);
            mat4.scale(mvp.model, mvp.model, vec3.fromValues(5, 5, 5));

            model.render(mvp);
        }

        // free texture for reading?
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // draw to canvas
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.uniform1i(uTexture, 0);
        gl.uniform1i(uUseTexture, true);

        for (let i = 0; i < instances.length; i++)
        {
            const inst = instances[i];
            const model = models[1];

            mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
            mat4.translate(mvp.model, mvp.model, inst.position);


            model.render(mvp);
        }

        for (let i = 0; i < stars.length; i++)
        {
            const inst = stars[i];
            const model = models[0];

            mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
            mat4.translate(mvp.model, mvp.model, inst.position);
            mat4.scale(mvp.model, mvp.model, vec3.fromValues(5, 5, 5));

            model.render(mvp);
        }

        // free texture for writing?
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    for (let i = 0; i < 10; i++)
    {
        updateVelocities(instances, stars);
        
        for (const bodies of [stars, instances])
        {
            for (const body of bodies)
            {
                body.position[0] += body.velocity[0];
                body.position[1] += body.velocity[1];
                body.position[2] += body.velocity[2];
            }
        }
    }
}


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

        varying vec4 vFragPosition;
        varying vec2 vTextureCoord;

        void main()
        {
            vFragPosition = vec4(aVertexPosition.xyz * 0.5 + 0.5, 1.0);
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
            vTextureCoord = aTextureCoord;
        }
    `;

    const fsSource = `
        precision highp float;

        varying vec4 vFragPosition;
        varying vec2 vTextureCoord;

        uniform int uUseTexture;
        uniform sampler2D uTexture;

        void main()
        {
            if (uUseTexture == 1)
            {
                gl_FragColor = texture2D(uTexture, vTextureCoord);
            }
            else
            {
                gl_FragColor = vFragPosition;
            }
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
            for (let j = 0; j < longitudeDivisions + 1; j++)
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


function main()
{    
    const canvas = document.querySelector('#render-canvas');
    setContext(canvas);
  
    // If we don't have a GL context, give up now
    if (!gl) {
      alert('Unable to initialize WebGL. Your browser or machine may not support it.');
      return;
    }



    const mvp = createMVP();

    setupScene();

    let id = 0;

    const instances = [];
    for (let i = 0; i < 100; i++)
    {
        const px = Math.random() - 0.5;
        const py = Math.random() - 0.5;
        const pz = Math.random() - 0.5;
        const dx = Math.random() - 0.5;
        const dy = Math.random() - 0.5;
        const dz = Math.random() - 0.5;

        const body = {
            position: vec3.fromValues(px * 100, py * 100, pz * 100),
            velocity: vec3.fromValues(dx * 0.0, dy * 0.0, dz * 0.0),
            mass: Math.random() + 1.0 * 1000 + 100,
            id: id++,
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

        const star = {
            position: vec3.fromValues(px * 50, py * 50, 0.0),
            velocity: vec3.fromValues(dx * 0.3, dy * 0.3, 0.0),
            mass: 100000,
            id: id++,
        };
        stars.push(star);
    }

    stars.push({
        position: vec3.fromValues(0.0, 0.0, 0.0),
        velocity: vec3.fromValues(0.0, 0.0, 0.0),
        mass: 10000000,
        id: id++,
    })

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

    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    const texture = gl.createTexture();

    // set up texture properties
    {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        const data = null;

        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    const models = [cube, sphere];

    console.log(models);

    // Draw the scene
    setInterval(drawScene, 1000 / 15, frameBuffer, texture, mvp, models, instances, stars);
}

window.onload = main;
