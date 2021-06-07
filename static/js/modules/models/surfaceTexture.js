import { gl } from "../common.js";
import { Model } from "../model.js";
import { Shader } from "../shader.js";
import { VertexBuffer, BufferLayout } from "../vertexBuffer.js";
import { Texture } from "../texture.js";
import { Framebuffer } from "../Framebuffer.js";

async function requestShaderSources(nameList)
{
    const requests = [];
    const sources = new Map();

    for (let name of nameList)
    {
        const promise = fetch(
            "/assets/shaders/" + name + ".glsl", {
                method: 'GET',
                mode: 'same-origin',
            })
            .then((resp) => {
                if (resp.status == 200)
                    return resp.blob();
                else
                    throw new Error(`${resp.status}: ${resp.statusText}`);
            })
            .then(blob => blob.text())
            .then(txt => sources.set(name, txt))
            .catch(error => {
                console.log("error:", name + ".glsl", error);
                sources.set(name, null);
            });
        requests.push(promise);
    }

    // wait for all the files to download
    await Promise.allSettled(requests);

    return sources;
}

function renderer(model, args)
{
    /* setup variables */

    // vertexbuffers
    const agents_vbo = model.vertexbuffers.get("agents");
    const surface_vbo = model.vertexbuffers.get("surface");

    // shaderes
    const agentTrailsShader = model.shaders.get("agentTrails");
    const drawAgentsShader = model.shaders.get("drawAgents");
    const gaussianBlurShader = model.shaders.get("gaussianBlur");
    const surfaceShader = model.shaders.get("surface");
    const updateAgentsShader = model.shaders.get("updateAgents");
    const updateTrailsShader = model.shaders.get("updateTrails");

    // textures
    const agents0Texture = model.textures.get("agents0");
    const agents1Texture = model.textures.get("agents1");
    const trails0Texture = model.textures.get("trails0");
    const trails1Texture = model.textures.get("trails1");

    // framebuffers
    const agents0Framebuffer = model.framebuffers.get("agents0");
    const agents1Framebuffer = model.framebuffers.get("agents1");
    const trails0Framebuffer = model.framebuffers.get("trails0");
    const trails1Framebuffer = model.framebuffers.get("trails1");

    /* rendering happens in several steps:
     * 
     * 1 update agents positions (agent0Texture -> agents1Texture)
     * 2 blur trails (trails0Texture -> trails1Texture)
     * 3 draw start of trail aka agent position (agents1Texture -> trails1Texture)
     * 4 draw trails to canvas (trails0Texture -> canvas)
     * 5 draw agents to canvas (agents1Texture -> canvas)
     * 6 flip agents textures and framebuffers
    */

    // update agents
    {
        surface_vbo.bind();
        updateAgentsShader.bind();
        surface_vbo.bindShader(updateAgentsShader);

        agents1Framebuffer.bind();
        
        const uAgentsTexture = updateAgentsShader.getUniformLoc("uAgentsTexture");
        const uTrailsTexture = updateAgentsShader.getUniformLoc("uTrailsTexture");

        gl.uniform1i(uAgentsTexture, 0);
        gl.uniform1i(uTrailsTexture, 1);

        agents0Texture.bind(0);
        trails0Texture.bind(1);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, surface_vbo.vertexCount);

        agents0Texture.unbind();
        trails0Texture.unbind();
    }

    // blur trails
    {
        surface_vbo.bind();
        gaussianBlurShader.bind();
        surface_vbo.bindShader(gaussianBlurShader);

        const uTexture = gaussianBlurShader.getUniformLoc("uTexture");
        gl.uniform1i(uTexture, 0);

        trails0Texture.bind(0);
        trails1Framebuffer.bind();

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, surface_vbo.vertexCount);

        trails0Texture.unbind();
    }

    // draw start of trail
    {
        agents_vbo.bind();
        agentTrailsShader.bind();
        agents_vbo.bindShader(agentTrailsShader);

        const uAgentsTexture = agentTrailsShader.getUniformLoc("uAgentsTexture");
        const uTrailsTexture = agentTrailsShader.getUniformLoc("uTrailsTexture");

        gl.uniform1i(uAgentsTexture, 0);
        gl.uniform1i(uTrailsTexture, 1);

        agents1Texture.bind(0);
        trails1Texture.bind(1);
        trails0Framebuffer.bind();

        gl.drawArrays(gl.POINTS, 0, agents_vbo.vertexCount);

        agents1Texture.unbind();
        trails1Texture.unbind();
    }

    // debug
    // {
    //     surface_vbo.bind();
    //     surfaceShader.bind();
    //     surface_vbo.bindShader(surfaceShader);

    //     const uTexture = surfaceShader.getUniformLoc("uTexture");
    //     gl.uniform1i(uTexture, 0);

    //     Framebuffer.bindNull();
    //     trails0Texture.bind(0);

    //     gl.drawArrays(gl.TRIANGLE_STRIP, 0, surface_vbo.vertexCount);

    //     trails0Texture.unbind(); 
    // }

    // draw agents to canvas
    {
        agents_vbo.bind();
        drawAgentsShader.bind();
        agents_vbo.bindShader(drawAgentsShader);

        const uAgentsTexture = drawAgentsShader.getUniformLoc("uAgentsTexture");
        gl.uniform1i(uAgentsTexture, 0);

        Framebuffer.bindNull();
        agents0Texture.bind(0);

        gl.drawArrays(gl.POINTS, 0, agents_vbo.vertexCount);

        agents0Texture.unbind();
    }

    // flip textures and framebuffers
    {
        agents0Texture.unbindAll();
        agents1Texture.unbindAll();

        trails0Texture.unbindAll();
        trails1Texture.unbindAll();

        model.textures.set("agents0", agents1Texture);
        model.textures.set("agents1", agents0Texture);

        /* trails should already be flipped */
        // model.textures.set("trails0", trails1Texture);
        // model.textures.set("trails1", trails0Texture);

        model.framebuffers.set("agents0", agents1Framebuffer);
        model.framebuffers.set("agents1", agents0Framebuffer);
    }

    return;

}

