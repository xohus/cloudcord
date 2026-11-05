ccp 1
plugin cloudcord.ccp.character-counter "CCP Character Counter" version "1.0.0"
requires command.register, reply.local
on command ccp-count(text) {
    reply "${length(text)} characters"
}
