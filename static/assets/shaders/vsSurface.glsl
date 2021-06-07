#version 300 es

in vec4 aVertexPosition;
in vec2 aTextureCoord;

out vec2 vTextureCoord;

void main()
{
    gl_Position = aVertexPosition;
    vTextureCoord = aTextureCoord;
    // vTextureCoord = aVertexPosition.xy * 0.5 + 0.5;
}