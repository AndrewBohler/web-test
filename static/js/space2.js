import { VertexBuffer, BufferLayout } from './modules/vertexBuffer.js';
import { Model } from './modules/model.js';
import { Shader } from './modules/shader.js';
import { gl, setContext } from './modules/common.js';

var canvas;


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
    const zNear = 1.0;
    const zFar = 10000.0;

    const mvp = {
        model: mat4.create(),
        view: mat4.create(),
        projection: mat4.create()
    }

    mat4.perspective(mvp.projection, fieldOfView, aspect, zNear, zFar);
    mat4.translate(mvp.view, mvp.view, [0.0, 0.0, -150.0]);

    return mvp;
}

function createCubeMVP()
{
    const fieldOfView = Math.PI / 2;
    const aspect = 1.0; // square
    const zNear = 1.0;
    const zFar = 10000.0;

    const mvp = {
        model: mat4.create(),
        view: mat4.create(),
        projection: mat4.create()
    }

    mat4.perspective(mvp.projection, fieldOfView, aspect, zNear, zFar);

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

const origin = mat4.create();

function drawScene(frameBuffer, mvp, models, instances, stars, cubemvp)
{   
    mat4.rotateY(mvp.view, mvp.view, 0.005);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    models.cube.shader.bind();

    const projectionViewMatrix = mat4.create();
    mat4.mul(projectionViewMatrix, mvp.projection, mvp.view);

    const eye = vec3.fromValues(0.0, 0.0, 0.0);

    const camera = [
        mat4.create(), // front
        mat4.create(), // back
        mat4.create(), // top
        mat4.create(), // bottom
        mat4.create(), // left
        mat4.create(), // right
    ];

    //             out     eye,       center,               up
    mat4.lookAt(camera[0], eye, [ 0.0,  0.0,  1.0], [ 0.0,  1.0,  0.0]);
    mat4.lookAt(camera[1], eye, [ 0.0,  0.0, -1.0], [ 0.0,  1.0,  0.0]);
    mat4.lookAt(camera[2], eye, [ 0.0,  1.0,  0.0], [ 0.0,  1.0,  0.0]);
    mat4.lookAt(camera[3], eye, [ 0.0, -1.0,  0.0], [ 0.0,  1.0,  0.0]);
    mat4.lookAt(camera[4], eye, [ 1.0,  0.0,  0.0], [ 0.0,  1.0,  0.0]);
    mat4.lookAt(camera[5], eye, [-1.0,  0.0,  0.0], [ 0.0,  1.0,  0.0]);
    
    // uniform locations
    const uModelMatrix = models.cube.shader.uniforms.get("uModelMatrix");
    const uViewMatrix = models.cube.shader.uniforms.get("uViewMatrix");

    // view is the same for this frame
    gl.uniformMatrix4fv(uViewMatrix, false, mvp.view);
    
    // size of textures we're rendering to
    // gl.viewport(0, 0, 100, 100);

    const uTexture = models.cube.shader.uniforms.get("uTexture");
    const uUseTexture = models.cube.shader.uniforms.get("uTexture");
    
    // render cubes to canvas
    for (let starIndex = 0; starIndex < stars.length; starIndex++)
    {
        const star = stars[starIndex];

        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

        // gl.clearColor(1.0, 1.0, 1.0, 1.0);
        
        models.cube.shader.bind();
        
        gl.uniform1i(uUseTexture, false);
        // gl.uniform1i(uTexture, 0);

        gl.viewport(0, 0, 100, 100);
        
        // render all faces
        for (let vi = 0; vi < 6; vi++)
        {
            // move this view to star position
            mat4.invert(cubemvp.view, camera[vi]);
            mat4.translate(cubemvp.view, cubemvp.view, star.position);
            
            {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, models.cube.textures.get(vi), 0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                // render spheres to texture
                for (let i = 0; i < instances.length; i++)
                {
                    const inst = instances[i];

                    mat4.fromRotation(cubemvp.model, Math.hypot(...inst.position), inst.position);
                    mat4.translate(cubemvp.model, cubemvp.model, inst.position);
                    // mat4.scale(cubemvp.model, cubemvp.model, vec3.fromValues(10, 10, 10));

                    models.sphere.render(cubemvp);
                }

                // tell shader to not to use texture
                models.cube.shader.bind();
                gl.uniform1i(uUseTexture, false);

                // render cubes to texture
                for (let i = 0; i < stars.length; i++)
                {
                    if (i == starIndex) continue;
                    
                    const star = stars[i];

                    // mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
                    mat4.translate(cubemvp.model, origin, star.position);
                    mat4.scale(cubemvp.model, cubemvp.model, vec3.fromValues(10, 10, 10));

                    models.cube.render(cubemvp);
                }                
            }
        }

        gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

        // unbind texture so we can read from it 
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);

        // unbind framebuffer to render to canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        mat4.translate(mvp.model, origin, star.position);
        mat4.scale(mvp.model, mvp.model, [10, 10, 10]);

        // manually bind textures
        for (let tex = 0; tex < 6; tex++) {
            gl.activeTexture(gl.TEXTURE0 + tex);
            gl.bindTexture(gl.TEXTURE_2D, models.cube.textures.get(tex));
        }

        models.cube.shader.bind();
        gl.uniform1i(models.cube.shader.uniforms.get("uUseTexture"), 1);

        models.cube.render(mvp);

        // manually unbind textures
        for (let tex = 0; tex < 6; tex++) {
            gl.activeTexture(gl.TEXTURE0 + tex);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }

    } // render cubes to canvas

    // if (true)
    // {
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //     for (let star of stars)
    //     {
    //         mat4.translate(mvp.model, origin, star.position);

    //         models.cube.render(mvp);
    //     }
    // }
    
    { // render spheres to canvas
        // unbind any frambuffer so we can draw to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // make sure viewport is right size
        // gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

        for (let i = 0; i < instances.length; i++)
        {
            const inst = instances[i];

            mat4.fromRotation(mvp.model, Math.hypot(...inst.position), inst.position);
            mat4.translate(mvp.model, mvp.model, inst.position);
            // mat4.scale(mvp.model, mvp.model, vec3.fromValues(10, 10, 10));

            models.sphere.render(mvp);
        }
    } // render spheres to canvas

    // apply gravity
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


// used for cube faces, not really much of a camera
class CubeFaceCamera
{
    lookFront(viewMatrix, modelMatrix)  { mat4.copy(viewMatrix, modelMatrix); } // same as model matrix
    lookBack(viewMatrix, modelMatrix)   { mat4.rotateY(viewMatrix, modelMatrix, Math.PI); }
    lookLeft(viewMatrix, modelMatrix)   { mat4.rotateY(viewMatrix, modelMatrix, Math.PI / 2.0); }
    lookRight(viewMatrix, modelMatrix)  { mat4.rotateY(viewMatrix, modelMatrix, Math.PI / -2.0); }
    lookTop(viewMatrix, modelMatrix)    { mat4.rotateX(viewMatrix, modelMatrix, Math.PI / 2); }
    lookBottom(viewMatrix, modelMatrix) { mat4.rotateX(viewMatrix, modelMatrix, Math.PI / -2); }
}   


function createCube()
{
    console.log("creating cube");
    const vertices = [
        // position  3D  | textcoord 2D | normal 3D

        // front
         1.0,  1.0,  1.0,   0.0,  1.0,   0.0,  0.0,  1.0,
        -1.0,  1.0,  1.0,   1.0,  1.0,   0.0,  0.0,  1.0,
         1.0, -1.0,  1.0,   0.0,  0.0,   0.0,  0.0,  1.0,
        -1.0, -1.0,  1.0,   1.0,  0.0,   0.0,  0.0,  1.0,

        // back
         1.0,  1.0, -1.0,   1.0,  1.0,   0.0,  0.0, -1.0,
        -1.0,  1.0, -1.0,   0.0,  1.0,   0.0,  0.0, -1.0,
         1.0, -1.0, -1.0,   1.0,  0.0,   0.0,  0.0, -1.0,
        -1.0, -1.0, -1.0,   0.0,  0.0,   0.0,  0.0, -1.0,

        // top
         1.0,  1.0, -1.0,   1.0,  0.0,   0.0,  1.0,  0.0,
        -1.0,  1.0, -1.0,   0.0,  0.0,   0.0,  1.0,  0.0,
         1.0,  1.0,  1.0,   1.0,  1.0,   0.0,  1.0,  0.0,
        -1.0,  1.0,  1.0,   0.0,  1.0,   0.0,  1.0,  0.0,

        // bottom
         1.0, -1.0, -1.0,   1.0,  1.0,   0.0, -1.0,  0.0,
        -1.0, -1.0, -1.0,   0.0,  1.0,   0.0, -1.0,  0.0,
         1.0, -1.0,  1.0,   1.0,  0.0,   0.0, -1.0,  0.0,
        -1.0, -1.0,  1.0,   0.0,  0.0,   0.0, -1.0,  0.0,

        // left
        -1.0,  1.0,  1.0,   0.0,  1.0,  -1.0,  0.0,  0.0,
        -1.0,  1.0, -1.0,   1.0,  1.0,  -1.0,  0.0,  0.0,
        -1.0, -1.0,  1.0,   0.0,  0.0,  -1.0,  0.0,  0.0,
        -1.0, -1.0, -1.0,   1.0,  0.0,  -1.0,  0.0,  0.0,

        // right
         1.0,  1.0, -1.0,   0.0,  1.0,   1.0,  0.0,  0.0,
         1.0,  1.0,  1.0,   1.0,  1.0,   1.0,  0.0,  0.0,
         1.0, -1.0, -1.0,   0.0,  0.0,   1.0,  0.0,  0.0,
         1.0, -1.0,  1.0,   1.0,  0.0,   1.0,  0.0,  0.0,
    ];

    const vbLayout = new BufferLayout();
    vbLayout.push("aVertexPosition", gl.FLOAT, 3, false);
    vbLayout.push("aTextureCoord", gl.FLOAT, 2, false);
    vbLayout.push("aVertexNormal", gl.FLOAT, 3, false);

    console.log("cube layout: ", vbLayout);

    const vbo = new VertexBuffer(new Float32Array(vertices), vbLayout);

    console.log(`cube vertices length: ${vertices.length}, buffer vertex count: ${vbo.vertexCount}`)

    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;
        attribute vec4 aVertexNormal;

        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying vec4 vFragColor;
        varying vec2 vTextureCoord;
        varying vec4 vFragNormal;

        void main()
        {
            vFragNormal = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexNormal;
            
            // discard vertex if normal faces away from camera
            if (vFragNormal.z <= 0.0) 
            {
                gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
                vFragColor.z = 0.0;
            }
            else
            {
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
                vFragColor = vec4(aVertexPosition.xyz * 0.5 + 0.5, 1.0);
                vTextureCoord = aTextureCoord;
            }
        }
    `;

    const fsSource = `
        precision highp float;
        
        uniform int uUseTexture;
        uniform sampler2D uTexture;
        
        varying vec4 vFragColor;
        varying vec2 vTextureCoord;
        
        void main()
        {
            if ( vFragColor.a == 0.0)
            {
                discard;
            }
            else if (uUseTexture == 1)
            {
               gl_FragColor = texture2D(uTexture, vTextureCoord);
            }
            else
            {
                gl_FragColor = vFragColor;
            }
        }
    `;

    const shader = new Shader(vsSource, fsSource);

    if (!shader.compile_success) return null;

    const model = new Model({ shader: shader, vbo: vbo });

    // textures for each face: front back top bottom left right
    for (let i = 0; i < 6; i ++) model.textures.set(i, gl.createTexture());

    // configure textures
    for (let texture of model.textures.values())
    {
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 100.0;
        const height = 100.0;
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



    model.renderer = (model, mvp) => {
        model.shader.bind();
        model.vbo.bind();
        model.vbo.bindShader(model.shader);

        gl.uniformMatrix4fv(model.shader.uniforms.get("uModelMatrix"), false, mvp.model);
        gl.uniformMatrix4fv(model.shader.uniforms.get("uViewMatrix"), false, mvp.view);
        gl.uniformMatrix4fv(model.shader.uniforms.get("uProjectionMatrix"), false, mvp.projection);

        // // bind textures
        // for (let i = 0; i < 6; i++)
        // {
        //     gl.activeTexture(gl.TEXTURE0 + i);
        //     gl.bindTexture(gl.TEXTURE_2D, model.textures.get(i));
        // }

        const uTexture = model.shader.uniforms.get("uTexture");

        for (let tex = 0, offset = 0; tex < 6; tex++, offset += 4)
        {
            gl.uniform1i(uTexture, tex);
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, 4);
        }

        // // unbind textures
        // for (let i = 0; i < 6; i++)
        // {
        //     gl.activeTexture(gl.TEXTURE0 + i);
        //     gl.bindTexture(gl.TEXTURE_2D, null);
        // }

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
    canvas = document.querySelector('#render-canvas');
    setContext(canvas);
  
    // If we don't have a GL context, give up now
    if (!gl) {
      alert('Unable to initialize WebGL. Your browser or machine may not support it.');
      return;
    }

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
            velocity: vec3.fromValues(dx * 1, dy * 1, dz * 1),
            mass: Math.random() + 1.0 * 1000 + 100,
            id: id++,
        }

        instances.push(body);
    }

    // instances.push({position: vec3.fromValues(30, 0, 0), velocity: vec3.fromValues(0, 0, 0.4), mass: 1000, id: id++});

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

    const models = {cube: cube, sphere: sphere};

    console.log(models);

    const mvp = createMVP();
    const cubemvp = createCubeMVP();

    // camera projection doesn't change ever
    gl.uniformMatrix4fv(cube.shader.uniforms.get("uProjectionMatrix"), false, mvp.projection);

    // Draw the scene
    setInterval(drawScene, 1000 / 15, frameBuffer, mvp, models, instances, stars, cubemvp);
}

window.onload = main;
