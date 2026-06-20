const {
Client,
GatewayIntentBits,
PermissionsBitField,
ChannelType,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
REST,
Routes,
SlashCommandBuilder
} = require('discord.js');

const Database = require('better-sqlite3');

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

const db = new Database('./database.sqlite');

const STAFF_ROLE = '1506430627501703249';

const SUPPORT_CATEGORY = '1515901968030367915';
const BUYING_CATEGORY = '1515888821936324738';
const SELLING_CATEGORY = '1515888774154817699';

const VOUCH_CHANNEL = '1515887426860744807';
const COMMANDS_CHANNEL = '1516211136632979507';
db.prepare(`
CREATE TABLE IF NOT EXISTS vouches (
userId TEXT PRIMARY KEY,
amount INTEGER DEFAULT 0
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS levels (
userId TEXT PRIMARY KEY,
messages INTEGER DEFAULT 0,
level INTEGER DEFAULT 0
)
`).run();
const commands = [

new SlashCommandBuilder()
.setName('supportpanel')
.setDescription('Send support panel'),

new SlashCommandBuilder()
.setName('buyingpanel')
.setDescription('Send buying panel'),

new SlashCommandBuilder()
.setName('sellingpanel')
.setDescription('Send selling panel'),

new SlashCommandBuilder()
.setName('vouch')
.setDescription('Vouch for a user')
.addUserOption(option =>
option
.setName('user')
.setDescription('User')
.setRequired(true)
)
.addStringOption(option =>
option
.setName('reason')
.setDescription('Reason')
.setRequired(true)
),

new SlashCommandBuilder()
.setName('vouchcount')
.setDescription('Check vouches')
.addUserOption(option =>
option
.setName('user')
.setDescription('User')
.setRequired(true)
),

new SlashCommandBuilder()
.setName('add_vouches')
.setDescription('Add vouches')
.addUserOption(option =>
option
.setName('user')
.setDescription('User')
.setRequired(true)
)
.addIntegerOption(option =>
option
.setName('amount')
.setDescription('Amount')
.setRequired(true)
),

new SlashCommandBuilder()
.setName('rank')
.setDescription('Check your rank'),

new SlashCommandBuilder()
.setName('leaderboard')
.setDescription('Server leaderboard')

].map(cmd => cmd.toJSON());
client.once('ready', async () => {

console.log(`${client.user.tag} is online.`);

const rest = new REST({
version: '10'
}).setToken(process.env.TOKEN);

try {

await rest.put(
Routes.applicationGuildCommands(
process.env.CLIENT_ID,
process.env.GUILD_ID
),
{
body: commands
}
);

console.log('Slash commands loaded.');

} catch (err) {
console.error(err);
}

});
client.on('messageCreate', async message => {

if (message.author.bot) return;
if (message.channel.id !== COMMANDS_CHANNEL) return;

let row = db.prepare(`
SELECT *
FROM levels
WHERE userId = ?
`).get(message.author.id);

if (!row) {

db.prepare(`
INSERT INTO levels
(userId, messages, level)
VALUES (?, ?, ?)
`).run(message.author.id, 1, 0);

return;
}

const messages = row.messages + 1;
const level = Math.floor(messages / 15);

db.prepare(`
UPDATE levels
SET messages = ?, level = ?
WHERE userId = ?
`).run(
messages,
level,
message.author.id
);

});
const supportPanelButton = new ActionRowBuilder()
.addComponents(
new ButtonBuilder()
.setCustomId('support_ticket')
.setLabel('Create Support Ticket')
.setStyle(ButtonStyle.Primary)
);

const buyingPanelButton = new ActionRowBuilder()
.addComponents(
new ButtonBuilder()
.setCustomId('buying_ticket')
.setLabel('Create Buying Ticket')
.setStyle(ButtonStyle.Success)
);

const sellingPanelButton = new ActionRowBuilder()
.addComponents(
new ButtonBuilder()
.setCustomId('selling_ticket')
.setLabel('Create Selling Ticket')
.setStyle(ButtonStyle.Danger)
);

