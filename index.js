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

// =====================================================
// STATE
// =====================================================

let guessGame = null;
const tttGames = new Map();

// =====================================================
// DIFFICULTIES
// =====================================================

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

// =====================================================
// SLASH COMMANDS
// =====================================================

const commands = [

    new SlashCommandBuilder()
        .setName("games")
        .setDescription(
            "Open BGames and choose a game."
        ),

    new SlashCommandBuilder()
        .setName("guess")
        .setDescription(
            "Play BGuesser."
        ),

    new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription(
            "Play BTikTakToe."
        )

].map(command => command.toJSON());

// =====================================================
// REGISTER COMMANDS
// =====================================================

async function registerCommands() {

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    try {

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            {
                body: commands
            }
        );

        console.log("Slash commands registered!");

    } catch (error) {

        console.error(
            "Command registration error:",
            error
        );
    }
}

// =====================================================
// READY
// =====================================================

client.once("clientReady", async () => {

    console.log(
        `BGames is online as ${client.user.tag}!`
    );

    await registerCommands();
});

// =====================================================
// MAIN GAMES MENU
// =====================================================

function gamesEmbed() {

    return new EmbedBuilder()

        .setTitle("🎮 BGames")

        .setDescription(
            "**Choose a game:**\n\n" +

            "🎯 **BGuesser**\n" +
            "Guess the secret number.\n\n" +

            "⭕ **BTikTakToe**\n" +
            "Play Tic-Tac-Toe against an AI.\n\n" +

            "━━━━━━━━━━━━━━━━━━\n" +

            "Made by **@rainofgd**"
        )

        .setColor(0x5865F2);
}

function gamesButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("BG_GUESS")
                    .setLabel("BGuesser")
                    .setEmoji("🎯")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("BG_TTT")
                    .setLabel("BTikTakToe")
                    .setEmoji("⭕")
                    .setStyle(ButtonStyle.Success)
            )

    ];
}

// =====================================================
// BGUESSER DIFFICULTY
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

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("BG_G_EASY")
                    .setLabel("Easy")
                    .setEmoji("🟢")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("BG_G_MEDIUM")
                    .setLabel("Medium")
                    .setEmoji("🔵")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("BG_G_HARD")
                    .setLabel("Hard")
                    .setEmoji("🟠")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("BG_G_INSANE")
                    .setLabel("Insane")
                    .setEmoji("🔴")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("BG_G_IMPOSSIBLE")
                    .setLabel("Impossible")
                    .setEmoji("💀")
                    .setStyle(ButtonStyle.Danger)
            )

    ];
}

// =====================================================
// TICTACTOE DIFFICULTY
// =====================================================

function tttDifficultyEmbed() {

    return new EmbedBuilder()

        .setTitle("⭕ BTikTakToe")

        .setDescription(
            "**Choose the AI difficulty:**\n\n" +

            "🟢 **Easy**\n" +
            "Mostly random moves.\n\n" +

            "🔵 **Medium**\n" +
            "Can win and block you.\n\n" +

            "🟠 **Hard**\n" +
            "Plays strategically.\n\n" +

            "🔴 **Insane**\n" +
            "Very difficult.\n\n" +

            "💀 **Impossible**\n" +
            "Perfect AI.\n\n" +

            "You play as **❌**."
        )

        .setColor(0x5865F2)

        .setFooter({
            text: "BGames • Made by @rainofgd"
        });
}

function tttDifficultyButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("BG_T_EASY")
                    .setLabel("Easy")
                    .setEmoji("🟢")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("BG_T_MEDIUM")
                    .setLabel("Medium")
                    .setEmoji("🔵")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("BG_T_HARD")
                    .setLabel("Hard")
                    .setEmoji("🟠")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("BG_T_INSANE")
                    .setLabel("Insane")
                    .setEmoji("🔴")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("BG_T_IMPOSSIBLE")
                    .setLabel("Impossible")
                    .setEmoji("💀")
                    .setStyle(ButtonStyle.Danger)
            )

    ];
}

// =====================================================
// TICTACTOE BOARD
// =====================================================

function newBoard() {

    return [
        null, null, null,
        null, null, null,
        null, null, null
    ];
}

function boardButtons(gameId, board, disabled = false) {

    const rows = [];

    for (let r = 0; r < 3; r++) {

        const row =
            new ActionRowBuilder();

        for (let c = 0; c < 3; c++) {

            const index =
                r * 3 + c;

            let label = " ";

            if (board[index] === "X") {
                label = "❌";
            }

            if (board[index] === "O") {
                label = "⭕";
            }

            row.addComponents(

                new ButtonBuilder()

                    .setCustomId(
                        `BG_MOVE_${gameId}_${index}`
                    )

                    .setLabel(label)

                    .setStyle(
                        board[index] === "X"
                            ? ButtonStyle.Danger
                            : board[index] === "O"
                                ? ButtonStyle.Primary
                                : ButtonStyle.Secondary
                    )

                    .setDisabled(
                        disabled ||
                        board[index] !== null
                    )
            );
        }

        rows.push(row);
    }

    return rows;
}

