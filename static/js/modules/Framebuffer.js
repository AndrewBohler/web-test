import { gl } from "./common.js";
import { Texture } from "./texture.js";

var BOUND_READ = null;
var BOUND_DRAW = null;

class FramebufferNotBoundError extends Error
{
    constructor(framebuffer, ...params)
    {
        super(...params);

        if (Error.captureStackTrace)
            Error.captureStackTrace(this, FramebufferNotBoundError);

        this.message = `framebuffer ${framebuffer} must be bound before perfoming this action`;
        this.name = "FramebufferNotBoundError";
        this.framebuffer = framebuffer;
    }
}

// const privateVariables = new WeakMap();

class Framebuffer
{
    // webgl framebuffer object
    _framebuffer;

    // mapping of [COLOR_ATTACHMENTi: texture]
    _attachments;

    // multiple color attachments should have the same shape
    _width;
    _height;

    constructor()
    {
        this._framebuffer = gl.createFramebuffer();

        // might be better off with an array of attachments sized by the max value
        // although with a map it's easy to query how many things are attached
        this._attachments = new Map();
        this._width = null;
        this._height = null;
    }

    bind()
    { // bind for both reading and writing
        if (BOUND_READ !== this || BOUND_DRAW !== this)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
            BOUND_READ = this;
            BOUND_DRAW = this;
        }
    }

    bindRead()
    { // bind for reading
        if (BOUND_READ !== this)
        {
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._framebuffer);
            BOUND_READ = this;
        }
    }

    bindDraw()
    { // bind for writing
        if (BOUND_DRAW !== this)
        {
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this._framebuffer);
            BOUND_DRAW = this;
        }
    }

    attach(texture, slot)
    {
        if (BOUND_DRAW !== this)
            throw new FramebufferNotBoundError(this);
        
        else if (!(texture instanceof Texture))
            throw TypeError(`expected "Texture" object, framebuffer cannot attach ${texture}`);
        
        // generally all attachments should be the same size
        // but if they aren't then opengl will use the minimum
        if (!this._width || this._width > texture.width)
            this._width = texture.width;

        if (!this._height || this._height > texture.height)
            this._height = texture.height;

        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, // this means the draw framebuffer in this context?
            gl.COLOR_ATTACHMENT0 + slot,
            gl.TEXTURE_2D,
            texture.texture,
            0,
        );

        this._attachments.set(slot, texture);
    }

    clearAttachment(slot)
    {
        if (BOUND_DRAW !== this)
            throw new FramebufferNotBoundError(this);

        else if (!this._attachments.has(slot))
            return;
            
        this._attachments.delete(slot);

        // bind null texture
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + slot,
            gl.TEXTURE_2D,
            null,
            0,
        );

        if (this._attachments.size())
        { // there are still other attachments
            let width = Infinity;
            let height = Infinity;

            for (const attachment of this._attachments.values())
            {
                if (attachment.width > width)
                    width = attachment.width;
                if (attachment.height > height)
                    height = attachment.height;
            }

            this._width = width;
            this._height = height;
        }
        else
        {
            this._width = null;
            this._height = null;
        }
    }

    static bindNull()
    {
        if (BOUND_READ !== null)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            BOUND_READ = null;
            BOUND_DRAW = null;
        }
    }

    static bindReadNull()
    {
        if (BOUND_READ !== null)
        {
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            BOUND_READ = null;
        }
    }

    static bindDrawNull()
    {
        if (BOUND_DRAW !== null)
        {
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
            BOUND_DRAW = null;
        }
    }

    static status_to_string(status)
    {
        switch(status)
        {
            case null:
                return "framebuffer must be bound first to check status";

            case gl.FRAMEBUFFER_COMPLETE:
                return "FRAMEBUFFER_COMPLETE";

            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";

            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
                
            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
                
            case gl.FRAMEBUFFER_UNSUPPORTED:
                return "FRAMEBUFFER_UNSUPPORTED";
                
            case g.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
                return "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE";
                
            default:
                return `status ${status} unkown`
        }
    }

    get width() { return this._width; }
    get height() { return this._height; }

    // set width(_) { throw new SyntaxError("framebuffer width is determined by it's attachments"); }
    // set height(_) { throw new SyntaxError("framebuffer height is determined by it's attachments"); }

    status()
    {
        if (BOUND_READ === this && BOUND_DRAW === this)
            return gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        else if (BOUND_READ === this)
            return gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER);
        else if (BOUND_DRAW === this)
            return gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);
        else
            return null;
    }
}

export { Framebuffer };