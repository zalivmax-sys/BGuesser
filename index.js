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

// ======================================================
// DIFFICULTIES
// ======================================================

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

// ======================================================
// GAME STATE
// ======================================================

// Only one BGuesser game at a time.
let activeGuessGame = null;

// Multiple Tic-Tac-Toe games can happen at once,
// but only one per player.
const activeTicTacToeGames = new Map();

// ======================================================
// SLASH COMMANDS
// ======================================================

const commands = [
    new SlashCommandBuilder()
        .setName("games")
        .setDescription("View all games available in BGuesser. Made by @rainofgd"),

    new SlashCommandBuilder()
        .setName("guess")
        .setDescription("Start a BGuesser number guessing game."),

    new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription("Play BTikTakToe against an AI.")
].map(command => command.toJSON());

// ======================================================
// REGISTER COMMANDS
// ======================================================

async function registerCommands() {
    try {
        console.log("Registering slash commands...");

        const rest = new REST({
            version: "10"
        }).setToken(TOKEN);

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            {
                body: commands
            }
        );

        console.log("Slash commands registered!");
    } catch (error) {
        console.error("Failed to register slash commands:");
        console.error(error);
    }
}

// ======================================================
// READY
// ======================================================

client.once("clientReady", async () => {
    console.log("=================================");
    console.log(`BGuesser is online as ${client.user.tag}!`);
    console.log("=================================");

    await registerCommands();
});

// ======================================================
// /GAMES
// ======================================================

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName !== "games") {
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle("🎮 BGuesser Games")
        .setDescription(
            "**Choose a game to play!**\n\n" +

            "🎯 **BGuesser**\n" +
            "Guess the secret number before you run out of guesses.\n" +
            "Use **/guess** to play.\n\n" +

            "⭕ **BTikTakToe**\n" +
            "Play Tic-Tac-Toe against an AI using Discord buttons.\n" +
            "The AI gets stronger with each difficulty.\n" +
            "Use **/tictactoe** to play.\n\n" +

            "━━━━━━━━━━━━━━━━━━━━\n" +
            "Made by **@rainofgd**"
        )
        .setColor(0x5865F2)
        .setFooter({
            text: "BGuesser • Games"
        });

    await interaction.reply({
        embeds: [embed]
    });
});

// ======================================================
// /GUESS
// ======================================================

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName !== "guess") {
        return;
    }

    if (activeGuessGame) {
        await interaction.reply({
            content:
                "❌ There is already a BGuesser game running!\n" +
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

            "⚠️ Only **one BGuesser game** can be active at a time."
        )
        .setColor(0x5865F2);

    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
});

// ======================================================
// BGUESSER DIFFICULTY BUTTONS
// ======================================================

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    if (!interaction.customId.startsWith("difficulty_")) {
        return;
    }

    if (activeGuessGame) {
        await interaction.reply({
            content: "❌ A BGuesser game is already running!",
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
            Math.random() *
            (settings.max - settings.min + 1)
        ) + settings.min;

    activeGuessGame = {
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

// ======================================================
// BGUESSER MESSAGE HANDLER
// ======================================================

client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (!activeGuessGame) return;

    const content = message.content.trim();

    if (!/^\d+$/.test(content)) {
        return;
    }

    const guess = Number(content);

    if (
        guess < 1 ||
        guess > activeGuessGame.max
    ) {
        await message.reply(
            `❌ Guess a number between **1 and ${activeGuessGame.max}**.`
        );

        return;
    }

    // Correct
    if (guess === activeGuessGame.number) {

        const used =
            activeGuessGame.totalGuesses -
            activeGuessGame.guessesLeft +
            1;

        const embed = new EmbedBuilder()
            .setTitle("🎯 CORRECT!")
            .setDescription(
                `🏆 **${message.author.username}** guessed the number!\n\n` +

                `The number was **${activeGuessGame.number}**.\n` +

                `📊 Guesses used: **${used}/${activeGuessGame.totalGuesses}**`
            )
            .setColor(0x57F287);

        await message.channel.send({
            embeds: [embed]
        });

        activeGuessGame = null;

        return;
    }

    const distance = Math.abs(
        guess - activeGuessGame.number
    );

    let temperature;

    if (activeGuessGame.lastDistance === null) {
        temperature = "🤔 First guess!";
    } else if (
        distance < activeGuessGame.lastDistance
    ) {
        temperature = "🔥 **WARMER!**";
    } else if (
        distance > activeGuessGame.lastDistance
    ) {
        temperature = "❄️ **COLDER!**";
    } else {
        temperature = "➡️ **Same distance!**";
    }

    activeGuessGame.lastDistance = distance;
    activeGuessGame.guessesLeft--;

    // Game over
    if (activeGuessGame.guessesLeft <= 0) {

        const embed = new EmbedBuilder()
            .setTitle("💀 GAME OVER")
            .setDescription(
                `Nobody found the number!\n\n` +

                `🎯 The number was **${activeGuessGame.number}**.\n\n` +

                `Use **/guess** to start another game.`
            )
            .setColor(0xED4245);

        await message.channel.send({
            embeds: [embed]
        });

        activeGuessGame = null;

        return;
    }

    const embed = new EmbedBuilder()
        .setTitle("🎯 BGuesser")
        .setDescription(
            `**${message.author.username}** guessed **${guess}**\n\n` +

            `${temperature}\n\n` +

            `🎯 **${activeGuessGame.guessesLeft} guesses remaining**`
        )
        .setColor(0x5865F2);

    await message.channel.send({
        embeds: [embed]
    });
});

// ======================================================
// TIC-TAC-TOE HELPERS
// ======================================================

function createEmptyBoard() {
    return [
        null, null, null,
        null, null, null,
        null, null, null
    ];
}

function checkWinner(board) {

    const winningLines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],

        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],

        [0, 4, 8],
        [2, 4, 6]
    ];

    for (const [a, b, c] of winningLines) {

        if (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {
            return board[a];
        }
    }

    if (board.every(cell => cell !== null)) {
        return "draw";
    }

    return null;
}

