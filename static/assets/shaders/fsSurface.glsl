#version 300 es

precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;

out vec4 fragColor;

void main()
{
    fragColor = texture(uTexture, vTextureCoord);
}