async function createAgents(width, height)
{
    const agentsVertices = [];
    
    for (let i = 0; i < width; i++)
    {
        for (let j = 0; j < height; j++)
        {
            // position -1.0 to 1.0, centered on pixels
            const x = (i / width + 1.0 / width / 2.0) * 2.0 - 1.0;
            const y = (j / height + 1.0 / height / 2.0) * 2.0 - 1.0;
            // texture cordinate 0.0 to 1.0, centered on pixels
            const s = i / width + 1.0 / width / 2.0;
            const t = j / height + 1.0 / height / 2.0;
            agentsVertices.push(x, y, s, t);

            if (i == 127 && j == 127) console.log(`agents ${x}, ${y}, ${s}, ${t}`);
            if (i == width -1 && j == height - 1) console.log(`agents ${x}, ${y}, ${s}, ${t}`);
        }
    }

    const surfaceVertices = [
        -1.0,  1.0,  0.0, 1.0,
         1.0,  1.0,  1.0, 1.0,
        -1.0, -1.0,  0.0, 0.0,
         1.0, -1.0,  1.0, 0.0,
    ];

    const vbLayout = new BufferLayout();
    
    vbLayout.push("aVertexPosition", gl.FLOAT, 2, false);
    vbLayout.push("aTextureCoord", gl.FLOAT, 2, false);
    
    const agents_vbo = new VertexBuffer(new Float32Array(agentsVertices), vbLayout);
    const surface_vbo = new VertexBuffer(new Float32Array(surfaceVertices), vbLayout);

    // get shader source code from server
    const sources = await requestShaderSources([
        /* vertex               fragment   */
        "vsAgentTrails",    "fsAgentTrails",
        "vsDrawAgents",     "fsDrawAgents",
        "vsGaussianBlur",   "fsGaussianBlur",
        "vsSurface",        "fsSurface",
        "vsUpdateAgents",   "fsUpdateAgents",
        "vsUpdateTrails",   "fsUpdateTrails",
    ]);

    for (var [name, source] of sources.entries())
        if (source === null) throw Error(`could not get shader source code for ${name}`);

    // shader programs
    const updateAgentsShader = new Shader({
        name: "updateAgents",
        vertexSource: sources.get("vsUpdateAgents"),
        fragmentSource: sources.get("fsUpdateAgents"),
        initialUniforms: [
            ["uniform1f", "uVisionAngle", 0.18],
            ["uniform1f", "uVisionRadius", 3.0]],
    });
    const drawAgentsShader = new Shader({
        name: "drawAgents",
        vertexSource: sources.get("vsDrawAgents"),
        fragmentSource: sources.get("fsDrawAgents"),
    });
    const updateTrailsShader = new Shader({
        name: "updateTrails",
        vertexSource: sources.get("vsUpdateTrails"),
        fragmentSource: sources.get("fsUpdateTrails"),
    });
    const agentTrailsShader = new Shader({
        name: "agentTrails",
        vertexSource: sources.get("vsAgentTrails"),
        fragmentSource: sources.get("fsAgentTrails"),
        initialUniforms: [
            ["uniform1f", "uTrailWeight", 0.5]],
    });
    const surfaceShader = new Shader({
        name: "surface",
        vertexSource: sources.get("vsSurface"),
        fragmentSource: sources.get("fsSurface"),
    });
    const gaussianBlurShader = new Shader({
        name: "gaussianBlur",
        vertexSource: sources.get("vsGaussianBlur"),
        fragmentSource: sources.get("fsGaussianBlur"),
        initialUniforms: [
            ["uniformMatrix3fv", "uKernel", new Float32Array([
                1.0,  2.0, 1.0,
                2.0,  12.0, 2.0,
                1.0,  2.0, 1.0])],
            ["uniform1f", "uKernelWeight", 24.0],
            ["uniform1f", "uFade", 0.9]],
    });

    const startingAgents = [];

    for (let i = 0; i < width; i++)
    {
        for (let j = 0; j < height; j++)
        {
            const x = Math.random() * 255;
            const y = Math.random() * 255;
            const z = Math.random() * 255;
            const a = Math.random() * 255;
            startingAgents.push(x, y, z, a);
        }
    }

    const startingAgentsRaw = new Uint8Array(startingAgents);

    console.log("starting agents", startingAgentsRaw);

    const startingTrails = [];

    for (let i = 0; i < width; i++)
    {
        for (let j = 0; j < height; j++)
        {
            startingTrails.push(0, 0, 0, 255);
        }
    }

    const agentTextureArgs = {
        width: width,
        height: height,
        parameters: [
            [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
            [gl.TEXTURE_WRAP_S, gl.REPEAT],
            [gl.TEXTURE_WRAP_T, gl.REPEAT],
        ],
        data: startingAgentsRaw,
        internalFormat: gl.RGBA8,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
    };

    const trailTextureArgs = {
        width: width,
        height: height,
        parameters: [
            [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
            [gl.TEXTURE_WRAP_S, gl.REPEAT],
            [gl.TEXTURE_WRAP_T, gl.REPEAT],
        ],
        data: new Uint8Array(startingTrails),
        internalFormat: gl.RGBA8,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
    };

    const agents0Texture = new Texture(agentTextureArgs);
    const agents1Texture = new Texture(agentTextureArgs);
    const trails0Texture = new Texture(trailTextureArgs);
    const trails1Texture = new Texture(trailTextureArgs);

    const agents0Framebuffer = new Framebuffer();
    const agents1Framebuffer = new Framebuffer();
    const trails0Framebuffer = new Framebuffer();
    const trails1Framebuffer = new Framebuffer();

    // attach textures to their respective framebuffers
    agents0Framebuffer.bind();
    agents0Framebuffer.attach(agents0Texture, 0);
    agents1Framebuffer.bind();
    agents1Framebuffer.attach(agents1Texture, 0);
    trails0Framebuffer.bind();
    trails0Framebuffer.attach(trails0Texture, 0);
    trails1Framebuffer.bind();
    trails1Framebuffer.attach(trails1Texture, 0);

    const model = new Model({
        name: "agents",
        renderer: renderer,
        vertexbuffers: [
            ["agents", agents_vbo],
            ["surface", surface_vbo],
        ],
        shaders: [
            ["agentTrails", agentTrailsShader],
            ["drawAgents", drawAgentsShader],
            ["gaussianBlur", gaussianBlurShader],
            ["surface", surfaceShader],
            ["updateAgents", updateAgentsShader],
            ["updateTrails", updateTrailsShader],
        ],
        textures: [
            ["agents0", agents0Texture],
            ["agents1", agents1Texture],
            ["trails0", trails0Texture],
            ["trails1", trails1Texture],
        ],
        framebuffers: [
            ["agents0", agents0Framebuffer],
            ["agents1", agents1Framebuffer],
            ["trails0", trails0Framebuffer],
            ["trails1", trails1Framebuffer],
        ],
    });
    
    return model;
}

export { createAgents };
