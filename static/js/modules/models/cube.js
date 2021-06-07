import { gl } from "../common.js";
import { Model } from "../model.js";
import { Shader } from "../shader.js";
import { VertexBuffer, BufferLayout } from "../vertexBuffer.js";
import { Texture } from "../texture.js";

const vertexData = new Float32Array([
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
]);

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

function createCube()
{
    console.log("creating cube");
    
    const vbLayout = new BufferLayout();
    vbLayout.push("aVertexPosition", gl.FLOAT, 3, false);
    vbLayout.push("aTextureCoord", gl.FLOAT, 2, false);
    vbLayout.push("aVertexNormal", gl.FLOAT, 3, false);

    const vbo = new VertexBuffer(vertexData, vbLayout);    

    const shader = new Shader(vsSource, fsSource);

    if (!shader.compile_success) return null;

    const model = new Model({ shader: shader, vbo: vbo });

    // // textures for each face: front back top bottom left right
    // for (let i = 0; i < 6; i ++)
    // {
    //     const args = {width: 64, height: 64};
    //     const data = [];

    //     for (let i = 0; i < 64 * 64; i++)
    //     {
    //         data.push(
    //             Math.floor(Math.sin(2 * Math.PI * i / 10 - 2 * Math.PI / 3) * 128 + 127),
    //             Math.floor(Math.sin(2 * Math.PI * i / 10) * 128 + 127),
    //             Math.floor(Math.sin(2 * Math.PI * i / 10 + 2 * Math.PI / 3) * 128 + 127),
    //             255,
    //         );

    //     }

    //     args.data = new Uint8Array(data);

    //     const texture = new Texture(args);

    //     model.textures.set(i, texture);
    // }

    // model.renderer = (model, mvp) => {
    //     model.shader.bind();
    //     model.vbo.bind();
    //     model.vbo.bindShader(model.shader);

    //     gl.uniformMatrix4fv(model.shader.uniforms.get("uModelMatrix"), false, mvp.model);
    //     gl.uniformMatrix4fv(model.shader.uniforms.get("uViewMatrix"), false, mvp.view);
    //     gl.uniformMatrix4fv(model.shader.uniforms.get("uProjectionMatrix"), false, mvp.projection);

    //     // bind all textures to slots 0 - 5
    //     for (let i = 0; i < 6; i++)
    //     {
    //         model.textures.get(i).bind(i);
    //     }

    //     const uTexture = model.shader.uniforms.get("uTexture");

    //     for (let tex = 0, offset = 0; tex < 6; tex++, offset += 4)
    //     {
    //         gl.uniform1i(uTexture, tex);
    //         gl.drawArrays(gl.TRIANGLE_STRIP, offset, 4);
    //     }
    // };

    model.renderer = (model, mvp) => { return; };

    return model;
}

export { createCube };
