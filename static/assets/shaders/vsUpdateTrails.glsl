#version 300 es

in vec4 aVertexPosition;
in vec2 aTextureCoord;

uniform sampler2D uAgentsTexture;

out vec2 vTextureCoord;

void main()
{
    vec4 agent = texture(uAgentsTexture, aVertexPosition.xy);
    vTextureCoord = aTextureCoord;
    gl_Position = vec4(agent.xy * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = 1.0;
}