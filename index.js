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

// =====================================================
// GAME STATE
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
        .setDescription("Open BGames and choose a game."),

    new SlashCommandBuilder()
        .setName("guess")
        .setDescription("Play BGuesser."),

    new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription("Play BTikTakToe.")

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
            "Slash command registration error:",
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
// GAMES MENU
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

            "🪨 **Rock Paper Scissors**\n" +
            "Play Rock Paper Scissors against the bot.\n\n" +

            "━━━━━━━━━━━━━━━━━━\n\n" +

            "Made by **@rainofgd**"
        )

        .setColor(0x5865F2);
}

function gamesButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

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

            "🪨 **Rock**\n" +
            "📄 **Paper**\n" +
            "✂️ **Scissors**\n\n" +

            "The bot will choose at the same time!"
        )

        .setColor(0x5865F2)

        .setFooter({
            text: "BGames • Made by @rainofgd"
        });
}

function rpsButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

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

function rpsResultEmbed(
    playerChoice,
    botChoice,
    result
) {

    let resultText;
    let color;

    if (
        result === "WIN"
    ) {

        resultText =
            "🏆 **YOU WIN!**";

        color =
            0x57F287;

    } else if (
        result === "LOSE"
    ) {

        resultText =
            "🤖 **BOT WINS!**";

        color =
            0xED4245;

    } else {

        resultText =
            "🤝 **DRAW!**";

        color =
            0x5865F2;
    }

    return new EmbedBuilder()

        .setTitle("🪨 Rock Paper Scissors")

        .setDescription(

            `👤 **You:** ${playerChoice}\n` +
            `🤖 **Bot:** ${botChoice}\n\n` +

            "━━━━━━━━━━━━━━━━━━\n\n" +

            resultText
        )

        .setColor(color)

        .setFooter({
            text: "BGames • Made by @rainofgd"
        });
}

function rpsResultButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("BG_RPS_PLAY_AGAIN")
                    .setLabel("Play Again")
                    .setEmoji("🔄")
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
// CREATE TICTACTOE BOARD
// =====================================================

function createBoard() {

    return [
        null, null, null,
        null, null, null,
        null, null, null
    ];
}

// =====================================================
// CREATE TICTACTOE BUTTONS
// =====================================================

function createBoardButtons(
    userId,
    board,
    disabled = false
) {

    const rows = [];

    for (
        let row = 0;
        row < 3;
        row++
    ) {

        const actionRow =
            new ActionRowBuilder();

        for (
            let column = 0;
            column < 3;
            column++
        ) {

            const position =
                row * 3 + column;

            let button;

            // X
            if (
                board[position] === "X"
            ) {

                button =
                    new ButtonBuilder()
                        .setCustomId(
                            `BG_TTT_MOVE_${userId}_${position}`
                        )
                        .setEmoji("❌")
                        .setStyle(
                            ButtonStyle.Success
                        );

            }

            // O
            else if (
                board[position] === "O"
            ) {

                button =
                    new ButtonBuilder()
                        .setCustomId(
                            `BG_TTT_MOVE_${userId}_${position}`
                        )
                        .setEmoji("⭕")
                        .setStyle(
                            ButtonStyle.Primary
                        );

            }

            // EMPTY
            else {

                button =
                    new ButtonBuilder()
                        .setCustomId(
                            `BG_TTT_MOVE_${userId}_${position}`
                        )
                        .setLabel("\u200B")
                        .setStyle(
                            ButtonStyle.Secondary
                        );
            }

            button.setDisabled(
                disabled ||
                board[position] !== null
            );

            actionRow.addComponents(
                button
            );
        }

        rows.push(
            actionRow
        );
    }

    return rows;
}

