import { gl } from './common.js';

let CURRENT_PROGRAM;
let DEBUG = 1;

function shaderLogging(level)
{
    if (typeof level == "number") DEBUG = level < 0 ? 0 : Math.trunc(level);
    else console.log("warning: invalid debug level in shader.js", level);
}


function parseShader(source)
{
    const expression = new RegExp([
        /(?:(?<!\/\/\s*))/,                 // ignore comments
        /(?<interface>in|out|uniform)\s+/,  // type qualifier
        /(?:(?<precision>\w+)\s+)?/,        // optional precision
        /(?<type>\w+\d?\w?)\s+/,            // actual type
        /(?<name>\w+)\s*/,                  // variable name
                                            // optional default value
        /(?:=\s*(?<default>(?:\w*\d?\([\d.,\s]+\))|(?:\d+(?:\.?\d+)?)))?;/,
        /(?:[\t ]*\/\/[\t ]*(?<comment>[^\r\n]+))?/,  // inline comment
    ].map(p => p.source).join(''), 'g');

    const result = {
        in: new Map(),
        out: new Map(),
        uniform: new Map(),
    }

    for (let match of [...source.matchAll(expression)])
    {
        console.log(match);
        const variable = {
            interface: match.groups.interface,
            precision: match.groups.precision,
            type: match.groups.type,
            name: match.groups.name,
        };

        result[variable.interface].set(variable.name, variable);
    }

    return result;
}

// get attributes and uniforms from sources
function parseProgramSources(vsSource, fsSource, name)
{
    console.log(`parsing shader program "${name ? name : ''}" source code`);

    console.log("vertex shader: ");
    const vertex = parseShader(vsSource);
    console.log("fragment shader: ");
    const fragment = parseShader(fsSource);

    const uniqueUniforms = new Map();

    // combine uniforms (they're the same throught the pipeline)
    for (let uniform of [...vertex.uniform.values(), ...fragment.uniform.values()])
    {
        uniqueUniforms.set(uniform.name, uniform);
    }

    const errors = [];
    const warnings = [];

    // check vertex outputs match fragment inputs
    for (let output of vertex.out.values())
    {
        if(!fragment.in.has(output.name))
            errors.push(`fragment has no input to connect with vertex output "${output.name}"`)
    }

    // check fragment inputs match vetex outputs
    for (let input of fragment.in.values())
    {
        if(!vertex.out.has(input.name))
        {
            errors.push(`vertex has no output to connect with fragment input "${input.name}"`);
            continue;
        }

        const output = vertex.out.get(input.name);

        // check precisions match
        if (input.precision && output.precision && intput.precision != output.precision)
            warnings.push(`"${input.name}" precision mismatch (${input.precision} != ${output.precision})`);

        else if (input.precision && !output.precision)
            warnings.push(`"${input.name}" precision implicit in vertex, but explicit in fragment`);
        else if (!input.precision && output.precision)
            warnings.push(`"${input.name}" precision explicit in vertex, but implicit in fragment`);
        
        // check types match
        if (input.type != output.type)
        {
            errors.push(`"${input.name}" type mismatch (${output.type} != ${input.type})`)
        }
    }

    console.log(vertex.in, vertex.uniform, vertex.out);
    console.log(fragment.in, fragment.uniform, fragment.out);

    return {
        attributes: [...vertex.in.values()],
        uniforms: [...uniqueUniforms.values()],
        errors: errors,
        warnings: warnings,
    }
}

class Shader
{
    name;

    // shader program
    program;

    // shaders in program
    vertex;
    fragment;

    // Map[string, int] of locations
    _attributes;
    _uniforms;
    
    // only warn once
    _warnings;

    constructor(args, fragmentSource, name)
    {
        var vertexSource;

        if (typeof args == "string")
        { // old constructors aruments
            vertexSource = args;
        }
        else if (typeof args == "object")
        {
            name = args.name;
            vertexSource = args.vertexSource;
            fragmentSource = args.fragmentSource;
        }
        else throw Error("invalid args pass to Shader constructor", args);

        this.name = name;

        this.vertex = gl.createShader(gl.VERTEX_SHADER);
        this.fragment = gl.createShader(gl.FRAGMENT_SHADER);
        
        this.program = gl.createProgram();

        this._attributes = new Map();
        this._uniforms = new Map();

        this._warnings = new Set();

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
            console.log(`Vertex shader "${name ? name : ''}" failed to compile: `, compilationLog);
        }

