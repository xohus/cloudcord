import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { isGuildOwner } from './authorization.mjs';

const configFile = process.env.CLOUDCORD_BADGE_BOT_CONFIG || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.config'), 'CloudCord', 'badge-bot.json');
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
for (const key of ['BOT_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'BADGE_API_KEY']) if (!config[key]) throw new Error(`fill ${key} in your private badge-bot.json first`);
for (const key of ['CLIENT_ID', 'GUILD_ID']) if (!/^\d{15,22}$/.test(config[key])) throw new Error(`invalid ${key}`);
const api = new URL(config.BADGE_API_URL || 'https://getcloudcord.com/v1/admin/badges');
if (api.protocol !== 'https:' && api.hostname !== '127.0.0.1') throw new Error('badge API must use HTTPS');
const command = new SlashCommandBuilder().setName('badge').setDescription('manage cloudcord custom badges').setDMPermission(false);
for (const action of ['add', 'edit', 'remove', 'list']) command.addSubcommand(sub => {
    sub.setName(action).setDescription(`${action} a user's cloudcord badges`).addStringOption(o => o.setName('userid').setDescription('discord user id').setRequired(true));
    if (['edit', 'remove'].includes(action)) sub.addStringOption(o => o.setName('badgeid').setDescription('badge id from /badge list').setRequired(true));
    if (['add', 'edit'].includes(action)) {
        sub.addStringOption(o => o.setName('name').setDescription('badge name').setMaxLength(80).setRequired(action === 'add'));
        sub.addAttachmentOption(o => o.setName('png').setDescription('PNG up to 512 KB, max 512 × 512').setRequired(action === 'add'));
    }
    return sub;
});
const rest = new REST({ version: '10' }).setToken(config.BOT_TOKEN);
// Upsert this command only; never overwrite other commands on a shared bot.
await rest.post(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: command.toJSON() });
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'badge') return;
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (interaction.guildId !== config.GUILD_ID) return interaction.editReply('only available in the configured server.');
        // Fetch actual ownership fresh: admin roles do not grant access.
        const guild = await rest.get(Routes.guild(config.GUILD_ID));
        if (!isGuildOwner(config.GUILD_ID, interaction.guildId, guild.owner_id, interaction.user.id)) return interaction.editReply('only the server owner can use badge commands.');
        const body = { action: interaction.options.getSubcommand(), userId: interaction.options.getString('userid'), id: interaction.options.getString('badgeid') || undefined, name: interaction.options.getString('name') || undefined };
        if (!/^\d{15,22}$/.test(body.userId)) return interaction.editReply('send a valid user id.');
        const attachment = interaction.options.getAttachment('png');
        if (attachment) {
            const url = new URL(attachment.url);
            if (!['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname) || url.protocol !== 'https:' || attachment.size > 512 * 1024) return interaction.editReply('upload a PNG under 512 KB.');
            const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
            if (!response.ok) throw new Error('could not download that PNG');
            const chunks = []; let total = 0;
            for await (const chunk of response.body) { total += chunk.length; if (total > 512 * 1024) throw new Error('PNG too large'); chunks.push(chunk); }
            body.png = Buffer.concat(chunks).toString('base64');
        }
        const response = await fetch(api, { method: 'POST', headers: { authorization: `Bearer ${config.BADGE_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `badge service returned ${response.status}`);
        const content = body.action === 'list' ? result.badges.map(b => `${b.name} — ${b.id}`).join('\n') || 'no custom badges for this user.' : `badge ${body.action === 'remove' ? 'removed' : 'saved'}${result.badge ? `: ${result.badge.name} (${result.badge.id})` : ''}`;
        await interaction.editReply({ content: content.slice(0, 1900), allowedMentions: { parse: [] } });
    } catch (error) {
        console.error('badge command failed:', error.name);
        const message = 'could not complete the badge command. check the PNG, badge id, and service configuration.';
        if (interaction.deferred || interaction.replied) await interaction.editReply(message).catch(() => {});
        else await interaction.reply({ content: message, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
});
client.once('clientReady', () => console.log('cloudcord badge bot online'));
await client.login(config.BOT_TOKEN);