// =====================================================
// WIN CHECK
// =====================================================

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

    for (
        const [a, b, c]
        of lines
    ) {

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

// =====================================================
// EMPTY SPACES
// =====================================================

function getEmptySpaces(board) {

    const spaces = [];

    for (
        let i = 0;
        i < 9;
        i++
    ) {

        if (
            board[i] === null
        ) {

            spaces.push(i);
        }
    }

    return spaces;
}

// =====================================================
// FIND WINNING MOVE
// =====================================================

function findWinningMove(
    board,
    player
) {

    const spaces =
        getEmptySpaces(board);

    for (
        const position
        of spaces
    ) {

        board[position] =
            player;

        const result =
            checkWinner(board);

        board[position] =
            null;

        if (
            result === player
        ) {

            return position;
        }
    }

    return null;
}

// =====================================================
// RANDOM MOVE
// =====================================================

function randomMove(board) {

    const spaces =
        getEmptySpaces(board);

    if (
        spaces.length === 0
    ) {

        return null;
    }

    return spaces[
        Math.floor(
            Math.random() *
            spaces.length
        )
    ];
}

// =====================================================
// MINIMAX
// =====================================================

function minimax(
    board,
    maximizing
) {

    const result =
        checkWinner(board);

    if (
        result === "O"
    ) {

        return 10;
    }

    if (
        result === "X"
    ) {

        return -10;
    }

    if (
        result === "DRAW"
    ) {

        return 0;
    }

    const spaces =
        getEmptySpaces(board);

    if (
        maximizing
    ) {

        let bestScore =
            -Infinity;

        for (
            const position
            of spaces
        ) {

            board[position] =
                "O";

            const score =
                minimax(
                    board,
                    false
                );

            board[position] =
                null;

            bestScore =
                Math.max(
                    bestScore,
                    score
                );
        }

        return bestScore;

    } else {

        let bestScore =
            Infinity;

        for (
            const position
            of spaces
        ) {

            board[position] =
                "X";

            const score =
                minimax(
                    board,
                    true
                );

            board[position] =
                null;

            bestScore =
                Math.min(
                    bestScore,
                    score
                );
        }

        return bestScore;
    }
}

// =====================================================
// PERFECT MOVE
// =====================================================

function perfectMove(board) {

    let bestScore =
        -Infinity;

    let bestMove =
        null;

    const spaces =
        getEmptySpaces(board);

    for (
        const position
        of spaces
    ) {

        board[position] =
            "O";

        const score =
            minimax(
                board,
                false
            );

        board[position] =
            null;

        if (
            score > bestScore
        ) {

            bestScore =
                score;

            bestMove =
                position;
        }
    }

    return bestMove;
}

// =====================================================
// AI MOVE
// =====================================================

function chooseAIMove(
    board,
    difficulty
) {

    // EASY
    if (
        difficulty === "easy"
    ) {

        if (
            Math.random() < 0.2
        ) {

            const win =
                findWinningMove(
                    board,
                    "O"
                );

            if (
                win !== null
            ) {

                return win;
            }
        }

        return randomMove(board);
    }

    // MEDIUM
    if (
        difficulty === "medium"
    ) {

        const win =
            findWinningMove(
                board,
                "O"
            );

        if (
            win !== null
        ) {

            return win;
        }

        if (
            Math.random() < 0.7
        ) {

            const block =
                findWinningMove(
                    board,
                    "X"
                );

            if (
                block !== null
            ) {

                return block;
            }
        }

        return randomMove(board);
    }

    // HARD
    if (
        difficulty === "hard"
    ) {

        const win =
            findWinningMove(
                board,
                "O"
            );

        if (
            win !== null
        ) {

            return win;
        }

        const block =
            findWinningMove(
                board,
                "X"
            );

        if (
            block !== null
        ) {

            return block;
        }

        if (
            board[4] === null
        ) {

            return 4;
        }

        const corners =
            [0, 2, 6, 8].filter(
                position =>
                    board[position] === null
            );

        if (
            corners.length > 0
        ) {

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
    if (
        difficulty === "insane"
    ) {

        if (
            Math.random() < 0.9
        ) {

            return perfectMove(board);
        }

        return randomMove(board);
    }

    // IMPOSSIBLE
    return perfectMove(board);
}

// =====================================================
// TTT EMBED
// =====================================================

function createTTTEmbed(game) {

    let description =
        "❌ **You**\n" +
        "⭕ **AI**\n\n" +

        `Difficulty: **${game.difficultyName}**\n\n`;

    if (
        game.status === "PLAYING"
    ) {

        if (
            game.turn === "PLAYER"
        ) {

            description +=
                "👉 **Your turn!**";

        } else {

            description +=
                "🤖 **AI is thinking...**";
        }
    }

    if (
        game.status === "WIN"
    ) {

        description +=
            "🏆 **YOU WIN!**";
    }

    if (
        game.status === "LOSE"
    ) {

        description +=
            "🤖 **AI WINS!**";
    }

    if (
        game.status === "DRAW"
    ) {

        description +=
            "🤝 **DRAW!**";
    }

    return new EmbedBuilder()

        .setTitle("⭕ BTikTakToe")

        .setDescription(
            description
        )

        .setColor(
            game.status === "WIN"
                ? 0x57F287
                : game.status === "LOSE"
                    ? 0xED4245
                    : 0x5865F2
        )

        .setFooter({
            text:
                "BGames • Made by @rainofgd"
        });
}

// =====================================================
// INTERACTION HANDLER
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

                // /games
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

                // /guess
                if (
                    interaction.commandName ===
                    "guess"
                ) {

                    if (
                        guessGame !== null
                    ) {

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

                // /tictactoe
                if (
                    interaction.commandName ===
                    "tictactoe"
                ) {

                    const userId =
                        interaction.user.id;

                    if (
                        tttGames.has(userId)
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

                return;
            }

            // =================================================
            // BUTTON CHECK
            // =================================================

            if (
                !interaction.isButton()
            ) {

                return;
            }

            const id =
                interaction.customId;

            console.log(
                `[BUTTON] ${id} pressed by ${interaction.user.tag}`
            );

            // =================================================
            // GAMES → BGUESSER
            // =================================================

            if (
                id === "BG_GAMES_GUESS"
            ) {

                if (
                    guessGame !== null
                ) {

                    await interaction.reply({

                        content:
                            "❌ A BGuesser game is already running.",

                        ephemeral: true
                    });

                    return;
                }

                await interaction.update({

                    embeds: [
                        guessDifficultyEmbed()
                    ],

                    components:
                        guessDifficultyButtons()
                });

                return;
            }

            // =================================================
            // GAMES → TTT
            // =================================================

            if (
                id === "BG_GAMES_TTT"
            ) {

                const userId =
                    interaction.user.id;

                if (
                    tttGames.has(userId)
                ) {

                    await interaction.reply({

                        content:
                            "❌ You already have a BTikTakToe game running.",

                        ephemeral: true
                    });

                    return;
                }

                await interaction.update({

                    embeds: [
                        tttDifficultyEmbed()
                    ],

                    components:
                        tttDifficultyButtons()
                });

                return;
            }

            // =================================================
            // GAMES → ROCK PAPER SCISSORS
            // =================================================

            if (
                id === "BG_GAMES_RPS"
            ) {

                await interaction.update({

                    embeds: [
                        rpsEmbed()
                    ],

                    components:
                        rpsButtons()
                });

                return;
            }

            // =================================================
            // ROCK PAPER SCISSORS MOVE
            // =================================================

            if (
                id === "BG_RPS_ROCK" ||
                id === "BG_RPS_PAPER" ||
                id === "BG_RPS_SCISSORS"
            ) {

                const choices = {

                    BG_RPS_ROCK: {
                        name: "🪨 Rock",
                        value: "rock"
                    },

                    BG_RPS_PAPER: {
                        name: "📄 Paper",
                        value: "paper"
                    },

                    BG_RPS_SCISSORS: {
                        name: "✂️ Scissors",
                        value: "scissors"
                    }

                };

                const player =
                    choices[id];

                const botChoices = [
                    {
                        name: "🪨 Rock",
                        value: "rock"
                    },
                    {
                        name: "📄 Paper",
                        value: "paper"
                    },
                    {
                        name: "✂️ Scissors",
                        value: "scissors"
                    }
                ];

                const bot =
                    botChoices[
                        Math.floor(
                            Math.random() *
                            botChoices.length
                        )
                    ];

                let result;

                if (
                    player.value ===
                    bot.value
                ) {

                    result =
                        "DRAW";

                } else if (

                    (
                        player.value === "rock" &&
                        bot.value === "scissors"
                    ) ||

                    (
                        player.value === "paper" &&
                        bot.value === "rock"
                    ) ||

                    (
                        player.value === "scissors" &&
                        bot.value === "paper"
                    )

                ) {

                    result =
                        "WIN";

                } else {

                    result =
                        "LOSE";
                }

                await interaction.update({

                    embeds: [
                        rpsResultEmbed(
                            player.name,
                            bot.name,
                            result
                        )
                    ],

                    components:
                        rpsResultButtons()
                });

                return;
            }

            // =================================================
            // ROCK PAPER SCISSORS PLAY AGAIN
            // =================================================

            if (
                id === "BG_RPS_PLAY_AGAIN"
            ) {

                await interaction.update({

                    embeds: [
                        rpsEmbed()
                    ],

                    components:
                        rpsButtons()
                });

                return;
            }

            // =================================================
            // TTT DIFFICULTY
            // =================================================

            if (
                id === "BG_T_EASY" ||
                id === "BG_T_MEDIUM" ||
                id === "BG_T_HARD" ||
                id === "BG_T_INSANE" ||
                id === "BG_T_IMPOSSIBLE"
            ) {

                console.log(
                    `[TTT] Difficulty selected: ${id}`
                );

                const difficulty =
                    id
                        .replace(
                            "BG_T_",
                            ""
                        )
                        .toLowerCase();

                const settings =
                    difficulties[
                        difficulty
                    ];

                if (
                    !settings
                ) {

                    await interaction.reply({

                        content:
                            "❌ Invalid difficulty.",

                        ephemeral: true
                    });

                    return;
                }

                const userId =
                    interaction.user.id;

                if (
                    tttGames.has(userId)
                ) {

                    await interaction.reply({

                        content:
                            "❌ You already have a BTikTakToe game running.",

                        ephemeral: true
                    });

                    return;
                }

                const game = {

                    userId:
                        userId,

                    difficulty:
                        difficulty,

                    difficultyName:
                        settings.name,

                    board:
                        createBoard(),

                    turn:
                        "PLAYER",

                    status:
                        "PLAYING"
                };

                tttGames.set(
                    userId,
                    game
                );

                console.log(
                    `[TTT] Game created for ${interaction.user.tag}`
                );

                await interaction.update({

                    embeds: [
                        createTTTEmbed(game)
                    ],

                    components:
                        createBoardButtons(
                            userId,
                            game.board
                        )
                });

                return;
            }

            // =================================================
            // BGUESSER DIFFICULTY
            // =================================================

            if (
                id === "BG_G_EASY" ||
                id === "BG_G_MEDIUM" ||
                id === "BG_G_HARD" ||
                id === "BG_G_INSANE" ||
                id === "BG_G_IMPOSSIBLE"
            ) {

                const difficulty =
                    id
                        .replace(
                            "BG_G_",
                            ""
                        )
                        .toLowerCase();

                const settings =
                    difficulties[
                        difficulty
                    ];

                if (
                    !settings
                ) {

                    await interaction.reply({

                        content:
                            "❌ Invalid difficulty.",

                        ephemeral: true
                    });

                    return;
                }

                if (
                    guessGame !== null
                ) {

                    await interaction.reply({

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

                    number:
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

                        .setColor(
                            0x5865F2
                        );

                await interaction.update({

                    embeds: [
                        embed
                    ],

                    components: []
                });

                return;
            }

            // =================================================
            // TTT BOARD MOVE
            // =================================================

            if (
                id.startsWith(
                    "BG_TTT_MOVE_"
                )
            ) {

                const prefix =
                    "BG_TTT_MOVE_";

                const data =
                    id.substring(
                        prefix.length
                    );

                const separator =
                    data.lastIndexOf("_");

                if (
                    separator === -1
                ) {

                    return;
                }

                const userId =
                    data.substring(
                        0,
                        separator
                    );

                const position =
                    Number(
                        data.substring(
                            separator + 1
                        )
                    );

                const game =
                    tttGames.get(
                        userId
                    );

                if (
                    !game
                ) {

                    await interaction.reply({

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

                    await interaction.reply({

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

                    await interaction.reply({

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

                    await interaction.reply({

                        content:
                            "❌ That space is already taken!",

                        ephemeral: true
                    });

                    return;
                }

                // PLAYER MOVE
                game.board[position] =
                    "X";

                let result =
                    checkWinner(
                        game.board
                    );

                // PLAYER WIN
                if (
                    result === "X"
                ) {

                    game.status =
                        "WIN";

                    tttGames.delete(
                        userId
                    );

                    await interaction.update({

                        embeds: [
                            createTTTEmbed(game)
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

                // DRAW
                if (
                    result === "DRAW"
                ) {

                    game.status =
                        "DRAW";

                    tttGames.delete(
                        userId
                    );

                    await interaction.update({

                        embeds: [
                            createTTTEmbed(game)
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
                game.turn =
                    "AI";

                await interaction.update({

                    embeds: [
                        createTTTEmbed(game)
                    ],

                    components:
                        createBoardButtons(
                            userId,
                            game.board,
                            true
                        )
                });

                // AI DELAY
                setTimeout(
                    async () => {

                        const currentGame =
                            tttGames.get(
                                userId
                            );

                        if (
                            !currentGame
                        ) {

                            return;
                        }

                        const aiMove =
                            chooseAIMove(
                                currentGame.board,
                                currentGame.difficulty
                            );

                        if (
                            aiMove !== null
                        ) {

                            currentGame.board[
                                aiMove
                            ] = "O";
                        }

                        result =
                            checkWinner(
                                currentGame.board
                            );

                        // AI WIN
                        if (
                            result === "O"
                        ) {

                            currentGame.status =
                                "LOSE";

                            tttGames.delete(
                                userId
                            );
                        }

                        // DRAW
                        else if (
                            result === "DRAW"
                        ) {

                            currentGame.status =
                                "DRAW";

                            tttGames.delete(
                                userId
                            );
                        }

                        // PLAYER TURN
                        else {

                            currentGame.turn =
                                "PLAYER";
                        }

                        try {

                            await interaction.editReply({

                                embeds: [
                                    createTTTEmbed(
                                        currentGame
                                    )
                                ],

                                components:
                                    createBoardButtons(
                                        userId,
                                        currentGame.board,
                                        currentGame.status !==
                                        "PLAYING"
                                    )
                            });

                        } catch (error) {

                            console.error(
                                "[TTT] AI update error:",
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
                "===================================="
            );

            console.error(
                "INTERACTION ERROR:"
            );

            console.error(
                error
            );

            console.error(
                "===================================="
            );

            try {

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {

                    await interaction.reply({

                        content:
                            "❌ Something went wrong.",

                        ephemeral: true
                    });
                }

            } catch (_) {}
        }
    }
);

// =====================================================
// BGUESSER MESSAGE HANDLER
// =====================================================

client.on(
    "messageCreate",
    async message => {

        if (
            message.author.bot
        ) {

            return;
        }

        if (
            guessGame === null
        ) {

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

                        .setColor(
                            0x57F287
                        )
                ]
            });

            guessGame =
                null;

            return;
        }

        // WARMER / COLDER
        const distance =
            Math.abs(
                guess -
                guessGame.number
            );

        let resultText;

        if (
            guessGame.lastDistance ===
            null
        ) {

            resultText =
                "🤔 First guess!";

        } else if (
            distance <
            guessGame.lastDistance
        ) {

            resultText =
                "🔥 **WARMER!**";

        } else if (
            distance >
            guessGame.lastDistance
        ) {

            resultText =
                "❄️ **COLDER!**";

        } else {

            resultText =
                "➡️ **SAME DISTANCE!**";
        }

        guessGame.lastDistance =
            distance;

        guessGame.guessesLeft--;

        // OUT OF GUESSES
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

                        .setColor(
                            0xED4245
                        )
                ]
            });

            guessGame =
                null;

            return;
        }

        // WRONG GUESS
        await message.channel.send({

            embeds: [

                new EmbedBuilder()

                    .setTitle(
                        "🎯 BGuesser"
                    )

                    .setDescription(

                        `**${message.author.username}** guessed **${guess}**\n\n` +

                        `${resultText}\n\n` +

                        `🎯 **${guessGame.guessesLeft} guesses remaining**`
                    )

                    .setColor(
                        0x5865F2
                    )
            ]
        });
    }
);

// =====================================================
// ERROR LOGGING
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