        compileSuccess = gl.getShaderParameter(this.fragment, gl.COMPILE_STATUS);
        if (!compileSuccess)
        {
            compilationLog = gl.getShaderInfoLog(this.fragment);
            console.log(`Fragment shader "${name ? name : ''}" failed to compile: `, compilationLog);
        }

        // attach shaders to program
        gl.attachShader(this.program, this.vertex);
        gl.attachShader(this.program, this.fragment);

        // link shaders together in program
        gl.linkProgram(this.program);

        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        {
            alert(`Unable to initialize the shader program "${name ? name : ''}": ` + gl.getProgramInfoLog(this.program));
            this.compile_success = false;
            return;
        }
        else this.compile_success = true;

        this.bind();

        // parse shader source for attributes and uniforms along with some debugging info
        const parsed = parseProgramSources(vertexSource, fragmentSource, name);

        for (const attrib of parsed.attributes)
            this._attributes.set(attrib.name, gl.getAttribLocation(this.program, attrib.name));

        for (const uniform of parsed.uniforms)
            this._uniforms.set(uniform.name, gl.getUniformLocation(this.program, uniform.name));

        for (const error of parsed.errors)
            console.log(`shader error: ${error}`);

        for (const warning of parsed.warnings)
            console.log(`shader warning: ${warning}`);

        // initial uniform values, useful if these only need to be set once
        if (args.initialUniforms)
        {
            for (var [funcName, uniformName, value] of args.initialUniforms.values())
            {
                if (typeof funcName != "string")
                {
                    throw new TypeError(`expected a string not ${typeof funcName}`);
                    continue;
                }
                else if (typeof uniformName != "string")
                {
                    throw new TypeError(`expected a string not ${typeof uniformName}`);
                    continue;
                }

                const validFuncPattern = /(uniform[1234](?:u?i|f)v?)|(uniformMatrix[1234](?:x[1234])?fv)/;
                const validFuncMatch = validFuncPattern.exec(funcName);

                if (validFuncMatch === null)
                {
                    throw new SyntaxError(`invalid gl call "${funcName}"`);
                    continue;
                }
                
                const location = this.getUniformLoc(uniformName);
                if (location == -1)
                {
                    console.warn("warning: cannot set initial value for uniform"
                        + ` "${uniformName}" in shader ${this.name}`
                        + " it's either isn't in the source code or it got optimized out!");
                    continue;
                }

                if (validFuncMatch[1] && funcName.length == validFuncMatch[1].length)
                    gl[funcName](location, value);
                else if (validFuncMatch[2] && funcName.length == validFuncMatch[2].length)
                    gl[funcName](location, false, value); // uniformMatrix second argument (transpose) is always false
                else
                    throw SyntaxError(`"${funcName}" is not a valid gl call, did you mean`
                        + ` "${validFuncMatch[1] || validFuncMatch[2]}"?`);
            }
        }
    }

    bind()
    {
        if (this.program === CURRENT_PROGRAM) return;
        else
        {
            gl.useProgram(this.program);
            CURRENT_PROGRAM = this.program;
        }
    }

    getAttribLoc(name)
    {
        const location = this._attributes.get(name);

        switch (location)
        {
            case -1:
                if (!this._warnings.has(`attribute_${name}_location_not_found`))
                {
                    console.warn(`warning: shader "${this.name}" attribute "${name}" location is -1`);
                    this._warnings.add(`attribute_${name}_location_not_found`);
                }
                return -1;
                
            case undefined:
                if (!this._warnings.has(`attribute_${name}_location_undefined`))
                {
                    console.warn(`warning: shader "${this.name}" doesn't have attribute "${name}"`);
                    this._warnings.add(`attribute_${name}_location_undefined`);
                }
                return -1;

            default:
                return location;
        }
    }

    getUniformLoc(name)
    {
        const location = this._uniforms.get(name);
        
        switch (location)
        {
            case -1:
                if (!this._warnings.has(`uniform_${name}_location_not_found`))
                {    
                    console.warn(`warning: uniform "${name}" in ${shader} location is -1`);
                    this._warnings.add(`uniform_${name}_location_not_found`);
                }
                return -1;
            
            case undefined:
                if (!this._warnings.has(`uniform_${name}_location_undefined`))
                {
                    console.warn(`warning: shader "${this.name}" doesn't have uniform "${name}"`);
                    this._warnings.add(`uniform_${name}_location_undefined`);
                }
                return -1;

            default:
                return location;
        }
    }
};

export { Shader };