function getAvailableMoves(board) {

    const moves = [];

    for (let i = 0; i < board.length; i++) {
        if (board[i] === null) {
            moves.push(i);
        }
    }

    return moves;
}

function randomMove(board) {

    const moves = getAvailableMoves(board);

    if (moves.length === 0) {
        return null;
    }

    return moves[
        Math.floor(Math.random() * moves.length)
    ];
}

function findWinningMove(board, player) {

    const moves = getAvailableMoves(board);

    for (const move of moves) {

        board[move] = player;

        const winner = checkWinner(board);

        board[move] = null;

        if (winner === player) {
            return move;
        }
    }

    return null;
}

// ======================================================
// MINIMAX
// ======================================================

function minimax(board, maximizing) {

    const winner = checkWinner(board);

    if (winner === "O") {
        return 10;
    }

    if (winner === "X") {
        return -10;
    }

    if (winner === "draw") {
        return 0;
    }

    const moves = getAvailableMoves(board);

    if (maximizing) {

        let bestScore = -Infinity;

        for (const move of moves) {

            board[move] = "O";

            const score =
                minimax(board, false);

            board[move] = null;

            bestScore =
                Math.max(bestScore, score);
        }

        return bestScore;

    } else {

        let bestScore = Infinity;

        for (const move of moves) {

            board[move] = "X";

            const score =
                minimax(board, true);

            board[move] = null;

            bestScore =
                Math.min(bestScore, score);
        }

        return bestScore;
    }
}

