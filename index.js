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

let activeGuessGame = null;

const activeTicTacToeGames = new Map();

// ======================================================
// COMMANDS
// ======================================================

const commands = [
    new SlashCommandBuilder()
        .setName("games")
        .setDescription(
            "Open BGames and choose a game. Made by @rainofgd"
        ),

    new SlashCommandBuilder()
        .setName("guess")
        .setDescription(
            "Play BGuesser."
        ),

    new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription(
            "Play BTikTakToe against an AI."
        )
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

        console.error(
            "Slash command registration error:",
            error
        );
    }
}

// ======================================================
// READY
// ======================================================

client.once("clientReady", async () => {

    console.log(
        `BGames is online as ${client.user.tag}!`
    );

    await registerCommands();
});

// ======================================================
// B GAMES MAIN MENU
// ======================================================

function gamesEmbed() {

    return new EmbedBuilder()

        .setTitle("🎮 BGames")

        .setDescription(
            "**Choose a game!**\n\n" +

            "🎯 **BGuesser**\n" +
            "Guess the secret number.\n\n" +

            "⭕ **BTikTakToe**\n" +
            "Play Tic-Tac-Toe against an AI.\n\n" +

            "━━━━━━━━━━━━━━━━━━\n" +

            "Made by **@rainofgd**"
        )

        .setColor(0x5865F2)

        .setFooter({
            text: "BGames"
        });
}

function gamesButtons() {

    return new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()
                .setCustomId("game_guess")
                .setLabel("BGuesser")
                .setEmoji("🎯")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("game_ttt")
                .setLabel("BTikTakToe")
                .setEmoji("⭕")
                .setStyle(ButtonStyle.Success)
        );
}

// ======================================================
// BGUESSER DIFFICULTY
// ======================================================

function guessDifficultyButtons() {

    return new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()
                .setCustomId("guess_easy")
                .setLabel("Easy")
                .setEmoji("🟢")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("guess_medium")
                .setLabel("Medium")
                .setEmoji("🔵")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("guess_hard")
                .setLabel("Hard")
                .setEmoji("🟠")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("guess_insane")
                .setLabel("Insane")
                .setEmoji("🔴")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("guess_impossible")
                .setLabel("Impossible")
                .setEmoji("💀")
                .setStyle(ButtonStyle.Danger)
        );
}

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

// ======================================================
// TIC TAC TOE DIFFICULTY
// ======================================================

function tttDifficultyButtons() {

    return new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()
                .setCustomId("ttt_easy")
                .setLabel("Easy")
                .setEmoji("🟢")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("ttt_medium")
                .setLabel("Medium")
                .setEmoji("🔵")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("ttt_hard")
                .setLabel("Hard")
                .setEmoji("🟠")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("ttt_insane")
                .setLabel("Insane")
                .setEmoji("🔴")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("ttt_impossible")
                .setLabel("Impossible")
                .setEmoji("💀")
                .setStyle(ButtonStyle.Danger)
        );
}

function tttDifficultyEmbed() {

    return new EmbedBuilder()

        .setTitle("⭕ BTikTakToe")

        .setDescription(
            "**Choose the AI difficulty:**\n\n" +

            "🟢 **Easy**\n" +
            "Mostly random moves.\n\n" +

            "🔵 **Medium**\n" +
            "Can win and block sometimes.\n\n" +

            "🟠 **Hard**\n" +
            "Plays strategically.\n\n" +

            "🔴 **Insane**\n" +
            "Very difficult AI.\n\n" +

            "💀 **Impossible**\n" +
            "Perfect AI.\n\n" +

            "You are **❌**."
        )

        .setColor(0x5865F2)

        .setFooter({
            text: "BGames • Made by @rainofgd"
        });
}

// ======================================================
// TIC TAC TOE BOARD
// ======================================================

function emptyBoard() {

    return [
        null, null, null,
        null, null, null,
        null, null, null
    ];
}