const closeButton = new ActionRowBuilder()
.addComponents(
new ButtonBuilder()
.setCustomId('close_ticket')
.setLabel('Close Ticket')
.setStyle(ButtonStyle.Secondary)
);
client.on('interactionCreate', async interaction => {

if (interaction.isChatInputCommand()) {
  if (interaction.commandName === 'supportpanel') {

if (!isStaff(interaction.member)) {
return interaction.reply({
content: 'You do not have permission.',
ephemeral: true
});
}

const embed = new EmbedBuilder()
.setTitle('Support Ticket')
.setDescription(`
Need help?

Press the button below to create a support ticket.

A staff member will assist you shortly.
`)
.setColor('Blue');

await interaction.channel.send({
embeds: [embed],
components: [supportPanelButton]
});

return interaction.reply({
content: 'Support panel sent.',
ephemeral: true
});
}
  if (interaction.commandName === 'buyingpanel') {

if (!isStaff(interaction.member)) {
return interaction.reply({
content: 'You do not have permission.',
ephemeral: true
});
}

const embed = new EmbedBuilder()
.setTitle('Buying Ticket')
.setDescription(`
Interested in buying?

Press the button below to create a buying ticket.
`)
.setColor('Green');

await interaction.channel.send({
embeds: [embed],
components: [buyingPanelButton]
});

return interaction.reply({
content: 'Buying panel sent.',
ephemeral: true
});
}
  if (interaction.commandName === 'sellingpanel') {

if (!isStaff(interaction.member)) {
return interaction.reply({
content: 'You do not have permission.',
ephemeral: true
});
}

const embed = new EmbedBuilder()
.setTitle('Selling Ticket')
.setDescription(`
Want to sell something?

Press the button below to create a selling ticket.
`)
.setColor('Red');

await interaction.channel.send({
embeds: [embed],
components: [sellingPanelButton]
});

return interaction.reply({
content: 'Selling panel sent.',
ephemeral: true
});
}
  } else if (
interaction.isButton() &&
interaction.customId === 'support_ticket'
) {

const channel = await interaction.guild.channels.create({
name: `support-${interaction.user.username}`,
type: ChannelType.GuildText,
parent: SUPPORT_CATEGORY,
permissionOverwrites: [
{
id: interaction.guild.id,
deny: [
PermissionsBitField.Flags.ViewChannel
]
},
{
id: interaction.user.id,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
},
{
id: STAFF_ROLE,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
}
]
});

const embed = new EmbedBuilder()
.setTitle('Support Ticket')
.setDescription(`
Welcome ${interaction.user}

Please explain your issue.

Use the button below to close the ticket.
`)
.setColor('Blue');

await channel.send({
embeds: [embed],
components: [closeButton]
});

await interaction.reply({
content: `Ticket created: ${channel}`,
ephemeral: true
});
} else if (
interaction.isButton() &&
interaction.customId === 'buying_ticket'
) {

const channel = await interaction.guild.channels.create({
name: `buying-${interaction.user.username}`,
type: ChannelType.GuildText,
parent: BUYING_CATEGORY,
permissionOverwrites: [
{
id: interaction.guild.id,
deny: [
PermissionsBitField.Flags.ViewChannel
]
},
{
id: interaction.user.id,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
},
{
id: STAFF_ROLE,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
}
]
});

const embed = new EmbedBuilder()
.setTitle('Buying Ticket')
.setDescription(`
Welcome ${interaction.user}

Tell us what you're looking to buy.

Use the button below to close the ticket.
`)
.setColor('Green');

await channel.send({
embeds: [embed],
components: [closeButton]
});

await interaction.reply({
content: `Ticket created: ${channel}`,
ephemeral: true
});
} else if (
interaction.isButton() &&
interaction.customId === 'selling_ticket'
) {

const channel = await interaction.guild.channels.create({
name: `selling-${interaction.user.username}`,
type: ChannelType.GuildText,
parent: SELLING_CATEGORY,
permissionOverwrites: [
{
id: interaction.guild.id,
deny: [
PermissionsBitField.Flags.ViewChannel
]
},
{
id: interaction.user.id,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
},
{
id: STAFF_ROLE,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
}
]
});

const embed = new EmbedBuilder()
.setTitle('Selling Ticket')
.setDescription(`
Welcome ${interaction.user}

Tell us what you're looking to sell.

Use the button below to close the ticket.
`)
.setColor('Red');

await channel.send({
embeds: [embed],
components: [closeButton]
});

await interaction.reply({
content: `Ticket created: ${channel}`,
ephemeral: true
});
  } else if (
interaction.isButton() &&
interaction.customId === 'close_ticket'
) {

await interaction.reply({
content: 'Closing ticket in 5 seconds...',
ephemeral: true
});

setTimeout(async () => {

try {
await interaction.channel.delete();
} catch (err) {
console.error(err);
}

}, 5000);
}
});
