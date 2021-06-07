#version 300 es

in vec4 aVertexPosition;
in vec2 aTextureCoord;

uniform sampler2D uAgentsTexture;
uniform sampler2D uTrailsTexture;

out vec3 vRGB;
out vec2 vTextureCoord;

#define TWO_PI 6.283185307179586476925286766559
#define TWO_THIRDS_PI 2.0943951023931954923084289221863

struct Agent
{ // size of vec4
    vec2 pos;
    float angle;
    float color;
};

vec3 normalized_float_to_rgb(float value)
{
    return vec3(
        sin(value * TWO_PI - TWO_THIRDS_PI),
        sin(value * TWO_PI),
        sin(value * TWO_PI + TWO_THIRDS_PI)
    ) * 0.5 + 0.5;
}

void main()
{
    vec4 agentRaw = texture(uAgentsTexture, aTextureCoord);
    Agent agent = Agent(agentRaw.xy, agentRaw.z, agentRaw.a);

    vRGB = normalized_float_to_rgb(agent.color);
    vTextureCoord = agent.pos;

    gl_Position = vec4(agent.pos * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = 1.0;
}