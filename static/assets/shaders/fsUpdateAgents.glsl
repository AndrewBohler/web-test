#version 300 es

#define PI 3.1415926535897932384626433832795
#define TWO_PI 6.283185307179586476925286766559
#define TWO_THIRDS_PI 2.0943951023931954923084289221863

precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uAgentsTexture;
uniform sampler2D uTrailsTexture;

uniform float uVisionAngle; // angle +/- from center
uniform float uVisionRadius;

out vec4 FragColor;

struct Agent
{ // size of vec4
    vec2 pos;
    float angle;
    float color;
};

vec2[3] vision_offset_unit_vectors(Agent agent)
{
    vec2 angles[3];

    angles[0] = vec2(
        sin(TWO_PI * (agent.angle - uVisionAngle)),
        cos(TWO_PI * (agent.angle - uVisionAngle))
    );

    angles[1] = vec2(
        sin(TWO_PI * agent.angle),
        cos(TWO_PI * agent.angle)
    );

    angles[2] = vec2(
        sin(TWO_PI * (agent.angle + uVisionAngle)),
        cos(TWO_PI * (agent.angle + uVisionAngle))
    );

    return angles;
}

vec4[3] vision_samples(Agent agent, vec2 pixel, vec2[3] offset)
{
    vec4[3] samples;

    samples[0] = texture(uTrailsTexture, agent.pos + offset[0] * pixel * uVisionRadius);
    samples[1] = texture(uTrailsTexture, agent.pos + offset[1] * pixel * uVisionRadius);
    samples[2] = texture(uTrailsTexture, agent.pos + offset[2] * pixel * uVisionRadius);

    return samples;
}

void normalize_agent(Agent agent)
{
    if      (agent.pos.x > 1.0) agent.pos.x -= 1.0;
    else if (agent.pos.x < 0.0) agent.pos.x += 1.0;

    if      (agent.pos.y > 1.0) agent.pos.y -= 1.0;
    else if (agent.pos.y < 0.0) agent.pos.y += 1.0;

    if      (agent.angle > 1.0) agent.angle -= 1.0;
    else if (agent.angle < 0.0) agent.angle += 1.0;
}

vec3 normalized_float_to_rgb(float value)
{
    return vec3(
        sin(value * TWO_PI - TWO_THIRDS_PI),
        sin(value * TWO_PI),
        sin(value * TWO_PI + TWO_THIRDS_PI)
    ) * 0.5 + 0.5;
}

float[3] sample_grades(vec4[3] samples, vec3 heuristic)
{
    // ignore alpha channel

    vec3 diff[3];
    diff[0] = -abs(samples[0].xyz - heuristic);
    diff[1] = -abs(samples[1].xyz - heuristic);
    diff[2] = -abs(samples[2].xyz - heuristic);

    float grade[3];
    grade[0] = diff[0].x + diff[0].y + diff[0].z;
    grade[1] = diff[1].x + diff[1].y + diff[1].z;
    grade[2] = diff[2].x + diff[2].y + diff[2].z;
    return grade;
}

void main()
{
    vec4 texel = texture(uAgentsTexture, vTextureCoord);
    Agent agent = Agent(texel.xy, texel.z, texel.w);

    vec2 agentsTextureSize = vec2(textureSize(uAgentsTexture, 0));
    vec2 trailsTextureSize = vec2(textureSize(uTrailsTexture, 0));

    vec2 agentsPixel = 1.0 / agentsTextureSize;
    vec2 trailsPixel = 1.0 / trailsTextureSize;

    vec2 unitVectors[3] = vision_offset_unit_vectors(agent);
    vec4 colorSamples[3] = vision_samples(agent, trailsPixel, unitVectors);
    
    vec3 agentColor = normalized_float_to_rgb(agent.color);

    float samples[3] = sample_grades(colorSamples, agentColor);

    // decide which direction to go
    if (samples[0] > samples[1])
    {
        if (samples[0] > samples[2])
        { // left
            agent.angle -= uVisionAngle;
            agent.pos += unitVectors[0] * trailsPixel;
        }
        else // samples[0] < samples[2]
        { // right
            agent.angle += uVisionAngle;
            agent.pos += unitVectors[2] * trailsPixel;
        }
    }
    else // samples[0] < samples[1]
    {
        if (samples[1] > samples[2])
        { // center
            // angle doesn't change
            agent.pos += unitVectors[1] * trailsPixel;
        }
        else // samples[1] < samples[2]
        { // right
            agent.angle += uVisionAngle;
            agent.pos += unitVectors[2] * trailsPixel;
        }
    }

    normalize_agent(agent);

    FragColor = vec4(agent.pos, agent.angle, agent.color);
}