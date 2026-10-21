
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
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const { randomUUID } = require("node:crypto");

// =====================================================
// CLIENT
// =====================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error("Missing DISCORD_TOKEN or CLIENT_ID in .env");
    process.exit(1);
}

// =====================================================
// STATE
// =====================================================

let guessGame = null;

const tttGames = new Map();
const giveaways = new Map();

// =====================================================
// DIFFICULTIES
// =====================================================

const difficulties = {
    easy: { name: "Easy", min: 1, max: 10, guesses: 5, emoji: "🟢" },
    medium: { name: "Medium", min: 1, max: 25, guesses: 5, emoji: "🔵" },
    hard: { name: "Hard", min: 1, max: 50, guesses: 10, emoji: "🟠" },
    insane: { name: "Insane", min: 1, max: 75, guesses: 10, emoji: "🔴" },
    impossible: { name: "Impossible", min: 1, max: 100, guesses: 10, emoji: "💀" }
};

// =====================================================
// SLASH COMMANDS
// =====================================================

const commands = [
    new SlashCommandBuilder()
        .setName("games")
        .setDescription("Open BGames and choose a game."),

    new SlashCommandBuilder()
        .setName("guess")
        .setDescription("Play BGuesser."),

    new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription("Play BTikTakToe."),

    new SlashCommandBuilder()
        .setName("bgiveaway")
        .setDescription("Start a timed giveaway.")
        .addStringOption(o =>
            o.setName("duration")
                .setDescription("Duration, e.g. 10m, 2h, 1d")
                .setRequired(true))
        .addStringOption(o =>
            o.setName("title")
                .setDescription("Giveaway prize or title")
                .setMaxLength(200)
                .setRequired(true))
        .addStringOption(o =>
            o.setName("description")
                .setDescription("Giveaway details")
                .setMaxLength(1500)
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName("bban")
        .setDescription("Ban a member.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o =>
            o.setName("member")
                .setDescription("Member to ban")
                .setRequired(true))
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the ban")
                .setMaxLength(500)
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName("bkick")
        .setDescription("Kick a member.")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o =>
            o.setName("member")
                .setDescription("Member to kick")
                .setRequired(true))
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the kick")
                .setMaxLength(500)
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName("bmute")
        .setDescription("Timeout a member.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("member")
                .setDescription("Member to timeout")
                .setRequired(true))
        .addIntegerOption(o =>
            o.setName("minutes")
                .setDescription("Duration in minutes (1–40320)")
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true))
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the timeout")
                .setMaxLength(500)
                .setRequired(false))
].map(command => command.toJSON());

// =====================================================
// REGISTER COMMANDS
// =====================================================

async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log("Slash commands registered!");
    } catch (error) {
        console.error("Command registration error:", error);
    }
}

// =====================================================
// READY
// =====================================================

client.once("clientReady", async () => {
    console.log(`BMod is online as ${client.user.tag}!`);
    await registerCommands();
});

// =====================================================
// GENERAL HELPERS
// =====================================================

function errorEmbed(text) {
    return new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`❌ ${text}`);
}

function successEmbed(text) {
    return new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`✅ ${text}`);
}

function parseDuration(input) {
    const match = input.trim().match(/^(\d+)\s*(s|m|h|d)$/i);
    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    const units = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    const milliseconds = amount * units[unit];

    if (
        !Number.isSafeInteger(milliseconds) ||
        milliseconds < 1000 ||
        milliseconds > 24 * 24 * 60 * 60 * 1000
    ) {
        return null;
    }

    return milliseconds;
}

// =====================================================
// GIVEAWAYS
// =====================================================

function giveawayEmbed(giveaway, ended = false, winner = null) {
    return new EmbedBuilder()
        .setTitle(`🎉 ${giveaway.title}`)
        .setDescription([
            `**Prize:** ${giveaway.title}`,
            "",
            giveaway.description,
            "",
            `**Hosted by:** <@${giveaway.hostId}>`,
            `**Entries:** ${giveaway.entries.size}`,
            ended
                ? winner
                    ? `**Winner:** <@${winner}>`
                    : "**Winner:** Nobody entered."
                : `**Ends:** <t:${Math.floor(giveaway.endsAt / 1000)}:R>`,
            "",
            ended ? "🎉 Giveaway ended!" : "Click below to enter!"
        ].join("\n"))
        .setColor(ended ? 0x57F287 : 0x5865F2)
        .setFooter({ text: "BMod Giveaways" })
        .setTimestamp();
}

