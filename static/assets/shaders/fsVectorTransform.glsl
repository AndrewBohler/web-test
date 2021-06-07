#version 300 es

precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uInputTexture;
uniform mat4 uTransform;

out vec4 FragColor;

#define G 0.0000000000667 // gravity constant
#define M 1000000.0       // mass constant for scaling mass
#define E2 0.0000000001   // prevents singularities at small distances
#define TS 0.001          // time step

vec3 gravity(vec4 A, vec4 B)
{
    vec3 v = B.xyz - A.xyz;
    float enumerator = A.w * B.w * G * M;
    float denominator = sqrt(length(v) + E2);
    float g = enumerator / denominator * TS;
    return v * g;
}

void main()
{
    vec2 dim = vec2(textureSize(uInputTexture, 0));
    vec2 pixel = 1.0 / dim;

    vec3 gvec = vec3(0.0);
    vec2 otherTexCoord = vec2(0.0);
    vec4 thisBody = texture(uInputTexture, vTextureCoord);
    thisBody.xyz = thisBody.xyz * 0.5 + 0.5;

    for (; otherTexCoord.x < dim.x; otherTexCoord.x += pixel.x)
    {
        otherTexCoord.y = 0.0;

        for (; otherTexCoord.y < dim.y; otherTexCoord.y += pixel.y)
        {
            if (otherTexCoord == vTextureCoord)
                continue;
            vec4 otherBody = texture(uInputTexture, otherTexCoord);
            otherBody.xyz = otherBody.xyz * 0.5 + 0.5;
            gvec += gravity(thisBody, otherBody);
        }
    }

    thisBody.xyz = (thisBody.xyz + gvec) * 2.0 + 1.0;

    FragColor = thisBody;
}