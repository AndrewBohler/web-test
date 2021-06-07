import { gl } from "./common.js";

var MAX_COMBINED_TEXTURES_IMAGE_UNITS;
var MAX_VERTEX_TEXTURE_IMAGE_UNITS;
var MAX_TEXTURE_IMAGE_UNITS;

var BOUND_TEXTURES = []; // probably should change to a Map for binding one-to-many
var ACTIVE_TEXTURE = 0; // 0-indexed!

function init()
{
    MAX_COMBINED_TEXTURES_IMAGE_UNITS = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    MAX_VERTEX_TEXTURE_IMAGE_UNITS = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    MAX_TEXTURE_IMAGE_UNITS = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

    for (let i = 0; i < MAX_COMBINED_TEXTURES_IMAGE_UNITS; i++);
        BOUND_TEXTURES.push(undefined); // must be an object therefore undefined is unbound

    ACTIVE_TEXTURE = 0;
    gl.activeTexture(gl.TEXTURE0);
}

class TextureNotBoundError extends Error
{
    constructor(texture, ...params)
    {
        super(...params);

        this.message = `texture must be bound before perfoming this action`;
        this.name = "TextureNotBoundError";
        this.texture = texture;
    }
}


class Texture
{
    // webgl texture object
    _texture;
    
    // parameters set with gl calls
    _parameters;

    // settings used when loading texture data
    _level;
    _internalFormat;
    _width;
    _height;
    _border;
    _format;
    _type;

    // last slot this texture was bound to
    _lastSlot;

    constructor(args)
    { // carefull, this will unbind current textures in order to setupt this one
        if (args === undefined)
            args = {};

        this._parameters = new Map();
        this._texture = gl.createTexture();
        this._lastSlot = null;

        if (args.parameters)
        {
            for (let [key, value] of args.parameters)
            {
                if (typeof key == "number" && typeof value == "number")
                {
                    this._parameters.set(key, value);
                }
                else
                {
                    console.log(`warning: invalid texture parameter ${key} ${value}`);
                }
            }
        }

        // basic default parameters
        if (!this._parameters.has(gl.TEXTURE_MIN_FILTER))
            this._parameters.set(gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        if (!this._parameters.has(gl.TEXTURE_WRAP_S))
            this._parameters.set(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            
        if (!this._parameters.has(gl.TEXTURE_WRAP_T))
            this._parameters.set(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // required args needed for loading data
        if (!args.internalFormat) throw SyntaxError("internalFormat is required"); // GPU storage format
        if (!args.width) throw SyntaxError("width is required");
        if (!args.height) throw SyntaxError("height is required");
        if (!args.format) throw SyntaxError("format is required"); // input data format?
        if (!args.type) throw SyntaxError("type is required"); // input data type e.g. float, int, etc.?

        this._level = 0; // mipmap, must be 0
        this._internalFormat = args.internalFormat;
        this._width = args.width;
        this._height = args.height;
        this._border = args.border ? args.border : 0;
        this._format = args.format;
        this._type = args.type;
        
        // data isn't member variable so it's not cached in RAM
        const data = args.data ? args.data : null;
        
        // console.log(
        //     "initializing texture:",
        //     "target", gl.TEXTURE_2D,
        //     "level", this._level,
        //     "internalFormat", this._internalFormat,
        //     "width", this._width,
        //     "height", this._height,
        //     "border", this._border,
        //     "format", this._format,
        //     "type", this._type,
        //     data
        // );

        // maybe we should have the active texture just left bound
        // to the newly constructed texture for performance reasons?
        this.bind(ACTIVE_TEXTURE);

        // texImage2D to initialize data, this.load() uses texSubImage2D
        gl.texImage2D(
            gl.TEXTURE_2D,
            this._level,
            this._internalFormat,
            this._width,
            this._height,
            this._border,
            this._format,
            this._type,
            data
        );

        this.configureParameters();
        
        gl.bindTexture(gl.TEXTURE_2D, undefined);
    }

    configureParameters()
    {
        if (this._lastSlot === null || BOUND_TEXTURES[this._lastSlot] !== this)
            throw new TextureNotBoundError(this);

        if (this._lastSlot !== ACTIVE_TEXTURE)
            gl.activeTexture(gl.TEXTURE0 + this._lastSlot);

        for (const [key, value] of this._parameters)
            gl.texParameteri(gl.TEXTURE_2D, key, value);
    }

    bind(slot)
    { // This propbably doesn't work correctly if you bind to more than 1 slot
        if (typeof slot != "number")
            throw TypeError(`cannot bind texture to ${slot} expected "number"`);
        
        else if (slot >= MAX_COMBINED_TEXTURES_IMAGE_UNITS)
            throw RangeError(`texture slot ${slot} >= ${MAX_COMBINED_TEXTURES_IMAGE_UNITS} (out of range)`);

        if (ACTIVE_TEXTURE !== slot);
        {
            gl.activeTexture(gl.TEXTURE0 + slot);
            ACTIVE_TEXTURE = slot;
        }
            
        if (BOUND_TEXTURES[slot] !== this)
        {    
            gl.bindTexture(gl.TEXTURE_2D, this._texture);
            BOUND_TEXTURES[slot] = this;
        }
        this._lastSlot = slot;
    }

    /* it seems that there isn't a way to bind null to a texture slot in webgl??? */
    unbind()
    {
        // unsure if this can be assumed to still be bound to this slot?
        const slot = this._lastSlot;
        
        if (this !== BOUND_TEXTURES[slot])
            return;

        else if (ACTIVE_TEXTURE !== slot)
        {
            gl.activeTexture(gl.TEXTURE0 + slot);
            ACTIVE_TEXTURE = slot;
        }

        gl.bindTexture(gl.TEXTURE_2D, undefined);
        BOUND_TEXTURES[slot] = undefined;
        this._lastSlot = undefined;
    }

    unbindAll()
    {
        for (var slot = 0; slot < BOUND_TEXTURES.length; slot++)
        {
            if (BOUND_TEXTURES[slot] === this)
            {
                gl.activeTexture(gl.TEXTURE0 + slot);
                gl.bindTexture(gl.TEXTURE_2D, undefined);
                BOUND_TEXTURES[slot] = undefined;
            }

            this._lastSlot = undefined;
        }
    }

    load(data)
    {
        if (BOUND_TEXTURES[this._lastSlot] !== this)
            throw new TextureNotBoundError(this, "texture must be bound before loading data");

        else if (this._lastSlot !== ACTIVE_TEXTURE)
        {
            gl.activeTexture(gl.TEXTURE0 + this._lastSlot);
            ACTIVE_TEXTURE = this._lastSlot;
        }

        gl.texSubImage2D(
            gl.TEXTURE_2D, this._level,
            0, 0, this._width, this._height,
            this._format, this._type, data
        );
    }

    
    // getters
    get lastSlot()       { return this._lastSlot; }
    get texture()        { return this._texture; }
    get level()          { return this._level; }
    get internalFormat() { return this._internalFormat; }
    get width()          { return this._width; }
    get height()         { return this._height; }
    get border()         { return this._border; }
    get format()         { return this._format; }
    get type()           { return this._type; }
    
    static cpu_active_texture() { return ACTIVE_TEXTURE }
    static gpu_active_texture() { return gl.getParameter(gl.ACTIVE_TEXTURE); }
}

export { Texture, init };