function createBoardButtons(gameId, board, disabled = false) {

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
                        `move_${gameId}_${index}`
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
// TIC TAC TOE WIN CHECK
// ======================================================

function checkWinner(board) {

    const lines = [

        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],

        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],

        [0, 4, 8],
        [2, 4, 6]
    ];

    for (const line of lines) {

        const [a, b, c] = line;

        if (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {

            return board[a];
        }
    }

    if (
        board.every(
            cell => cell !== null
        )
    ) {

        return "draw";
    }

    return null;
}

function availableMoves(board) {

    const moves = [];

    for (let i = 0; i < 9; i++) {

        if (board[i] === null) {
            moves.push(i);
        }
    }

    return moves;
}

// ======================================================
// TIC TAC TOE AI
// ======================================================

function winningMove(board, player) {

    for (const move of availableMoves(board)) {

        board[move] = player;

        const winner =
            checkWinner(board);

        board[move] = null;

        if (winner === player) {
            return move;
        }
    }

    return null;
}

function randomMove(board) {

    const moves =
        availableMoves(board);

    if (!moves.length) {
        return null;
    }

    return moves[
        Math.floor(
            Math.random() * moves.length
        )
    ];
}

function minimax(board, maximizing) {

    const winner =
        checkWinner(board);

    if (winner === "O") {
        return 10;
    }

    if (winner === "X") {
        return -10;
    }

    if (winner === "draw") {
        return 0;
    }

    const moves =
        availableMoves(board);

    if (maximizing) {

        let best = -Infinity;

        for (const move of moves) {

            board[move] = "O";

            const score =
                minimax(
                    board,
                    false
                );

            board[move] = null;

            best =
                Math.max(
                    best,
                    score
                );
        }

        return best;

    } else {

        let best = Infinity;

        for (const move of moves) {

            board[move] = "X";

            const score =
                minimax(
                    board,
                    true
                );

            board[move] = null;

            best =
                Math.min(
                    best,
                    score
                );
        }

        return best;
    }
}

function bestMove(board) {

    let bestScore = -Infinity;
    let best = null;

    for (const move of availableMoves(board)) {

        board[move] = "O";

        const score =
            minimax(
                board,
                false
            );

        board[move] = null;

        if (score > bestScore) {

            bestScore = score;
            best = move;
        }
    }

    return best;
}

function aiMove(board, difficulty) {

    if (difficulty === "easy") {

        if (Math.random() < 0.2) {

            const win =
                winningMove(
                    board,
                    "O"
                );

            if (win !== null) {
                return win;
            }
        }

        return randomMove(board);
    }

    if (difficulty === "medium") {

        const win =
            winningMove(
                board,
                "O"
            );

        if (win !== null) {
            return win;
        }

        if (Math.random() < 0.7) {

            const block =
                winningMove(
                    board,
                    "X"
                );

            if (block !== null) {
                return block;
            }
        }

        return randomMove(board);
    }

    if (difficulty === "hard") {

        const win =
            winningMove(
                board,
                "O"
            );

        if (win !== null) {
            return win;
        }

        const block =
            winningMove(
                board,
                "X"
            );

        if (block !== null) {
            return block;
        }

        if (board[4] === null) {
            return 4;
        }

        const corners =
            [0, 2, 6, 8].filter(
                i => board[i] === null
            );

        if (corners.length) {

            return corners[
                Math.floor(
                    Math.random() *
                    corners.length
                )
            ];
        }

        return randomMove(board);
    }

    if (difficulty === "insane") {

        if (Math.random() < 0.9) {
            return bestMove(board);
        }

        return randomMove(board);
    }

    return bestMove(board);
}

// ======================================================
// TIC TAC TOE EMBED
// ======================================================

function tttEmbed(game) {

    let text =
        `You are **❌**\n` +
        `AI is **⭕**\n\n` +
        `Difficulty: **${game.difficultyName}**\n\n`;

    if (game.status === "playing") {

        text +=
            game.turn === "player"
                ? "👉 **Your turn!**"
                : "🤖 **AI is thinking...**";
    }

    if (game.status === "playerWon") {

        text +=
            "🏆 **YOU WIN!**";
    }

    if (game.status === "aiWon") {

        text +=
            "🤖 **AI WINS!**";
    }

    if (game.status === "draw") {

        text +=
            "🤝 **DRAW!**";
    }

    return new EmbedBuilder()

        .setTitle("⭕ BTikTakToe")

        .setDescription(text)

        .setColor(
            game.status === "playerWon"
                ? 0x57F287
                : game.status === "aiWon"
                    ? 0xED4245
                    : 0x5865F2
        )

        .setFooter({
            text: "BGames • Made by @rainofgd"
        });
}

