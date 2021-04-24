import { gl } from './common.js';

class Model
{
    // VertexBuffer instance
    vbo;

    // Shader instance
    shader;

    // rendering function
    renderer;

    // map[slot: texture]
    textures

    constructor(args)
    {
        this.vbo = args.vbo;
        this.shader = args.shader;
        this.renderer = args.renderer;
        this.textures = new Map();
    }

    setRenderer(renderer) { this.renderer = renderer; }
    setShader(shader) { this.shader = shader; }
    setTexture(slot, texture) { this.textures.set(slot, texture); }

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

export { Model };
