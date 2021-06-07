#version 300 es

in vec4 aVertexPosition;
in vec2 aTextureCoord;

out vec2 vTextureCoord;

void main()
{
    vTextureCoord = aTextureCoord;
    gl_Position = aVertexPosition;
}