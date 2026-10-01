export function isGuildOwner(configuredGuild, interactionGuild, ownerId, userId) {
    return Boolean(configuredGuild && ownerId && configuredGuild === interactionGuild && ownerId === userId);
}
