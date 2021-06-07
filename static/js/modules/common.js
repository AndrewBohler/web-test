import { init as textureInit } from "./texture.js";

var gl;
const STATE = new Map();

function setContext(canvas)
{
    gl = canvas.getContext('webgl2');
}

function init()
{
    textureInit();
}

export { gl, setContext, STATE, init };