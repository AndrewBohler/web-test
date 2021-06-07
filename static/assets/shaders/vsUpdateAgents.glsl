#version 300 es

in vec4 aVertexPosition;
in vec2 aTextureCoord;

uniform sampler2D uAgentsTexture;

out vec2 vTextureCoord;

void main()
{
    vTextureCoord = aTextureCoord;
    gl_Position = aVertexPosition;
    gl_PointSize = 1.0;
}