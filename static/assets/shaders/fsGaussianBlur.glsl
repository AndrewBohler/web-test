#version 300 es

precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform mat3 uKernel;
uniform float uKernelWeight;
uniform float uFade;

out vec4 FragColor;

void main()
{
    vec2 dims = vec2(textureSize(uTexture, 0));

    vec2 onePixel = vec2(1.0) / dims;

    vec2 samples[8];
    samples[0] = vTextureCoord + onePixel * vec2(-1.0,  1.0);
    samples[1] = vTextureCoord + onePixel * vec2( 0.0,  1.0);
    samples[2] = vTextureCoord + onePixel * vec2( 1.0,  1.0);

    samples[3] = vTextureCoord + onePixel * vec2(-1.0,  0.0);
    // skip center
    samples[4] = vTextureCoord + onePixel * vec2( 1.0,  0.0);

    samples[5] = vTextureCoord + onePixel * vec2(-1.0, -1.0);
    samples[6] = vTextureCoord + onePixel * vec2( 0.0, -1.0);
    samples[7] = vTextureCoord + onePixel * vec2( 1.0, -1.0);


    vec4 colorSum =
        texture(uTexture, samples[0])    * uKernel[0][0] +
        texture(uTexture, samples[1])    * uKernel[0][1] +
        texture(uTexture, samples[2])    * uKernel[0][2] +
        texture(uTexture, samples[3])    * uKernel[1][0] +
        texture(uTexture, vTextureCoord) * uKernel[1][1] +
        texture(uTexture, samples[4])    * uKernel[1][2] +
        texture(uTexture, samples[5])    * uKernel[2][0] +
        texture(uTexture, samples[6])    * uKernel[2][1] +
        texture(uTexture, samples[7])    * uKernel[2][2] ;

    vec3 rgb = colorSum.xyz / uKernelWeight;

    FragColor = vec4(rgb * uFade, 1.0);
}