function giveawayButtons(giveaway, disabled = false) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`BMOD_GIVEAWAY_ENTER_${giveaway.id}`)
                .setLabel("Enter Giveaway")
                .setEmoji("🎉")
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled)
        )
    ];
}

async function endGiveaway(id) {
    const giveaway = giveaways.get(id);

    if (!giveaway || giveaway.ended) return;

    giveaway.ended = true;

    const entries = [...giveaway.entries];
    const winner = entries.length
        ? entries[Math.floor(Math.random() * entries.length)]
        : null;

    try {
        const channel = await client.channels.fetch(giveaway.channelId);

        if (!channel || !channel.isTextBased()) return;

        const message = await channel.messages.fetch(giveaway.messageId);

        await message.edit({
            embeds: [giveawayEmbed(giveaway, true, winner)],
            components: giveawayButtons(giveaway, true)
        });

        if (winner) {
            await channel.send({
                content: `🎉 Congratulations <@${winner}>! You won **${giveaway.title}**!`,
                allowedMentions: { users: [winner] }
            });
        } else {
            await channel.send(`The giveaway **${giveaway.title}** ended with no entries.`);
        }
    } catch (error) {
        console.error("[GIVEAWAY] Failed to end giveaway:", error);
    } finally {
        giveaways.delete(id);
    }
}

// =====================================================
// MODERATION HELPERS
// =====================================================

async function getModerationTarget(interaction) {
    const user = interaction.options.getUser("member", true);

    if (user.id === interaction.user.id) {
        return { error: "You cannot moderate yourself." };
    }

    if (user.id === client.user.id) {
        return { error: "You cannot moderate the bot." };
    }

    if (user.id === interaction.guild.ownerId) {
        return { error: "The server owner cannot be moderated by this command." };
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return { error: "That user is not a member of this server." };
    }

    const moderator = await interaction.guild.members
        .fetch(interaction.user.id)
        .catch(() => null);

    const botMember = interaction.guild.members.me;

    if (!moderator || !botMember) {
        return { error: "Could not verify member permissions." };
    }

    if (
        interaction.user.id !== interaction.guild.ownerId &&
        moderator.roles.highest.comparePositionTo(member.roles.highest) <= 0
    ) {
        return { error: "Your highest role must be above the target's highest role." };
    }

    if (botMember.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
        return { error: "My highest role must be above the target's highest role." };
    }

    return { user, member };
}

// =====================================================
// GAMES MENU
// =====================================================

function gamesEmbed() {
    return new EmbedBuilder()
        .setTitle("🎮 BGames")
        .setDescription(
            "**Choose a game:**\n\n" +
            "🎯 **BGuesser**\nGuess the secret number.\n\n" +
            "⭕ **BTikTakToe**\nPlay Tic-Tac-Toe against an AI.\n\n" +
            "🪨 **Rock Paper Scissors**\nPlay against the bot.\n\n" +
            "━━━━━━━━━━━━━━━━━━\n\n" +
            "Made by **@rainofgd**"
        )
        .setColor(0x5865F2);
}

function gamesButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("BG_GAMES_GUESS")
                .setLabel("BGuesser")
                .setEmoji("🎯")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("BG_GAMES_TTT")
                .setLabel("BTikTakToe")
                .setEmoji("⭕")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("BG_GAMES_RPS")
                .setLabel("Rock Paper Scissors")
                .setEmoji("🪨")
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

// =====================================================
// ROCK PAPER SCISSORS
// =====================================================

function rpsEmbed() {
    return new EmbedBuilder()
        .setTitle("🪨 Rock Paper Scissors")
        .setDescription(
            "**Choose your move:**\n\n" +
            "🪨 **Rock**\n📄 **Paper**\n✂️ **Scissors**\n\n" +
            "The bot will choose at the same time!"
        )
        .setColor(0x5865F2)
        .setFooter({ text: "BGames • Made by @rainofgd" });
}

function rpsButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("BG_RPS_ROCK")
                .setLabel("Rock")
                .setEmoji("🪨")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("BG_RPS_PAPER")
                .setLabel("Paper")
                .setEmoji("📄")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("BG_RPS_SCISSORS")
                .setLabel("Scissors")
                .setEmoji("✂️")
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

function rpsResultEmbed(playerChoice, botChoice, result) {
    const results = {
        WIN: { text: "🏆 **YOU WIN!**", color: 0x57F287 },
        LOSE: { text: "🤖 **BOT WINS!**", color: 0xED4245 },
        DRAW: { text: "🤝 **DRAW!**", color: 0x5865F2 }
    };

    return new EmbedBuilder()
        .setTitle("🪨 Rock Paper Scissors")
        .setDescription(
            `👤 **You:** ${playerChoice}\n` +
            `🤖 **Bot:** ${botChoice}\n\n` +
            "━━━━━━━━━━━━━━━━━━\n\n" +
            results[result].text
        )
        .setColor(results[result].color)
        .setFooter({ text: "BGames • Made by @rainofgd" });
}

function rpsResultButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("BG_RPS_PLAY_AGAIN")
                .setLabel("Play Again")
                .setEmoji("🔄")
                .setStyle(ButtonStyle.Success)
        )
    ];
}

// =====================================================
// BGUESSER DIFFICULTY MENU
// =====================================================

function guessDifficultyEmbed() {
    return new EmbedBuilder()
        .setTitle("🎯 BGuesser")
        .setDescription(
            "**Choose a difficulty:**\n\n" +
            "🟢 **Easy** — 1–10 — 5 guesses\n" +
            "🔵 **Medium** — 1–25 — 5 guesses\n" +
            "🟠 **Hard** — 1–50 — 10 guesses\n" +
            "🔴 **Insane** — 1–75 — 10 guesses\n" +
            "💀 **Impossible** — 1–100 — 10 guesses"
        )
        .setColor(0x5865F2);
}

function guessDifficultyButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("BG_G_EASY").setLabel("Easy").setEmoji("🟢").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("BG_G_MEDIUM").setLabel("Medium").setEmoji("🔵").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("BG_G_HARD").setLabel("Hard").setEmoji("🟠").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("BG_G_INSANE").setLabel("Insane").setEmoji("🔴").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("BG_G_IMPOSSIBLE").setLabel("Impossible").setEmoji("💀").setStyle(ButtonStyle.Danger)
        )
    ];
}

// =====================================================
// TICTACTOE DIFFICULTY MENU
// =====================================================

function tttDifficultyEmbed() {
    return new EmbedBuilder()
        .setTitle("⭕ BTikTakToe")
        .setDescription(
            "**Choose the AI difficulty:**\n\n" +
            "🟢 **Easy** — Mostly random moves.\n\n" +
            "🔵 **Medium** — Can win and block you.\n\n" +
            "🟠 **Hard** — Plays strategically.\n\n" +
            "🔴 **Insane** — Very difficult.\n\n" +
            "💀 **Impossible** — Perfect AI.\n\n" +
            "You play as **❌**."
        )
        .setColor(0x5865F2)
        .setFooter({ text: "BGames • Made by @rainofgd" });
}

function tttDifficultyButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("BG_T_EASY").setLabel("Easy").setEmoji("🟢").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("BG_T_MEDIUM").setLabel("Medium").setEmoji("🔵").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("BG_T_HARD").setLabel("Hard").setEmoji("🟠").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("BG_T_INSANE").setLabel("Insane").setEmoji("🔴").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("BG_T_IMPOSSIBLE").setLabel("Impossible").setEmoji("💀").setStyle(ButtonStyle.Danger)
        )
    ];
}

// =====================================================
// TICTACTOE BOARD & AI
// =====================================================

function createBoard() {
    return Array(9).fill(null);
}

