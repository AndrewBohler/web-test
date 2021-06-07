#version 300 es

precision highp float;

in vec3 vRGB;
in vec2 vTextureCoord;

uniform sampler2D uTrailsTexture;
uniform float uTrailWeight;

out vec4 FragColor;

void main()
{
    vec3 currentColor = texture(uTrailsTexture, vTextureCoord).xyz;
    FragColor += vec4(mix(currentColor, vRGB, uTrailWeight), 1.0);
}