// ======================================================
// ONE SINGLE INTERACTION HANDLER
// ======================================================

client.on("interactionCreate", async interaction => {

    try {

        // ==================================================
        // SLASH COMMANDS
        // ==================================================

        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === "games") {

                await interaction.reply({

                    embeds: [
                        gamesEmbed()
                    ],

                    components: [
                        gamesButtons()
                    ]
                });

                return;
            }

            if (interaction.commandName === "guess") {

                if (activeGuessGame) {

                    await interaction.reply({

                        content:
                            "❌ A BGuesser game is already running.",

                        ephemeral: true
                    });

                    return;
                }

                await interaction.reply({

                    embeds: [
                        guessDifficultyEmbed()
                    ],

                    components: [
                        guessDifficultyButtons()
                    ]
                });

                return;
            }

            if (interaction.commandName === "tictactoe") {

                const userId =
                    interaction.user.id;

                if (
                    activeTicTacToeGames.has(
                        userId
                    )
                ) {

                    await interaction.reply({

                        content:
                            "❌ You already have a BTikTakToe game running.",

                        ephemeral: true
                    });

                    return;
                }

                await interaction.reply({

                    embeds: [
                        tttDifficultyEmbed()
                    ],

                    components: [
                        tttDifficultyButtons()
                    ]
                });

                return;
            }
        }

        // ==================================================
        // BUTTONS
        // ==================================================

        if (!interaction.isButton()) {
            return;
        }

        // IMPORTANT:
        // ACKNOWLEDGE EVERY BUTTON IMMEDIATELY.
        await interaction.deferUpdate();

        const id =
            interaction.customId;

        // ==================================================
        // MAIN GAMES MENU
        // ==================================================

        if (id === "game_guess") {

            if (activeGuessGame) {

                await interaction.followUp({

                    content:
                        "❌ A BGuesser game is already running.",

                    ephemeral: true
                });

                return;
            }

            await interaction.editReply({

                embeds: [
                    guessDifficultyEmbed()
                ],

                components: [
                    guessDifficultyButtons()
                ]
            });

            return;
        }

        if (id === "game_ttt") {

            const userId =
                interaction.user.id;

            if (
                activeTicTacToeGames.has(
                    userId
                )
            ) {

                await interaction.followUp({

                    content:
                        "❌ You already have a BTikTakToe game running.",

                    ephemeral: true
                });

                return;
            }

            await interaction.editReply({

                embeds: [
                    tttDifficultyEmbed()
                ],

                components: [
                    tttDifficultyButtons()
                ]
            });

            return;
        }

        // ==================================================
        // BGUESSER DIFFICULTY
        // ==================================================

        if (
            id.startsWith("guess_")
        ) {

            const difficulty =
                id.replace(
                    "guess_",
                    ""
                );

            const settings =
                difficulties[difficulty];

            if (!settings) {
                return;
            }

            if (activeGuessGame) {

                await interaction.followUp({

                    content:
                        "❌ A BGuesser game is already running.",

                    ephemeral: true
                });

                return;
            }

            const number =
                Math.floor(
                    Math.random() *
                    (
                        settings.max -
                        settings.min +
                        1
                    )
                ) +
                settings.min;

            activeGuessGame = {

                number,

                max:
                    settings.max,

                guessesLeft:
                    settings.guesses,

                totalGuesses:
                    settings.guesses,

                lastDistance:
                    null
            };

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        `${settings.emoji} ${settings.name} BGuesser`
                    )

                    .setDescription(

                        `Secret number: **${settings.min}–${settings.max}**\n\n` +

                        `🎯 Guesses: **${settings.guesses}**\n\n` +

                        `Everyone can guess by sending a number.\n\n` +

                        "🔥 **Warmer** = closer\n" +
                        "❄️ **Colder** = farther"
                    )

                    .setColor(0x5865F2);

            await interaction.editReply({

                embeds: [
                    embed
                ],

                components: []
            });

            return;
        }

        // ==================================================
        // TIC TAC TOE DIFFICULTY
        // ==================================================

        if (
            id.startsWith("ttt_") &&
            !id.startsWith("ttt_")
        ) {
            return;
        }

        if (
            [
                "ttt_easy",
                "ttt_medium",
                "ttt_hard",
                "ttt_insane",
                "ttt_impossible"
            ].includes(id)
        ) {

            const difficulty =
                id.replace(
                    "ttt_",
                    ""
                );

            const userId =
                interaction.user.id;

            if (
                activeTicTacToeGames.has(
                    userId
                )
            ) {

                await interaction.followUp({

                    content:
                        "❌ You already have a BTikTakToe game running.",

                    ephemeral: true
                });

                return;
            }

            const game = {

                userId,

                difficulty,

                difficultyName:
                    difficulties[difficulty].name,

                board:
                    emptyBoard(),

                turn:
                    "player",

                status:
                    "playing"
            };

            activeTicTacToeGames.set(
                userId,
                game
            );

            await interaction.editReply({

                embeds: [
                    tttEmbed(game)
                ],

                components:
                    createBoardButtons(
                        userId,
                        game.board
                    )
            });

            return;
        }

        // ==================================================
        // TIC TAC TOE MOVES
        // ==================================================

        if (
            id.startsWith("move_")
        ) {

            const parts =
                id.split("_");

            if (parts.length !== 3) {
                return;
            }

            const userId =
                parts[1];

            const position =
                Number(parts[2]);

            const game =
                activeTicTacToeGames.get(
                    userId
                );

            if (!game) {

                await interaction.followUp({

                    content:
                        "❌ This game is no longer active.",

                    ephemeral: true
                });

                return;
            }

            if (
                interaction.user.id !==
                userId
            ) {

                await interaction.followUp({

                    content:
                        "❌ This isn't your game!",

                    ephemeral: true
                });

                return;
            }

            if (
                game.status !==
                "playing"
            ) {
                return;
            }

            if (
                game.turn !==
                "player"
            ) {

                await interaction.followUp({

                    content:
                        "🤖 Wait for the AI!",

                    ephemeral: true
                });

                return;
            }

            if (
                position < 0 ||
                position > 8 ||
                Number.isNaN(position)
            ) {
                return;
            }

            if (
                game.board[position] !==
                null
            ) {

                await interaction.followUp({

                    content:
                        "❌ That space is already taken!",

                    ephemeral: true
                });

                return;
            }

            // PLAYER MOVE
            game.board[position] = "X";

            let winner =
                checkWinner(
                    game.board
                );

            if (winner === "X") {

                game.status =
                    "playerWon";

                activeTicTacToeGames.delete(
                    userId
                );

                await interaction.editReply({

                    embeds: [
                        tttEmbed(game)
                    ],

                    components:
                        createBoardButtons(
                            userId,
                            game.board,
                            true
                        )
                });

                return;
            }

            if (winner === "draw") {

                game.status =
                    "draw";

                activeTicTacToeGames.delete(
                    userId
                );

                await interaction.editReply({

                    embeds: [
                        tttEmbed(game)
                    ],

                    components:
                        createBoardButtons(
                            userId,
                            game.board,
                            true
                        )
                });

                return;
            }

            // AI TURN
            game.turn = "ai";

            await interaction.editReply({

                embeds: [
                    tttEmbed(game)
                ],

                components:
                    createBoardButtons(
                        userId,
                        game.board,
                        true
                    )
            });

            setTimeout(
                async () => {

                    const current =
                        activeTicTacToeGames.get(
                            userId
                        );

                    if (!current) {
                        return;
                    }

                    const move =
                        aiMove(
                            current.board,
                            current.difficulty
                        );

                    if (
                        move !== null
                    ) {

                        current.board[move] =
                            "O";
                    }

                    winner =
                        checkWinner(
                            current.board
                        );

                    if (
                        winner === "O"
                    ) {

                        current.status =
                            "aiWon";

                        activeTicTacToeGames.delete(
                            userId
                        );

                    } else if (
                        winner === "draw"
                    ) {

                        current.status =
                            "draw";

                        activeTicTacToeGames.delete(
                            userId
                        );

                    } else {

                        current.turn =
                            "player";
                    }

                    try {

                        await interaction.editReply({

                            embeds: [
                                tttEmbed(
                                    current
                                )
                            ],

                            components:
                                createBoardButtons(
                                    userId,
                                    current.board,
                                    current.status !==
                                    "playing"
                                )
                        });

                    } catch (error) {

                        console.error(
                            "Tic-Tac-Toe update error:",
                            error
                        );
                    }

                },
                700
            );

            return;
        }

    } catch (error) {

        console.error(
            "Interaction error:",
            error
        );

        // Try to respond if Discord still allows it.
        try {

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {

                await interaction.reply({

                    content:
                        "❌ Something went wrong. Check the bot console.",

                    ephemeral: true
                });
            }

        } catch (replyError) {

            console.error(
                "Could not send error response:",
                replyError
            );
        }
    }
});

