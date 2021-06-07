import { gl } from './common.js';

class Model
{
    name;
    
    // function
    renderer;
    
    // everything the renderer needs
    vertexbuffers;
    shaders;
    textures;
    framebuffers;

    constructor(args)
    {
        this.name = args.name;
        this.renderer = args.renderer;

        this.vertexbuffers = new Map();
        this.shaders = new Map();
        this.textures = new Map();
        this.framebuffers = new Map();

        // complex models have more than one vbo/shader/texture/fb
        // lets map them for ease of access

        if (args.vertexbuffers)
            for (let [ name, vbo ] of args.vertexbuffers)
                this.vertexbuffers.set(name, vbo);

        if (args.shaders)
            for (const [name, shader] of args.shaders)
                this.shaders.set(name, shader);

        if (args.textures)
            for (let [ name, texture ] of args.textures)
                this.textures.set(name, texture);

        if (args.framebuffers)
            for (const [name, fb] of args.framebuffers)
                this.framebuffers.set(name, fb);
    }

    setRenderer(renderer) { this.renderer = renderer; }
    setShader(shader) { this.shader = shader; }
    setTexture(slot, texture) { this.textures.set(slot, texture); }

    render(mvp)
    {
        if (this.renderer) this.renderer(this, mvp);
        else // default renderer
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

export { Model };