function createBoardButtons(userId, board, disabled = false) {
    const rows = [];

    for (let row = 0; row < 3; row++) {
        const actionRow = new ActionRowBuilder();

        for (let column = 0; column < 3; column++) {
            const position = row * 3 + column;
            const mark = board[position];

            const button = new ButtonBuilder()
                .setCustomId(`BG_TTT_MOVE_${userId}_${position}`)
                .setDisabled(disabled || mark !== null);

            if (mark === "X") {
                button.setEmoji("❌").setStyle(ButtonStyle.Success);
            } else if (mark === "O") {
                button.setEmoji("⭕").setStyle(ButtonStyle.Primary);
            } else {
                button.setLabel("\u200B").setStyle(ButtonStyle.Secondary);
            }

            actionRow.addComponents(button);
        }

        rows.push(actionRow);
    }

    return rows;
}

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    return board.every(cell => cell !== null) ? "DRAW" : null;
}

function getEmptySpaces(board) {
    return board
        .map((cell, index) => cell === null ? index : -1)
        .filter(index => index !== -1);
}

function findWinningMove(board, player) {
    for (const position of getEmptySpaces(board)) {
        board[position] = player;
        const result = checkWinner(board);
        board[position] = null;

        if (result === player) return position;
    }

    return null;
}

function randomMove(board) {
    const spaces = getEmptySpaces(board);
    if (!spaces.length) return null;

    return spaces[Math.floor(Math.random() * spaces.length)];
}

function minimax(board, maximizing) {
    const result = checkWinner(board);

    if (result === "O") return 10;
    if (result === "X") return -10;
    if (result === "DRAW") return 0;

    const spaces = getEmptySpaces(board);

    if (maximizing) {
        let bestScore = -Infinity;

        for (const position of spaces) {
            board[position] = "O";
            bestScore = Math.max(bestScore, minimax(board, false));
            board[position] = null;
        }

        return bestScore;
    }

    let bestScore = Infinity;

    for (const position of spaces) {
        board[position] = "X";
        bestScore = Math.min(bestScore, minimax(board, true));
        board[position] = null;
    }

    return bestScore;
}

function perfectMove(board) {
    let bestScore = -Infinity;
    let bestMove = null;

    for (const position of getEmptySpaces(board)) {
        board[position] = "O";
        const score = minimax(board, false);
        board[position] = null;

        if (score > bestScore) {
            bestScore = score;
            bestMove = position;
        }
    }

    return bestMove;
}

function chooseAIMove(board, difficulty) {
    if (difficulty === "easy") {
        if (Math.random() < 0.2) {
            const win = findWinningMove(board, "O");
            if (win !== null) return win;
        }

        return randomMove(board);
    }

    if (difficulty === "medium") {
        const win = findWinningMove(board, "O");
        if (win !== null) return win;

        if (Math.random() < 0.7) {
            const block = findWinningMove(board, "X");
            if (block !== null) return block;
        }

        return randomMove(board);
    }

    if (difficulty === "hard") {
        const win = findWinningMove(board, "O");
        if (win !== null) return win;

        const block = findWinningMove(board, "X");
        if (block !== null) return block;

        if (board[4] === null) return 4;

        const corners = [0, 2, 6, 8].filter(p => board[p] === null);

        if (corners.length) {
            return corners[Math.floor(Math.random() * corners.length)];
        }

        return randomMove(board);
    }

    if (difficulty === "insane" && Math.random() >= 0.9) {
        return randomMove(board);
    }

    return perfectMove(board);
}

function createTTTEmbed(game) {
    let description =
        "❌ **You**\n⭕ **AI**\n\n" +
        `Difficulty: **${game.difficultyName}**\n\n`;

    if (game.status === "PLAYING") {
        description += game.turn === "PLAYER"
            ? "👉 **Your turn!**"
            : "🤖 **AI is thinking...**";
    } else if (game.status === "WIN") {
        description += "🏆 **YOU WIN!**";
    } else if (game.status === "LOSE") {
        description += "🤖 **AI WINS!**";
    } else if (game.status === "DRAW") {
        description += "🤝 **DRAW!**";
    }

    return new EmbedBuilder()
        .setTitle("⭕ BTikTakToe")
        .setDescription(description)
        .setColor(
            game.status === "WIN" ? 0x57F287 :
            game.status === "LOSE" ? 0xED4245 :
            0x5865F2
        )
        .setFooter({ text: "BGames • Made by @rainofgd" });
}

// =====================================================
// INTERACTION HANDLER
// =====================================================

