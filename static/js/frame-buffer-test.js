import { gl, setContext, init } from "./modules/common.js";

import { Framebuffer } from "./modules/Framebuffer.js";
import { Model } from './modules/model.js';
import { Shader } from './modules/shader.js';
import { Texture } from './modules/texture.js';
import { VertexBuffer, BufferLayout } from './modules/vertexBuffer.js';
import { createAgents } from "./modules/models/surfaceTexture.js";

async function main()
{
    const dimension = 256;
    const frameTime = 33;

    const canvas = document.getElementById("render-canvas");
    if (!canvas) return null;
    setContext(canvas);
    init(); // from common.js

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // gl.clearDepth(1.0);
    // gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.BLEND);
    // gl.depthFunc(gl.LEQUAL); 
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    
    const testAgents = await createAgents(dimension, dimension);
    // agentRenderer(testAgents, {framebuffer: framebuffer});

    // test model.render
    const renderLoop = setInterval((model) => {
        try {
            gl.clear(gl.COLOR_BUFFER_BIT);
            model.render();
        } catch (error) {
            clearInterval(renderLoop);
            throw error;
        }
    }, frameTime, testAgents);

}

window.onload = main;

