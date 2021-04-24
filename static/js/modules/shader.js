import { gl } from './common.js';

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

export { Shader };