// ======================================================
// BGUESSER CHAT
// ======================================================

client.on(
    "messageCreate",
    async message => {

        if (message.author.bot) {
            return;
        }

        if (!activeGuessGame) {
            return;
        }

        const content =
            message.content.trim();

        if (
            !/^\d+$/.test(content)
        ) {
            return;
        }

        const guess =
            Number(content);

        if (
            guess < 1 ||
            guess >
            activeGuessGame.max
        ) {

            await message.reply(
                `❌ Guess a number between **1 and ${activeGuessGame.max}**.`
            );

            return;
        }

        // CORRECT
        if (
            guess ===
            activeGuessGame.number
        ) {

            const used =
                activeGuessGame.totalGuesses -
                activeGuessGame.guessesLeft +
                1;

            await message.channel.send({

                embeds: [

                    new EmbedBuilder()

                        .setTitle(
                            "🎯 BGuesser — CORRECT!"
                        )

                        .setDescription(

                            `🏆 **${message.author.username}** guessed the number!\n\n` +

                            `The number was **${activeGuessGame.number}**.\n\n` +

                            `Guesses used: **${used}/${activeGuessGame.totalGuesses}**`
                        )

                        .setColor(0x57F287)
                ]
            });

            activeGuessGame = null;

            return;
        }

        const distance =
            Math.abs(
                guess -
                activeGuessGame.number
            );

        let result;

        if (
            activeGuessGame.lastDistance ===
            null
        ) {

            result =
                "🤔 First guess!";

        } else if (
            distance <
            activeGuessGame.lastDistance
        ) {

            result =
                "🔥 **WARMER!**";

        } else if (
            distance >
            activeGuessGame.lastDistance
        ) {

            result =
                "❄️ **COLDER!**";

        } else {

            result =
                "➡️ **Same distance!**";
        }

        activeGuessGame.lastDistance =
            distance;

        activeGuessGame.guessesLeft--;

        if (
            activeGuessGame.guessesLeft <=
            0
        ) {

            await message.channel.send({

                embeds: [

                    new EmbedBuilder()

                        .setTitle(
                            "💀 BGuesser — GAME OVER"
                        )

                        .setDescription(

                            `The number was **${activeGuessGame.number}**.\n\n` +

                            "Use **/games** to play again."
                        )

                        .setColor(0xED4245)
                ]
            });

            activeGuessGame = null;

            return;
        }

        await message.channel.send({

            embeds: [

                new EmbedBuilder()

                    .setTitle("🎯 BGuesser")

                    .setDescription(

                        `**${message.author.username}** guessed **${guess}**\n\n` +

                        `${result}\n\n` +

                        `🎯 **${activeGuessGame.guessesLeft} guesses remaining**`
                    )

                    .setColor(0x5865F2)
            ]
        });
    }
);

// ======================================================
// ERROR HANDLING
// ======================================================

client.on(
    "error",
    error => {

        console.error(
            "Discord client error:",
            error
        );
    }
);

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);
