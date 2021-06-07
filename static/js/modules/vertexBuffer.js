import { gl } from './common.js';

let CURRENT_BUFFER;


class BufferLayout
{
    constructor()
    {
        this.attributes = new Map;
        this.stride = 0;
    }

    // name should be the same as in the vertex shader
    push(name, type, count, normalized)
    {
        const attribute = {};

        // index is set by shader
        // attribute.index = this.attributes.length;

        attribute.size = count;
        attribute.type = type;
        attribute.normalized = normalized ? true : false;
        attribute.offset = this.stride;

        // increase the stride
        switch (type)
        {
            // explicitly catch undefined just incase one of the cases is also undefined
            case undefined: alert(`Invalid attribute "${name}": type undefined`); break;
            case gl.BYTE            : this.stride += count;     break;
            case gl.SHORT           : this.stride += count * 2; break;
            case gl.INT             : this.stride += count * 4; break;
            case gl.UNSIGNED_BYTE   : this.stride += count;     break;
            case gl.UNSIGNED_SHORT  : this.stride += count * 2; break;
            case gl.UNSIGNED_INT    : this.stride += count * 4; break;
            case gl.FLOAT           : this.stride += count * 4; break;
            default: alert(`no case exists for the attribute "${name}" of type ${type}`);
        }
        this.attributes.set(name, attribute);
    }

    setAttributePointers(shader)
    {
        for (const [name, attrib] of this.attributes.entries())
        {
            const index = shader.getAttribLoc(name);
            if (index === -1 || index === undefined) continue;

            gl.vertexAttribPointer(
                index,
                attrib.size,
                attrib.type,
                attrib.normalized,
                this.stride,
                attrib.offset
            );
            gl.enableVertexAttribArray(index);
        }
    }
};

class VertexBuffer
{
    buffer;
    layout;
    vertexCount;

    constructor(data, layout)
    {
        // data better be a byte array and evenly divisible by the stride of the layout!
        this.vertexCount = data.byteLength / layout.stride;

        // layout information for binding shader attributes
        this.layout = layout;

        // create the buffer
        this.buffer = gl.createBuffer();

        // load the data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    }

    release() {
        gl.deleteBuffer(this.buffer);
        this.buffer = null;
    }

    bind()
    {
        if (this.buffer === CURRENT_BUFFER) return;
        else
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            CURRENT_BUFFER = this.buffer;
        }
    }

    bindShader(shader) { this.layout.setAttributePointers(shader); }
}

export { VertexBuffer, BufferLayout };