function getBestMove(board) {

    const moves = getAvailableMoves(board);

    let bestScore = -Infinity;
    let bestMove = moves[0];

    for (const move of moves) {

        board[move] = "O";

        const score =
            minimax(board, false);

        board[move] = null;

        if (score > bestScore) {

            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

// ======================================================
// AI DIFFICULTY
// ======================================================

function getAIMove(board, difficulty) {

    const moves = getAvailableMoves(board);

    if (moves.length === 0) {
        return null;
    }

    // EASY
    // Mostly random.
    if (difficulty === "easy") {

        // 25% chance to make a smart move.
        if (Math.random() < 0.25) {

            const winningMove =
                findWinningMove(board, "O");

            if (winningMove !== null) {
                return winningMove;
            }
        }

        return randomMove(board);
    }

    // MEDIUM
    // Can win and sometimes block.
    if (difficulty === "medium") {

        const winningMove =
            findWinningMove(board, "O");

        if (winningMove !== null) {
            return winningMove;
        }

        if (Math.random() < 0.70) {

            const blockingMove =
                findWinningMove(board, "X");

            if (blockingMove !== null) {
                return blockingMove;
            }
        }

        return randomMove(board);
    }

    // HARD
    // Always wins if possible and blocks.
    if (difficulty === "hard") {

        const winningMove =
            findWinningMove(board, "O");

        if (winningMove !== null) {
            return winningMove;
        }

        const blockingMove =
            findWinningMove(board, "X");

        if (blockingMove !== null) {
            return blockingMove;
        }

        // Prefer center.
        if (board[4] === null) {
            return 4;
        }

        // Prefer corners.
        const corners = [
            0, 2, 6, 8
        ].filter(
            i => board[i] === null
        );

        if (corners.length > 0) {

            return corners[
                Math.floor(
                    Math.random() * corners.length
                )
            ];
        }

        return randomMove(board);
    }

    // INSANE
    // Uses minimax most of the time.
    if (difficulty === "insane") {

        if (Math.random() < 0.90) {
            return getBestMove(board);
        }

        return randomMove(board);
    }

    // IMPOSSIBLE
    // Perfect minimax.
    if (difficulty === "impossible") {
        return getBestMove(board);
    }

    return randomMove(board);
}

// ======================================================
// TIC-TAC-TOE BUTTONS
// ======================================================

function createTicTacToeRows(gameId, board, disabled = false) {

    const rows = [];

    for (let row = 0; row < 3; row++) {

        const actionRow =
            new ActionRowBuilder();

        for (let col = 0; col < 3; col++) {

            const index =
                row * 3 + col;

            const value =
                board[index];

            let label = " ";

            if (value === "X") {
                label = "❌";
            }

            if (value === "O") {
                label = "⭕";
            }

            const button =
                new ButtonBuilder()
                    .setCustomId(
                        `ttt_${gameId}_${index}`
                    )
                    .setLabel(label)
                    .setStyle(
                        value === "X"
                            ? ButtonStyle.Danger
                            : value === "O"
                                ? ButtonStyle.Primary
                                : ButtonStyle.Secondary
                    )
                    .setDisabled(
                        disabled ||
                        value !== null
                    );

            actionRow.addComponents(button);
        }

        rows.push(actionRow);
    }

    return rows;
}

// ======================================================
// TIC-TAC-TOE EMBED
// ======================================================

function createTicTacToeEmbed(game) {

    let description =
        `You are **❌**\n` +
        `AI is **⭕**\n\n` +

        `🎮 Difficulty: **${game.difficultyName}**\n\n`;

    if (game.status === "playing") {

        if (game.turn === "player") {

            description +=
                "👉 **Your turn!**\n" +
                "Click an empty square.";

        } else {

            description +=
                "🤖 **AI is thinking...**";
        }
    }

    if (game.status === "playerWon") {

        description +=
            "🏆 **YOU WIN!**\n\n" +
            "You defeated the AI!";
    }

    if (game.status === "aiWon") {

        description +=
            "🤖 **AI WINS!**\n\n" +
            "Better luck next time!";
    }

    if (game.status === "draw") {

        description +=
            "🤝 **DRAW!**\n\n" +
            "Nobody wins this time.";
    }

    const embed =
        new EmbedBuilder()
            .setTitle("⭕ BTikTakToe")
            .setDescription(description)
            .setColor(
                game.status === "playerWon"
                    ? 0x57F287
                    : game.status === "aiWon"
                        ? 0xED4245
                        : 0x5865F2
            )
            .setFooter({
                text: "BGuesser Games • Made by @rainofgd"
            });

    return embed;
}

// ======================================================
// /TICTACTOE
// ======================================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }

    if (interaction.commandName !== "tictactoe") {
        return;
    }

    const userId =
        interaction.user.id;

    if (activeTicTacToeGames.has(userId)) {

        await interaction.reply({
            content:
                "❌ You already have a BTikTakToe game running!",
            ephemeral: true
        });

        return;
    }

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("ttt_diff_easy")
                    .setLabel("Easy")
                    .setEmoji("🟢")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("ttt_diff_medium")
                    .setLabel("Medium")
                    .setEmoji("🔵")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("ttt_diff_hard")
                    .setLabel("Hard")
                    .setEmoji("🟠")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("ttt_diff_insane")
                    .setLabel("Insane")
                    .setEmoji("🔴")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("ttt_diff_impossible")
                    .setLabel("Impossible")
                    .setEmoji("💀")
                    .setStyle(ButtonStyle.Danger)
            );

    const embed =
        new EmbedBuilder()
            .setTitle("⭕ BTikTakToe")
            .setDescription(
                "**Choose your AI difficulty!**\n\n" +

                "🟢 **Easy** — AI makes mostly random moves\n" +
                "🔵 **Medium** — AI can win and block you\n" +
                "🟠 **Hard** — AI plays strategically\n" +
                "🔴 **Insane** — AI is extremely difficult\n" +
                "💀 **Impossible** — AI plays perfectly\n\n" +

                "You will play as **❌**."
            )
            .setColor(0x5865F2)
            .setFooter({
                text: "BTikTakToe • Made by @rainofgd"
            });

    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
});

