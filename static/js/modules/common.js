var gl;

function setContext(canvas)
{
    gl = canvas.getContext('webgl');
}

export { gl, setContext };