// =====================================================
// WIN CHECK
// =====================================================

function winner(board) {

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

    for (const [a, b, c] of lines) {

        if (
            board[a] !== null &&
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

        return "DRAW";
    }

    return null;
}

function freeSpaces(board) {

    const spaces = [];

    for (let i = 0; i < 9; i++) {

        if (board[i] === null) {
            spaces.push(i);
        }
    }

    return spaces;
}

// =====================================================
// AI
// =====================================================

function findWinningMove(board, player) {

    for (const space of freeSpaces(board)) {

        board[space] = player;

        const result =
            winner(board);

        board[space] = null;

        if (result === player) {
            return space;
        }
    }

    return null;
}

function randomMove(board) {

    const spaces =
        freeSpaces(board);

    if (spaces.length === 0) {
        return null;
    }

    return spaces[
        Math.floor(
            Math.random() *
            spaces.length
        )
    ];
}

function minimax(board, maximizing) {

    const result =
        winner(board);

    if (result === "O") {
        return 10;
    }

    if (result === "X") {
        return -10;
    }

    if (result === "DRAW") {
        return 0;
    }

    const spaces =
        freeSpaces(board);

    if (maximizing) {

        let best = -Infinity;

        for (const space of spaces) {

            board[space] = "O";

            const score =
                minimax(
                    board,
                    false
                );

            board[space] = null;

            best =
                Math.max(
                    best,
                    score
                );
        }

        return best;

    } else {

        let best = Infinity;

        for (const space of spaces) {

            board[space] = "X";

            const score =
                minimax(
                    board,
                    true
                );

            board[space] = null;

            best =
                Math.min(
                    best,
                    score
                );
        }

        return best;
    }
}

function perfectMove(board) {

    let bestScore = -Infinity;
    let move = null;

    for (const space of freeSpaces(board)) {

        board[space] = "O";

        const score =
            minimax(
                board,
                false
            );

        board[space] = null;

        if (score > bestScore) {

            bestScore = score;
            move = space;
        }
    }

    return move;
}

function aiChoose(board, difficulty) {

    // EASY
    if (difficulty === "easy") {

        if (Math.random() < 0.2) {

            const win =
                findWinningMove(
                    board,
                    "O"
                );

            if (win !== null) {
                return win;
            }
        }

        return randomMove(board);
    }

    // MEDIUM
    if (difficulty === "medium") {

        const win =
            findWinningMove(
                board,
                "O"
            );

        if (win !== null) {
            return win;
        }

        if (Math.random() < 0.7) {

            const block =
                findWinningMove(
                    board,
                    "X"
                );

            if (block !== null) {
                return block;
            }
        }

        return randomMove(board);
    }

    // HARD
    if (difficulty === "hard") {

        const win =
            findWinningMove(
                board,
                "O"
            );

        if (win !== null) {
            return win;
        }

        const block =
            findWinningMove(
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

        if (corners.length > 0) {

            return corners[
                Math.floor(
                    Math.random() *
                    corners.length
                )
            ];
        }

        return randomMove(board);
    }

    // INSANE
    if (difficulty === "insane") {

        if (Math.random() < 0.9) {
            return perfectMove(board);
        }

        return randomMove(board);
    }

    // IMPOSSIBLE
    return perfectMove(board);
}

// =====================================================
// TICTACTOE EMBED
// =====================================================

function tttGameEmbed(game) {

    let description =
        "❌ **You**\n" +
        "⭕ **AI**\n\n" +
        `Difficulty: **${game.difficultyName}**\n\n`;

    if (game.status === "PLAYING") {

        if (game.turn === "PLAYER") {

            description +=
                "👉 **Your turn!**";

        } else {

            description +=
                "🤖 **AI is thinking...**";
        }
    }

    if (game.status === "WIN") {

        description +=
            "🏆 **YOU WIN!**";
    }

    if (game.status === "LOSE") {

        description +=
            "🤖 **AI WINS!**";
    }

    if (game.status === "DRAW") {

        description +=
            "🤝 **DRAW!**";
    }

    return new EmbedBuilder()

        .setTitle("⭕ BTikTakToe")

        .setDescription(description)

        .setColor(
            game.status === "WIN"
                ? 0x57F287
                : game.status === "LOSE"
                    ? 0xED4245
                    : 0x5865F2
        )

        .setFooter({
            text: "BGames • Made by @rainofgd"
        });
}

// =====================================================
// THE ONLY INTERACTION HANDLER
// =====================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // =================================================
            // SLASH COMMANDS
            // =================================================

            if (
                interaction.isChatInputCommand()
            ) {

                if (
                    interaction.commandName ===
                    "games"
                ) {

                    await interaction.reply({

                        embeds: [
                            gamesEmbed()
                        ],

                        components:
                            gamesButtons()
                    });

                    return;
                }

                if (
                    interaction.commandName ===
                    "guess"
                ) {

                    if (guessGame) {

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

                        components:
                            guessDifficultyButtons()
                    });

                    return;
                }

                if (
                    interaction.commandName ===
                    "tictactoe"
                ) {

                    const user =
                        interaction.user.id;

                    if (
                        tttGames.has(user)
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

                        components:
                            tttDifficultyButtons()
                    });

                    return;
                }
            }

            // =================================================
            // BUTTONS
            // =================================================

            if (
                !interaction.isButton()
            ) {
                return;
            }

            /*
             * THIS IS THE IMPORTANT PART.
             *
             * Discord gives us about 3 seconds.
             * We acknowledge the interaction immediately.
             */
            await interaction.deferUpdate();

            const id =
                interaction.customId;

            // =================================================
            // BGUESSER FROM /GAMES
            // =================================================

            if (
                id === "BG_GUESS"
            ) {

                if (guessGame) {

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

                    components:
                        guessDifficultyButtons()
                });

                return;
            }

            // =================================================
            // TTT FROM /GAMES
            // =================================================

            if (
                id === "BG_TTT"
            ) {

                const user =
                    interaction.user.id;

                if (
                    tttGames.has(user)
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

                    components:
                        tttDifficultyButtons()
                });

                return;
            }

            // =================================================
            // BGUESSER DIFFICULTY
            // =================================================

            if (
                id.startsWith("BG_G_")
            ) {

                const difficulty =
                    id
                        .replace(
                            "BG_G_",
                            ""
                        )
                        .toLowerCase();

                const settings =
                    difficulties[difficulty];

                if (!settings) {
                    return;
                }

                if (guessGame) {

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

                guessGame = {

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

                            `A secret number between **${settings.min} and ${settings.max}** was chosen!\n\n` +

                            `🎯 **${settings.guesses} guesses**\n\n` +

                            "👥 Everyone can guess!\n\n" +

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

            // =================================================
            // TTT DIFFICULTY
            // =================================================

            if (
                id.startsWith("BG_T_")
            ) {

                const difficulty =
                    id
                        .replace(
                            "BG_T_",
                            ""
                        )
                        .toLowerCase();

                if (
                    !difficulties[
                        difficulty
                    ]
                ) {
                    return;
                }

                const user =
                    interaction.user.id;

                if (
                    tttGames.has(user)
                ) {

                    await interaction.followUp({

                        content:
                            "❌ You already have a game running.",

                        ephemeral: true
                    });

                    return;
                }

                const game = {

                    userId:
                        user,

                    difficulty,

                    difficultyName:
                        difficulties[
                            difficulty
                        ].name,

                    board:
                        newBoard(),

                    turn:
                        "PLAYER",

                    status:
                        "PLAYING"
                };

                tttGames.set(
                    user,
                    game
                );

                await interaction.editReply({

                    embeds: [
                        tttGameEmbed(game)
                    ],

                    components:
                        boardButtons(
                            user,
                            game.board
                        )
                });

                return;
            }

            // =================================================
            // TTT BOARD MOVE
            // =================================================

            if (
                id.startsWith(
                    "BG_MOVE_"
                )
            ) {

                /*
                 * Format:
                 *
                 * BG_MOVE_USERID_POSITION
                 */

                const parts =
                    id.split("_");

                if (
                    parts.length !== 4
                ) {
                    return;
                }

                const userId =
                    parts[2];

                const position =
                    Number(parts[3]);

                const game =
                    tttGames.get(
                        userId
                    );

                if (!game) {

                    await interaction.followUp({

                        content:
                            "❌ This game has ended.",

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
                            "❌ This is not your game!",

                        ephemeral: true
                    });

                    return;
                }

                if (
                    game.status !==
                    "PLAYING"
                ) {
                    return;
                }

                if (
                    game.turn !==
                    "PLAYER"
                ) {

                    await interaction.followUp({

                        content:
                            "🤖 Wait for the AI!",

                        ephemeral: true
                    });

                    return;
                }

                if (
                    !Number.isInteger(
                        position
                    ) ||
                    position < 0 ||
                    position > 8
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

                // =========================================
                // PLAYER MOVE
                // =========================================

                game.board[position] =
                    "X";

                let result =
                    winner(game.board);

                if (
                    result === "X"
                ) {

                    game.status =
                        "WIN";

                    tttGames.delete(
                        userId
                    );

                    await interaction.editReply({

                        embeds: [
                            tttGameEmbed(game)
                        ],

                        components:
                            boardButtons(
                                userId,
                                game.board,
                                true
                            )
                    });

                    return;
                }

                if (
                    result === "DRAW"
                ) {

                    game.status =
                        "DRAW";

                    tttGames.delete(
                        userId
                    );

                    await interaction.editReply({

                        embeds: [
                            tttGameEmbed(game)
                        ],

                        components:
                            boardButtons(
                                userId,
                                game.board,
                                true
                            )
                    });

                    return;
                }

                // =========================================
                // AI TURN
                // =========================================

                game.turn =
                    "AI";

                await interaction.editReply({

                    embeds: [
                        tttGameEmbed(game)
                    ],

                    components:
                        boardButtons(
                            userId,
                            game.board,
                            true
                        )
                });

                setTimeout(
                    async () => {

                        const current =
                            tttGames.get(
                                userId
                            );

                        if (!current) {
                            return;
                        }

                        const move =
                            aiChoose(
                                current.board,
                                current.difficulty
                            );

                        if (
                            move !== null
                        ) {

                            current.board[move] =
                                "O";
                        }

                        result =
                            winner(
                                current.board
                            );

                        if (
                            result === "O"
                        ) {

                            current.status =
                                "LOSE";

                            tttGames.delete(
                                userId
                            );

                        } else if (
                            result === "DRAW"
                        ) {

                            current.status =
                                "DRAW";

                            tttGames.delete(
                                userId
                            );

                        } else {

                            current.turn =
                                "PLAYER";
                        }

                        try {

                            await interaction.editReply({

                                embeds: [
                                    tttGameEmbed(
                                        current
                                    )
                                ],

                                components:
                                    boardButtons(
                                        userId,
                                        current.board,
                                        current.status !==
                                        "PLAYING"
                                    )
                            });

                        } catch (error) {

                            console.error(
                                "TTT update error:",
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
                "Interaction handler error:",
                error
            );

            try {

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {

                    await interaction.reply({

                        content:
                            "❌ An error occurred.",

                        ephemeral: true
                    });
                }

            } catch (_) {
                // Nothing else to do.
            }
        }
    }
);

// =====================================================
// BGUESSER CHAT
// =====================================================

client.on(
    "messageCreate",
    async message => {

        if (message.author.bot) {
            return;
        }

        if (!guessGame) {
            return;
        }

        const text =
            message.content.trim();

        if (
            !/^\d+$/.test(text)
        ) {
            return;
        }

        const guess =
            Number(text);

        if (
            guess < 1 ||
            guess > guessGame.max
        ) {

            await message.reply(
                `❌ Enter a number between **1 and ${guessGame.max}**.`
            );

            return;
        }

        // CORRECT
        if (
            guess ===
            guessGame.number
        ) {

            const used =
                guessGame.totalGuesses -
                guessGame.guessesLeft +
                1;

            await message.channel.send({

                embeds: [

                    new EmbedBuilder()

                        .setTitle(
                            "🎯 BGuesser — CORRECT!"
                        )

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

        const distance =
            Math.abs(
                guess -
                guessGame.number
            );

        let messageText;

        if (
            guessGame.lastDistance ===
            null
        ) {

            messageText =
                "🤔 First guess!";

        } else if (
            distance <
            guessGame.lastDistance
        ) {

            messageText =
                "🔥 **WARMER!**";

        } else if (
            distance >
            guessGame.lastDistance
        ) {

            messageText =
                "❄️ **COLDER!**";

        } else {

            messageText =
                "➡️ **Same distance!**";
        }

        guessGame.lastDistance =
            distance;

        guessGame.guessesLeft--;

        if (
            guessGame.guessesLeft <=
            0
        ) {

            await message.channel.send({

                embeds: [

                    new EmbedBuilder()

                        .setTitle(
                            "💀 BGuesser — GAME OVER"
                        )

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

                        `${messageText}\n\n` +

                        `🎯 **${guessGame.guessesLeft} guesses remaining**`
                    )

                    .setColor(0x5865F2)
            ]
        });
    }
);

// =====================================================
// ERRORS
// =====================================================

client.on(
    "error",
    error => {

        console.error(
            "Discord client error:",
            error
        );
    }
);

// =====================================================
// LOGIN
// =====================================================

client.login(TOKEN);