client.on("interactionCreate", async interaction => {
    try {
        // -------------------------------------------------
        // SLASH COMMANDS
        // -------------------------------------------------

        if (interaction.isChatInputCommand()) {
            const name = interaction.commandName;

            // /games
            if (name === "games") {
                await interaction.reply({
                    embeds: [gamesEmbed()],
                    components: gamesButtons()
                });
                return;
            }

            // /guess
            if (name === "guess") {
                if (guessGame !== null) {
                    await interaction.reply({
                        content: "❌ A BGuesser game is already running.",
                        ephemeral: true
                    });
                    return;
                }

                await interaction.reply({
                    embeds: [guessDifficultyEmbed()],
                    components: guessDifficultyButtons()
                });
                return;
            }

            // /tictactoe
            if (name === "tictactoe") {
                if (tttGames.has(interaction.user.id)) {
                    await interaction.reply({
                        content: "❌ You already have a BTikTakToe game running.",
                        ephemeral: true
                    });
                    return;
                }

                await interaction.reply({
                    embeds: [tttDifficultyEmbed()],
                    components: tttDifficultyButtons()
                });
                return;
            }

            // /bgiveaway
            if (name === "bgiveaway") {
                if (!interaction.inGuild()) {
                    await interaction.reply({
                        content: "Giveaways can only be created in a server.",
                        ephemeral: true
                    });
                    return;
                }

                if (!interaction.channel?.isTextBased()) {
                    await interaction.reply({
                        content: "Use this command in a text channel.",
                        ephemeral: true
                    });
                    return;
                }

                const durationInput = interaction.options.getString("duration", true);
                const title = interaction.options.getString("title", true);
                const description = interaction.options.getString("description", true);
                const duration = parseDuration(durationInput);

                if (!duration) {
                    await interaction.reply({
                        content: "❌ Invalid duration. Use `10m`, `2h`, or `1d`. Maximum duration is 24 days.",
                        ephemeral: true
                    });
                    return;
                }

                const id = randomUUID().replace(/-/g, "").slice(0, 20);

                const giveaway = {
                    id,
                    guildId: interaction.guildId,
                    channelId: interaction.channelId,
                    messageId: null,
                    hostId: interaction.user.id,
                    title,
                    description,
                    endsAt: Date.now() + duration,
                    entries: new Set(),
                    ended: false
                };

                const message = await interaction.channel.send({
                    embeds: [giveawayEmbed(giveaway)],
                    components: giveawayButtons(giveaway)
                });

                giveaway.messageId = message.id;
                giveaways.set(id, giveaway);

                setTimeout(() => {
                    endGiveaway(id).catch(error =>
                        console.error("[GIVEAWAY] Timer error:", error)
                    );
                }, duration);

                await interaction.reply({
                    content: `✅ Giveaway created! It ends in **${durationInput}**.`,
                    ephemeral: true
                });
                return;
            }

            // /bban
            if (name === "bban") {
                if (!interaction.inGuild()) {
                    await interaction.reply({
                        content: "This command only works in a server.",
                        ephemeral: true
                    });
                    return;
                }

                if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
                    await interaction.reply({
                        content: "❌ You need the **Ban Members** permission.",
                        ephemeral: true
                    });
                    return;
                }

                const target = await getModerationTarget(interaction);

                if (target.error) {
                    await interaction.reply({
                        embeds: [errorEmbed(target.error)],
                        ephemeral: true
                    });
                    return;
                }

                if (!target.member.bannable) {
                    await interaction.reply({
                        content: "❌ I cannot ban that member. Check my role position and permissions.",
                        ephemeral: true
                    });
                    return;
                }

                const reason = interaction.options.getString("reason") || "No reason provided";

                await target.member.ban({
                    reason: `${reason} | Moderator: ${interaction.user.tag}`
                });

                await interaction.reply({
                    embeds: [successEmbed(`Banned **${target.user.tag}**.\nReason: ${reason}`)]
                });
                return;
            }

            // /bkick
            if (name === "bkick") {
                if (!interaction.inGuild()) {
                    await interaction.reply({
                        content: "This command only works in a server.",
                        ephemeral: true
                    });
                    return;
                }

                if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
                    await interaction.reply({
                        content: "❌ You need the **Kick Members** permission.",
                        ephemeral: true
                    });
                    return;
                }

                const target = await getModerationTarget(interaction);

                if (target.error) {
                    await interaction.reply({
                        embeds: [errorEmbed(target.error)],
                        ephemeral: true
                    });
                    return;
                }

                if (!target.member.kickable) {
                    await interaction.reply({
                        content: "❌ I cannot kick that member. Check my role position and permissions.",
                        ephemeral: true
                    });
                    return;
                }

                const reason = interaction.options.getString("reason") || "No reason provided";

                await target.member.kick(`${reason} | Moderator: ${interaction.user.tag}`);

                await interaction.reply({
                    embeds: [successEmbed(`Kicked **${target.user.tag}**.\nReason: ${reason}`)]
                });
                return;
            }

            // /bmute
            if (name === "bmute") {
                if (!interaction.inGuild()) {
                    await interaction.reply({
                        content: "This command only works in a server.",
                        ephemeral: true
                    });
                    return;
                }

                if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
                    await interaction.reply({
                        content: "❌ You need the **Moderate Members** permission.",
                        ephemeral: true
                    });
                    return;
                }

                const target = await getModerationTarget(interaction);

                if (target.error) {
                    await interaction.reply({
                        embeds: [errorEmbed(target.error)],
                        ephemeral: true
                    });
                    return;
                }

                if (!target.member.moderatable) {
                    await interaction.reply({
                        content: "❌ I cannot timeout that member. Check my role position and permissions.",
                        ephemeral: true
                    });
                    return;
                }

                const minutes = interaction.options.getInteger("minutes", true);
                const reason = interaction.options.getString("reason") || "No reason provided";

                await target.member.timeout(
                    minutes * 60 * 1000,
                    `${reason} | Moderator: ${interaction.user.tag}`
                );

                await interaction.reply({
                    embeds: [
                        successEmbed(
                            `Timed out **${target.user.tag}** for **${minutes} minute(s)**.\nReason: ${reason}`
                        )
                    ]
                });
                return;
            }

            return;
        }

        // -------------------------------------------------
        // BUTTONS
        // -------------------------------------------------

        if (!interaction.isButton()) return;

        const id = interaction.customId;

        // Giveaway entry
        if (id.startsWith("BMOD_GIVEAWAY_ENTER_")) {
            const giveawayId = id.slice("BMOD_GIVEAWAY_ENTER_".length);
            const giveaway = giveaways.get(giveawayId);

            if (!giveaway || giveaway.ended) {
                await interaction.reply({
                    content: "❌ This giveaway has ended or is no longer available.",
                    ephemeral: true
                });
                return;
            }

            if (giveaway.entries.has(interaction.user.id)) {
                await interaction.reply({
                    content: "You've already entered this giveaway! 🎉",
                    ephemeral: true
                });
                return;
            }

            giveaway.entries.add(interaction.user.id);

            await interaction.reply({
                content: "🎉 You've entered the giveaway!",
                ephemeral: true
            });

            try {
                await interaction.message.edit({
                    embeds: [giveawayEmbed(giveaway)],
                    components: giveawayButtons(giveaway)
                });
            } catch (error) {
                console.error("[GIVEAWAY] Could not update entry count:", error);
            }

            return;
        }

        // Games menu -> BGuesser
        if (id === "BG_GAMES_GUESS") {
            if (guessGame !== null) {
                await interaction.reply({
                    content: "❌ A BGuesser game is already running.",
                    ephemeral: true
                });
                return;
            }

            await interaction.update({
                embeds: [guessDifficultyEmbed()],
                components: guessDifficultyButtons()
            });
            return;
        }

        // Games menu -> Tic-Tac-Toe
        if (id === "BG_GAMES_TTT") {
            if (tttGames.has(interaction.user.id)) {
                await interaction.reply({
                    content: "❌ You already have a BTikTakToe game running.",
                    ephemeral: true
                });
                return;
            }

            await interaction.update({
                embeds: [tttDifficultyEmbed()],
                components: tttDifficultyButtons()
            });
            return;
        }

        // Games menu -> RPS
        if (id === "BG_GAMES_RPS") {
            await interaction.update({
                embeds: [rpsEmbed()],
                components: rpsButtons()
            });
            return;
        }

        // RPS move
        if (["BG_RPS_ROCK", "BG_RPS_PAPER", "BG_RPS_SCISSORS"].includes(id)) {
            const choices = {
                BG_RPS_ROCK: { name: "🪨 Rock", value: "rock" },
                BG_RPS_PAPER: { name: "📄 Paper", value: "paper" },
                BG_RPS_SCISSORS: { name: "✂️ Scissors", value: "scissors" }
            };

            const player = choices[id];
            const botChoices = Object.values(choices);
            const bot = botChoices[Math.floor(Math.random() * botChoices.length)];

            let result = "DRAW";

            if (player.value !== bot.value) {
                const playerWins =
                    (player.value === "rock" && bot.value === "scissors") ||
                    (player.value === "paper" && bot.value === "rock") ||
                    (player.value === "scissors" && bot.value === "paper");

                result = playerWins ? "WIN" : "LOSE";
            }

            await interaction.update({
                embeds: [rpsResultEmbed(player.name, bot.name, result)],
                components: rpsResultButtons()
            });
            return;
        }

        // RPS play again
        if (id === "BG_RPS_PLAY_AGAIN") {
            await interaction.update({
                embeds: [rpsEmbed()],
                components: rpsButtons()
            });
            return;
        }

        // Tic-Tac-Toe difficulty
        if (id.startsWith("BG_T_") && difficulties[id.slice(5).toLowerCase()]) {
            const difficulty = id.slice(5).toLowerCase();
            const settings = difficulties[difficulty];
            const userId = interaction.user.id;

            if (tttGames.has(userId)) {
                await interaction.reply({
                    content: "❌ You already have a BTikTakToe game running.",
                    ephemeral: true
                });
                return;
            }

            const game = {
                userId,
                difficulty,
                difficultyName: settings.name,
                board: createBoard(),
                turn: "PLAYER",
                status: "PLAYING"
            };

            tttGames.set(userId, game);

            await interaction.update({
                embeds: [createTTTEmbed(game)],
                components: createBoardButtons(userId, game.board)
            });
            return;
        }

        // BGuesser difficulty
        if (id.startsWith("BG_G_") && difficulties[id.slice(5).toLowerCase()]) {
            const difficulty = id.slice(5).toLowerCase();
            const settings = difficulties[difficulty];

            if (guessGame !== null) {
                await interaction.reply({
                    content: "❌ A BGuesser game is already running.",
                    ephemeral: true
                });
                return;
            }

            const number = Math.floor(
                Math.random() * (settings.max - settings.min + 1)
            ) + settings.min;

            guessGame = {
                number,
                max: settings.max,
                guessesLeft: settings.guesses,
                totalGuesses: settings.guesses,
                lastDistance: null
            };

            const embed = new EmbedBuilder()
                .setTitle(`${settings.emoji} ${settings.name} BGuesser`)
                .setDescription(
                    `A secret number between **${settings.min} and ${settings.max}** was chosen!\n\n` +
                    `🎯 **${settings.guesses} guesses**\n\n` +
                    "👥 Everyone can guess!\n\n" +
                    "🔥 **Warmer** = closer\n❄️ **Colder** = farther"
                )
                .setColor(0x5865F2);

            await interaction.update({
                embeds: [embed],
                components: []
            });
            return;
        }

        // Tic-Tac-Toe board move
        if (id.startsWith("BG_TTT_MOVE_")) {
            const data = id.slice("BG_TTT_MOVE_".length);
            const separator = data.lastIndexOf("_");

            if (separator === -1) return;

            const userId = data.slice(0, separator);
            const position = Number(data.slice(separator + 1));
            const game = tttGames.get(userId);

            if (!game) {
                await interaction.reply({
                    content: "❌ This game has ended.",
                    ephemeral: true
                });
                return;
            }

            if (interaction.user.id !== userId) {
                await interaction.reply({
                    content: "❌ This is not your game!",
                    ephemeral: true
                });
                return;
            }

            if (game.status !== "PLAYING") return;

            if (game.turn !== "PLAYER") {
                await interaction.reply({
                    content: "🤖 Wait for the AI!",
                    ephemeral: true
                });
                return;
            }

            if (
                !Number.isInteger(position) ||
                position < 0 ||
                position > 8 ||
                game.board[position] !== null
            ) {
                await interaction.reply({
                    content: "❌ That move isn't valid.",
                    ephemeral: true
                });
                return;
            }

            game.board[position] = "X";
            let result = checkWinner(game.board);

            if (result === "X" || result === "DRAW") {
                game.status = result === "X" ? "WIN" : "DRAW";
                tttGames.delete(userId);

                await interaction.update({
                    embeds: [createTTTEmbed(game)],
                    components: createBoardButtons(userId, game.board, true)
                });
                return;
            }

            game.turn = "AI";

            await interaction.update({
                embeds: [createTTTEmbed(game)],
                components: createBoardButtons(userId, game.board, true)
            });

            setTimeout(async () => {
                const currentGame = tttGames.get(userId);
                if (!currentGame) return;

                const aiMove = chooseAIMove(
                    currentGame.board,
                    currentGame.difficulty
                );

                if (aiMove !== null) {
                    currentGame.board[aiMove] = "O";
                }

                const aiResult = checkWinner(currentGame.board);

                if (aiResult === "O") {
                    currentGame.status = "LOSE";
                    tttGames.delete(userId);
                } else if (aiResult === "DRAW") {
                    currentGame.status = "DRAW";
                    tttGames.delete(userId);
                } else {
                    currentGame.turn = "PLAYER";
                }

                try {
                    await interaction.editReply({
                        embeds: [createTTTEmbed(currentGame)],
                        components: createBoardButtons(
                            userId,
                            currentGame.board,
                            currentGame.status !== "PLAYING"
                        )
                    });
                } catch (error) {
                    console.error("[TTT] AI update error:", error);
                }
            }, 700);

            return;
        }
    } catch (error) {
        console.error("[INTERACTION ERROR]", error);

        try {
            if (interaction.deferred) {
                await interaction.editReply({
                    content: "❌ Something went wrong."
                });
            } else if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ Something went wrong. Check the bot console.",
                    ephemeral: true
                });
            }
        } catch (_) {}
    }
});

