require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || "";
const PORT = Number(process.env.PORT || 3000);

if (!TOKEN || !CLIENT_ID) {
  console.error("Faltam DISCORD_TOKEN e/ou CLIENT_ID nas variáveis de ambiente.");
  process.exit(1);
}

const CONFIG_PATH = path.join(__dirname, "..", "config.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { guilds: {} };
  }
}

let db = loadConfig();

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(db, null, 2));
}

function getGuildConfig(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      enabled: false,
      channelId: null,
      intervalMinutes: 30,
      lastMessageAt: Date.now(),
      lastReviveAt: 0
    };
    saveConfig();
  }
  return db.guilds[guildId];
}

const messages = [
  "🌸 O chat ficou quietinho... alguém por aqui? 💗",
  "🌹 Ei, Flowers! Que tal movimentar o chat um pouquinho?",
  "✨ Cadê todo mundo? Manda uma mensagem para reviver o chat!",
  "🌷 O chat está com saudade de vocês... apareçam! 💕",
  "💐 Alguém online? Bora conversar um pouco!",
  "🌸 Passando para lembrar: sempre cabe mais uma conversa por aqui!",
  "❤️‍🔥 O chat está paradinho! Quem vai ser o primeiro a mandar mensagem?",
  "🌹 Flowers está chamando vocês... vamos conversar?"
];

function randomMessage() {
  return messages[Math.floor(Math.random() * messages.length)];
}

const commands = [
  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configura o Flowers para reviver o chat.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName("canal")
        .setDescription("Define o canal que o Flowers vai reviver.")
        .addChannelOption(opt =>
          opt.setName("canal")
            .setDescription("Canal de texto")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("tempo")
        .setDescription("Define depois de quantos minutos sem mensagens o bot fala.")
        .addIntegerOption(opt =>
          opt.setName("minutos")
            .setDescription("De 1 a 1440 minutos")
            .setMinValue(1)
            .setMaxValue(1440)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("ativar")
        .setDescription("Ativa o reviver chat.")
    )
    .addSubcommand(sub =>
      sub.setName("desativar")
        .setDescription("Desativa o reviver chat.")
    )
    .addSubcommand(sub =>
      sub.setName("status")
        .setDescription("Mostra a configuração atual.")
    )
    .addSubcommand(sub =>
      sub.setName("testar")
        .setDescription("Envia uma mensagem de teste no canal configurado.")
    )
].map(c => c.toJSON());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

client.once("ready", async () => {
  console.log(`🌸 Flowers online como ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Comandos globais registrados.");
  } catch (error) {
    console.error("Erro ao registrar comandos globais:", error);
  }

  if (GUILD_ID) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log("✅ Comandos sincronizados no servidor configurado.");
    } catch (error) {
      console.error("Erro ao sincronizar comandos no servidor:", error);
    }
  }

  client.user.setPresence({
    activities: [{ name: "revivendo o chat 🌸", type: 0 }],
    status: "online"
  });
});

client.on("messageCreate", message => {
  if (!message.guild || message.author.bot) return;

  const cfg = getGuildConfig(message.guild.id);
  if (!cfg.enabled || !cfg.channelId) return;
  if (message.channel.id !== cfg.channelId) return;

  cfg.lastMessageAt = Date.now();
  saveConfig();
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "config") return;

  const cfg = getGuildConfig(interaction.guild.id);
  const sub = interaction.options.getSubcommand();

  if (sub === "canal") {
    const channel = interaction.options.getChannel("canal", true);
    cfg.channelId = channel.id;
    cfg.lastMessageAt = Date.now();
    saveConfig();

    return interaction.reply({
      content: `🌸 Canal definido como ${channel}.`,
      ephemeral: true
    });
  }

  if (sub === "tempo") {
    const minutes = interaction.options.getInteger("minutos", true);
    cfg.intervalMinutes = minutes;
    saveConfig();

    return interaction.reply({
      content: `⏰ Tempo definido para **${minutes} minutos** sem mensagens.`,
      ephemeral: true
    });
  }

  if (sub === "ativar") {
    if (!cfg.channelId) {
      return interaction.reply({
        content: "⚠️ Primeiro use `/config canal #canal`.",
        ephemeral: true
      });
    }

    cfg.enabled = true;
    cfg.lastMessageAt = Date.now();
    saveConfig();

    return interaction.reply({
      content: "🌸 **Flowers ativado!** Vou reviver o canal quando ele ficar parado.",
      ephemeral: true
    });
  }

  if (sub === "desativar") {
    cfg.enabled = false;
    saveConfig();

    return interaction.reply({
      content: "🌙 Flowers desativado neste servidor.",
      ephemeral: true
    });
  }

  if (sub === "status") {
    const channel = cfg.channelId
      ? `<#${cfg.channelId}>`
      : "não configurado";

    const status = cfg.enabled ? "🟢 Ativado" : "🔴 Desativado";

    const embed = new EmbedBuilder()
      .setTitle("🌸 Flowers — Configuração")
      .setDescription(
        `**Status:** ${status}\n` +
        `**Canal:** ${channel}\n` +
        `**Tempo:** ${cfg.intervalMinutes} minuto(s)\n\n` +
        `Use \`/config canal\`, \`/config tempo\`, \`/config ativar\` ou \`/config desativar\`.`
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === "testar") {
    if (!cfg.channelId) {
      return interaction.reply({
        content: "⚠️ Primeiro configure um canal com `/config canal #canal`.",
        ephemeral: true
      });
    }

    const channel = await interaction.guild.channels.fetch(cfg.channelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      return interaction.reply({
        content: "⚠️ Não consegui acessar o canal configurado.",
        ephemeral: true
      });
    }

    await channel.send(randomMessage());
    cfg.lastMessageAt = Date.now();
    cfg.lastReviveAt = Date.now();
    saveConfig();

    return interaction.reply({
      content: "🌸 Mensagem de teste enviada!",
      ephemeral: true
    });
  }
});

setInterval(async () => {
  const now = Date.now();

  for (const [guildId, cfg] of Object.entries(db.guilds)) {
    if (!cfg.enabled || !cfg.channelId) continue;

    const waitMs = Number(cfg.intervalMinutes || 30) * 60 * 1000;
    const inactiveFor = now - Number(cfg.lastMessageAt || now);

    if (inactiveFor < waitMs) continue;

    // Evita repetir a mensagem imediatamente após um reinício.
    if (now - Number(cfg.lastReviveAt || 0) < waitMs) continue;

    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) continue;

      const channel = await guild.channels.fetch(cfg.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      await channel.send(randomMessage());

      cfg.lastReviveAt = now;
      cfg.lastMessageAt = now;
      saveConfig();

      console.log(`🌸 Chat revivido em ${guild.name} / #${channel.name}`);
    } catch (error) {
      console.error(`Erro ao reviver ${guildId}:`, error.message);
    }
  }
}, 30_000);

// Pequeno servidor HTTP para plataformas que exigem uma porta.
const app = express();
app.get("/", (_req, res) => res.send("🌸 Flowers está online!"));
app.get("/health", (_req, res) => res.json({ ok: true, bot: client.isReady() }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server na porta ${PORT}`);
});

client.login(TOKEN);
