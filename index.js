require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    REST,
    Routes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const difficulties = {
    easy: {
        name: "Easy",
        min: 1,
        max: 10,
        guesses: 5,
        emoji: "🟢"
    },
    medium: {
        name: "Medium",
        min: 1,
        max: 25,
        guesses: 5,
        emoji: "🔵"
    },
    hard: {
        name: "Hard",
        min: 1,
        max: 50,
        guesses: 10,
        emoji: "🟠"
    },
    insane: {
        name: "Insane",
        min: 1,
        max: 75,
        guesses: 10,
        emoji: "🔴"
    },
    impossible: {
        name: "Impossible",
        min: 1,
        max: 100,
        guesses: 10,
        emoji: "💀"
    }
};

// Only ONE game can exist at a time.
let activeGame = null;

// Slash command
const commands = [
    new SlashCommandBuilder()
        .setName("guess")
        .setDescription("Start a BGuesser game.")
].map(command => command.toJSON());

async function registerCommands() {
    try {
        console.log("Registering slash commands...");

        const rest = new REST({ version: "10" }).setToken(TOKEN);

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            {
                body: commands
            }
        );

        console.log("Slash commands registered!");
    } catch (error) {
        console.error("Failed to register commands:");
        console.error(error);
    }
}

client.once("ready", async () => {
    console.log("=================================");
    console.log(`BGuesser is online as ${client.user.tag}!`);
    console.log("=================================");

    await registerCommands();
});

// Button handling
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    if (!interaction.customId.startsWith("difficulty_")) {
        return;
    }

    if (activeGame) {
        await interaction.reply({
            content: "❌ A game is already running!",
            ephemeral: true
        });

        return;
    }

    const difficulty = interaction.customId.replace(
        "difficulty_",
        ""
    );

    const settings = difficulties[difficulty];

    if (!settings) {
        await interaction.reply({
            content: "❌ Invalid difficulty.",
            ephemeral: true
        });

        return;
    }

    const number =
        Math.floor(
            Math.random() * settings.max
        ) + settings.min;

    activeGame = {
        difficulty,
        number,
        max: settings.max,
        guessesLeft: settings.guesses,
        totalGuesses: settings.guesses,
        lastDistance: null
    };

    const embed = new EmbedBuilder()
        .setTitle(`${settings.emoji} ${settings.name} BGuesser`)
        .setDescription(
            `A secret number between **${settings.min} and ${settings.max}** has been chosen!\n\n` +
            `🎯 **Guesses:** ${settings.guesses}\n\n` +
            `👥 **Everyone can guess!**\n` +
            `Send a number in chat.\n\n` +
            `🔥 **Warmer** = closer than the previous guess\n` +
            `❄️ **Colder** = farther than the previous guess`
        )
        .setColor(0x5865F2)
        .setFooter({
            text: `Started by ${interaction.user.username}`
        });

    await interaction.update({
        embeds: [embed],
        components: []
    });
});

// /guess command
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName !== "guess") {
        return;
    }

    if (activeGame) {
        await interaction.reply({
            content:
                "❌ There is already a game running!\n" +
                "Wait until it finishes before starting another one.",
            ephemeral: true
        });

        return;
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("difficulty_easy")
                .setLabel("Easy")
                .setEmoji("🟢")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("difficulty_medium")
                .setLabel("Medium")
                .setEmoji("🔵")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("difficulty_hard")
                .setLabel("Hard")
                .setEmoji("🟠")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("difficulty_insane")
                .setLabel("Insane")
                .setEmoji("🔴")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("difficulty_impossible")
                .setLabel("Impossible")
                .setEmoji("💀")
                .setStyle(ButtonStyle.Danger)
        );

    const embed = new EmbedBuilder()
        .setTitle("🎯 BGuesser")
        .setDescription(
            "**Choose a difficulty!**\n\n" +
            "🟢 **Easy** — 1–10 — 5 guesses\n" +
            "🔵 **Medium** — 1–25 — 5 guesses\n" +
            "🟠 **Hard** — 1–50 — 10 guesses\n" +
            "🔴 **Insane** — 1–75 — 10 guesses\n" +
            "💀 **Impossible** — 1–100 — 10 guesses\n\n" +
            "⚠️ Only **one game** can be active at a time."
        )
        .setColor(0x5865F2);

    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
});

// Guess messages
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (!activeGame) return;

    const content = message.content.trim();

    // Only accept whole numbers
    if (!/^\d+$/.test(content)) {
        return;
    }

    const guess = Number(content);

    if (guess < 1 || guess > activeGame.max) {
        await message.reply(
            `❌ Guess a number between **1 and ${activeGame.max}**.`
        );

        return;
    }

    // Correct answer
    if (guess === activeGame.number) {
        const used =
            activeGame.totalGuesses -
            activeGame.guessesLeft +
            1;

        const embed = new EmbedBuilder()
            .setTitle("🎯 CORRECT!")
            .setDescription(
                `🏆 **${message.author.username}** guessed the number!\n\n` +
                `The number was **${activeGame.number}**.\n` +
                `📊 Guesses used: **${used}/${activeGame.totalGuesses}**`
            )
            .setColor(0x57F287);

        await message.channel.send({
            embeds: [embed]
        });

        activeGame = null;

        return;
    }

    // Calculate distance
    const distance = Math.abs(
        guess - activeGame.number
    );

    let temperature;

    if (activeGame.lastDistance === null) {
        temperature = "🤔 First guess!";
    } else if (distance < activeGame.lastDistance) {
        temperature = "🔥 **WARMER!**";
    } else if (distance > activeGame.lastDistance) {
        temperature = "❄️ **COLDER!**";
    } else {
        temperature = "➡️ **Same distance!**";
    }

    activeGame.lastDistance = distance;
    activeGame.guessesLeft--;

    // Out of guesses
    if (activeGame.guessesLeft <= 0) {
        const embed = new EmbedBuilder()
            .setTitle("💀 GAME OVER")
            .setDescription(
                `Nobody found the number!\n\n` +
                `🎯 The number was **${activeGame.number}**.\n\n` +
                `Use **/guess** to start another game.`
            )
            .setColor(0xED4245);

        await message.channel.send({
            embeds: [embed]
        });

        activeGame = null;

        return;
    }

    // Normal guess
    const embed = new EmbedBuilder()
        .setTitle("🎯 BGuesser")
        .setDescription(
            `**${message.author.username}** guessed **${guess}**\n\n` +
            `${temperature}\n\n` +
            `🎯 **${activeGame.guessesLeft} guesses remaining**`
        )
        .setColor(0x5865F2);

    await message.channel.send({
        embeds: [embed]
    });
});

// Login
client.login(TOKEN);