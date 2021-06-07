#version 300 es

precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uPixel;

out vec4 fragColor;

void main()
{
    // poor man's gaussian blur

    vec4 color = texture(uTexture, vTextureCoord);
    color += texture(uTexture, vec2(vTextureCoord.x - uPixel, vTextureCoord.y));
    color += texture(uTexture, vec2(vTextureCoord.x + uPixel, vTextureCoord.y));
    color += texture(uTexture, vec2(vTextureCoord.x, vTextureCoord.y - uPixel));
    color += texture(uTexture, vec2(vTextureCoord.x, vTextureCoord.y + uPixel));

    fragColor = color / 5.0;
}