// ======================================================
// TIC-TAC-TOE DIFFICULTY BUTTONS
// ======================================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isButton()) {
        return;
    }

    if (!interaction.customId.startsWith("ttt_diff_")) {
        return;
    }

    const userId =
        interaction.user.id;

    if (activeTicTacToeGames.has(userId)) {

        await interaction.reply({
            content:
                "❌ You already have a BTikTakToe game running!",
            ephemeral: true
        });

        return;
    }

    const difficulty =
        interaction.customId.replace(
            "ttt_diff_",
            ""
        );

    const difficultyData =
        difficulties[difficulty];

    if (!difficultyData) {

        await interaction.reply({
            content: "❌ Invalid difficulty.",
            ephemeral: true
        });

        return;
    }

    const game = {

        userId,

        difficulty,

        difficultyName:
            difficultyData.name,

        board:
            createEmptyBoard(),

        turn:
            "player",

        status:
            "playing"
    };

    activeTicTacToeGames.set(
        userId,
        game
    );

    await interaction.update({
        embeds: [
            createTicTacToeEmbed(game)
        ],
        components:
            createTicTacToeRows(
                userId,
                game.board
            )
    });
});

// ======================================================
// TIC-TAC-TOE MOVE HANDLER
// ======================================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isButton()) {
        return;
    }

    if (!interaction.customId.startsWith("ttt_")) {
        return;
    }

    if (
        interaction.customId.startsWith("ttt_diff_")
    ) {
        return;
    }

    const parts =
        interaction.customId.split("_");

    if (parts.length !== 3) {
        return;
    }

    const userId = parts[1];

    const position =
        Number(parts[2]);

    const game =
        activeTicTacToeGames.get(userId);

    if (!game) {

        await interaction.reply({
            content:
                "❌ This BTikTakToe game is no longer active.",
            ephemeral: true
        });

        return;
    }

    // Only the player who started the game
    // can press its buttons.
    if (interaction.user.id !== userId) {

        await interaction.reply({
            content:
                "❌ This isn't your BTikTakToe game!",
            ephemeral: true
        });

        return;
    }

    if (game.status !== "playing") {

        await interaction.reply({
            content:
                "❌ This game has already ended.",
            ephemeral: true
        });

        return;
    }

    if (game.turn !== "player") {

        await interaction.reply({
            content:
                "🤖 The AI is thinking!",
            ephemeral: true
        });

        return;
    }

    if (
        Number.isNaN(position) ||
        position < 0 ||
        position > 8
    ) {
        return;
    }

    if (game.board[position] !== null) {

        await interaction.reply({
            content:
                "❌ That square is already taken!",
            ephemeral: true
        });

        return;
    }

    // ==================================================
    // PLAYER MOVE
    // ==================================================

    game.board[position] = "X";

    let winner =
        checkWinner(game.board);

    if (winner === "X") {

        game.status = "playerWon";

        activeTicTacToeGames.delete(
            userId
        );

        await interaction.update({
            embeds: [
                createTicTacToeEmbed(game)
            ],
            components:
                createTicTacToeRows(
                    userId,
                    game.board,
                    true
                )
        });

        return;
    }

    if (winner === "draw") {

        game.status = "draw";

        activeTicTacToeGames.delete(
            userId
        );

        await interaction.update({
            embeds: [
                createTicTacToeEmbed(game)
            ],
            components:
                createTicTacToeRows(
                    userId,
                    game.board,
                    true
                )
        });

        return;
    }

    // ==================================================
    // AI TURN
    // ==================================================

    game.turn = "ai";

    await interaction.update({
        embeds: [
            createTicTacToeEmbed(game)
        ],
        components:
            createTicTacToeRows(
                userId,
                game.board,
                true
            )
    });

    // Small delay so the AI doesn't look instant.
    setTimeout(async () => {

        // Make sure game still exists.
        const currentGame =
            activeTicTacToeGames.get(userId);

        if (!currentGame) {
            return;
        }

        const aiMove =
            getAIMove(
                currentGame.board,
                currentGame.difficulty
            );

        if (aiMove !== null) {
            currentGame.board[aiMove] = "O";
        }

        winner =
            checkWinner(
                currentGame.board
            );

        if (winner === "O") {

            currentGame.status =
                "aiWon";

            activeTicTacToeGames.delete(
                userId
            );

        } else if (winner === "draw") {

            currentGame.status =
                "draw";

            activeTicTacToeGames.delete(
                userId
            );

        } else {

            currentGame.turn =
                "player";
        }

        try {

            await interaction.editReply({
                embeds: [
                    createTicTacToeEmbed(
                        currentGame
                    )
                ],
                components:
                    createTicTacToeRows(
                        userId,
                        currentGame.board,
                        currentGame.status !== "playing"
                    )
            });

        } catch (error) {

            console.error(
                "Failed to update Tic-Tac-Toe game:",
                error
            );
        }

    }, 700);
});

// ======================================================
// ERROR HANDLING
// ======================================================

client.on("error", error => {
    console.error(
        "Discord client error:",
        error
    );
});

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);
