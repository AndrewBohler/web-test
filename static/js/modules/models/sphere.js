import { gl } from "../common.js";
import { Model } from "../model.js";
import { Shader } from "../shader.js";
import { VertexBuffer, BufferLayout } from "../vertexBuffer.js";

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
    // vertex count = longitudeDivisions + 2
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

    return model;
}

export { createSphere };