// =====================================================
// BGUESSER MESSAGE HANDLER
// =====================================================

client.on("messageCreate", async message => {
    if (message.author.bot || guessGame === null) return;

    const text = message.content.trim();
    if (!/^\d+$/.test(text)) return;

    const guess = Number(text);

    if (guess < 1 || guess > guessGame.max) {
        await message.reply(
            `❌ Enter a number between **1 and ${guessGame.max}**.`
        );
        return;
    }

    if (guess === guessGame.number) {
        const used =
            guessGame.totalGuesses - guessGame.guessesLeft + 1;

        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🎯 BGuesser — CORRECT!")
                    .setDescription(
                        `🏆 **${message.author.username}** guessed the number!\n\n` +
                        `The number was **${guessGame.number}**.\n\n` +
                        `Guesses used: **${used}/${guessGame.totalGuesses}**`
                    )
                    .setColor(0x57F287)
            ]
        });

        guessGame = null;
        return;
    }

    const distance = Math.abs(guess - guessGame.number);

    let resultText;

    if (guessGame.lastDistance === null) {
        resultText = "🤔 First guess!";
    } else if (distance < guessGame.lastDistance) {
        resultText = "🔥 **WARMER!**";
    } else if (distance > guessGame.lastDistance) {
        resultText = "❄️ **COLDER!**";
    } else {
        resultText = "➡️ **SAME DISTANCE!**";
    }

    guessGame.lastDistance = distance;
    guessGame.guessesLeft--;

    if (guessGame.guessesLeft <= 0) {
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("💀 BGuesser — GAME OVER")
                    .setDescription(
                        `The number was **${guessGame.number}**.\n\n` +
                        "Use **/games** to play again."
                    )
                    .setColor(0xED4245)
            ]
        });

        guessGame = null;
        return;
    }

    await message.channel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle("🎯 BGuesser")
                .setDescription(
                    `**${message.author.username}** guessed **${guess}**\n\n` +
                    `${resultText}\n\n` +
                    `🎯 **${guessGame.guessesLeft} guesses remaining**`
                )
                .setColor(0x5865F2)
        ]
    });
});

// =====================================================
// ERROR HANDLING & LOGIN
// =====================================================

client.on("error", error => {
    console.error("Discord client error:", error);
});

client.login(TOKEN);
