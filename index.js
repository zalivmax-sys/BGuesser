require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

// ============================================================
// CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ============================================================
// GAME DATA
// ============================================================

let guessGame = null;

const tttGames = new Map();

const difficulties = {
    easy: {
        name: "🟢 Easy",
        min: 1,
        max: 10,
        guesses: 5
    },

    medium: {
        name: "🟡 Medium",
        min: 1,
        max: 25,
        guesses: 5
    },

    hard: {
        name: "🟠 Hard",
        min: 1,
        max: 50,
        guesses: 10
    },

    insane: {
        name: "🔴 Insane",
        min: 1,
        max: 75,
        guesses: 10
    },

    impossible: {
        name: "💀 Impossible",
        min: 1,
        max: 100,
        guesses: 10
    }
};

// ============================================================
// SLASH COMMANDS
// ============================================================

const commands = [
    new SlashCommandBuilder()
        .setName("games")
        .setDescription("Open BGames"),

    new SlashCommandBuilder()
        .setName("guess")
        .setDescription("Start BGuesser"),

    new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription("Play BTikTakToe")
].map(command => command.toJSON());

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {
    try {
        const rest = new REST({
            version: "10"
        }).setToken(process.env.DISCORD_TOKEN);

        console.log("Registering slash commands...");

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            {
                body: commands
            }
        );

        console.log("Slash commands registered!");
    }
    catch (error) {
        console.error("Command registration error:");
        console.error(error);
    }
}

// ============================================================
// GAMES EMBED
// ============================================================

function gamesEmbed() {
    return new EmbedBuilder()
        .setTitle("🎮 BGames")
        .setDescription(
            "Choose a game below!\n\n" +
            "🔢 **BGuesser**\n" +
            "Guess the secret number.\n\n" +
            "⭕ **BTikTakToe**\n" +
            "Play Tic-Tac-Toe against AI."
        )
        .setFooter({
            text: "Made by @rainofgd"
        });
}

// ============================================================
// GAMES BUTTONS
// ============================================================

function gamesButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("BG_GAMES_GUESS")
                .setLabel("BGuesser")
                .setEmoji("🔢")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("BG_GAMES_TTT")
                .setLabel("BTikTakToe")
                .setEmoji("⭕")
                .setStyle(ButtonStyle.Success)
        )
    ];
}

// ============================================================
// DIFFICULTY BUTTONS
// ============================================================

function guessDifficultyButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("BG_G_EASY")
                .setLabel("Easy")
                .setEmoji("🟢")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("BG_G_MEDIUM")
                .setLabel("Medium")
                .setEmoji("🟡")
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

function tttDifficultyButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("BG_T_EASY")
                .setLabel("Easy")
                .setEmoji("🟢")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("BG_T_MEDIUM")
                .setLabel("Medium")
                .setEmoji("🟡")
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

// ============================================================
// TIC-TAC-TOE
// ============================================================

function createBoard() {
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
        return "DRAW";
    }

    return null;
}

function getEmptySpaces(board) {
    const spaces = [];

    for (let i = 0; i < board.length; i++) {
        if (board[i] === null) {
            spaces.push(i);
        }
    }

    return spaces;
}

function findWinningMove(board, player) {
    const empty = getEmptySpaces(board);

    for (const position of empty) {
        board[position] = player;

        const result = checkWinner(board);

        board[position] = null;

        if (result === player) {
            return position;
        }
    }

    return null;
}

function randomMove(board) {
    const empty = getEmptySpaces(board);

    if (empty.length === 0) {
        return null;
    }

    return empty[
        Math.floor(
            Math.random() * empty.length
        )
    ];
}

function minimax(board, maximizing) {
    const result = checkWinner(board);

    if (result === "O") {
        return 10;
    }

    if (result === "X") {
        return -10;
    }

    if (result === "DRAW") {
        return 0;
    }

    const empty = getEmptySpaces(board);

    if (maximizing) {
        let bestScore = -Infinity;

        for (const position of empty) {
            board[position] = "O";

            const score = minimax(
                board,
                false
            );

            board[position] = null;

            bestScore = Math.max(
                bestScore,
                score
            );
        }

        return bestScore;
    }

    let bestScore = Infinity;

    for (const position of empty) {
        board[position] = "X";

        const score = minimax(
            board,
            true
        );

        board[position] = null;

        bestScore = Math.min(
            bestScore,
            score
        );
    }

    return bestScore;
}

function perfectMove(board) {
    const empty = getEmptySpaces(board);

    let bestScore = -Infinity;
    let bestMove = null;

    for (const position of empty) {
        board[position] = "O";

        const score = minimax(
            board,
            false
        );

        board[position] = null;

        if (score > bestScore) {
            bestScore = score;
            bestMove = position;
        }
    }

    return bestMove;
}

function chooseAIMove(board, difficulty) {

    // EASY
    if (difficulty === "easy") {
        if (Math.random() < 0.25) {
            const winning =
                findWinningMove(
                    board,
                    "O"
                );

            if (winning !== null) {
                return winning;
            }
        }

        return randomMove(board);
    }

    // MEDIUM
    if (difficulty === "medium") {
        const winning =
            findWinningMove(
                board,
                "O"
            );

        if (winning !== null) {
            return winning;
        }

        const blocking =
            findWinningMove(
                board,
                "X"
            );

        if (
            blocking !== null &&
            Math.random() < 0.7
        ) {
            return blocking;
        }

        return randomMove(board);
    }

    // HARD
    if (difficulty === "hard") {
        const winning =
            findWinningMove(
                board,
                "O"
            );

        if (winning !== null) {
            return winning;
        }

        const blocking =
            findWinningMove(
                board,
                "X"
            );

        if (blocking !== null) {
            return blocking;
        }

        if (
            board[4] === null
        ) {
            return 4;
        }

        const corners = [
            0,
            2,
            6,
            8
        ].filter(
            position =>
                board[position] === null
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

// ============================================================
// TTT EMBED
// ============================================================

function createTTTEmbed(game) {
    let description =
        `You are ❌\n` +
        `AI is ⭕\n\n` +
        `Difficulty: **${game.difficultyName}**\n\n`;

    if (game.status === "PLAYING") {
        if (game.turn === "PLAYER") {
            description += "Your turn!";
        }
        else {
            description += "🤖 AI is thinking...";
        }
    }

    if (game.status === "PLAYER_WON") {
        description += "🎉 You won!";
    }

    if (game.status === "AI_WON") {
        description += "🤖 AI won!";
    }

    if (game.status === "DRAW") {
        description += "🤝 It's a draw!";
    }

    return new EmbedBuilder()
        .setTitle("⭕ BTikTakToe")
        .setDescription(description)
        .setFooter({
            text: "Made by @rainofgd"
        });
}

// ============================================================
// TTT BOARD BUTTONS
// ============================================================

function createBoardButtons(
    userId,
    board,
    disabled = false
) {
    const rows = [];

    for (let row = 0; row < 3; row++) {
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

            if (board[position] === "X") {

                button =
                    new ButtonBuilder()
                        .setCustomId(
                            `BG_TTT_MOVE_${userId}_${position}`
                        )
                        .setEmoji("❌")
                        .setStyle(
                            ButtonStyle.Danger
                        );

            }
            else if (board[position] === "O") {

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
            else {

                // Completely blank button
                button =
                    new ButtonBuilder()
                        .setCustomId(
                            `BG_TTT_MOVE_${userId}_${position}`
                        )
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

        rows.push(actionRow);
    }

    return rows;
}

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ==================================================
            // SLASH COMMANDS
            // ==================================================

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

                    await interaction.reply({
                        content:
                            "🔢 Choose a difficulty:",
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
                        content:
                            "⭕ Choose a difficulty:",
                        components:
                            tttDifficultyButtons()
                    });

                    return;
                }

                return;
            }

            // ==================================================
            // BUTTONS
            // ==================================================

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

            // ==================================================
            // GAMES MENU
            // ==================================================

            if (
                id === "BG_GAMES_GUESS"
            ) {

                await interaction.update({
                    content:
                        "🔢 Choose a BGuesser difficulty:",
                    embeds: [],
                    components:
                        guessDifficultyButtons()
                });

                return;
            }

            if (
                id === "BG_GAMES_TTT"
            ) {

                await interaction.update({
                    content:
                        "⭕ Choose a BTikTakToe difficulty:",
                    embeds: [],
                    components:
                        tttDifficultyButtons()
                });

                return;
            }

            // ==================================================
            // BGUESSER DIFFICULTY
            // ==================================================

            if (
                id === "BG_G_EASY" ||
                id === "BG_G_MEDIUM" ||
                id === "BG_G_HARD" ||
                id === "BG_G_INSANE" ||
                id === "BG_G_IMPOSSIBLE"
            ) {

                if (guessGame) {

                    await interaction.reply({
                        content:
                            "❌ A BGuesser game is already running.",
                        ephemeral: true
                    });

                    return;
                }

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
                    difficulty,
                    difficultyName:
                        settings.name,
                    maxGuesses:
                        settings.guesses,
                    guesses: [],
                    lastDistance: null
                };

                await interaction.update({
                    content:
                        `🔢 **BGuesser started!**\n\n` +
                        `Difficulty: **${settings.name}**\n` +
                        `Number range: **${settings.min}-${settings.max}**\n` +
                        `Guesses: **${settings.guesses}**\n\n` +
                        `Everyone can guess!`,
                    components: []
                });

                return;
            }

            // ==================================================
            // TTT DIFFICULTY
            // ==================================================

            if (
                id === "BG_T_EASY" ||
                id === "BG_T_MEDIUM" ||
                id === "BG_T_HARD" ||
                id === "BG_T_INSANE" ||
                id === "BG_T_IMPOSSIBLE"
            ) {

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

                if (!settings) {

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

                await interaction.update({
                    content: "",
                    embeds: [
                        createTTTEmbed(
                            game
                        )
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
            // TTT MOVE
            // ==================================================

            if (
                id.startsWith(
                    "BG_TTT_MOVE_"
                )
            ) {

                const parts =
                    id.split("_");

                const userId =
                    parts[3];

                const position =
                    Number(
                        parts[4]
                    );

                const game =
                    tttGames.get(
                        userId
                    );

                if (!game) {

                    await interaction.reply({
                        content:
                            "❌ This game no longer exists.",
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
                            "❌ This isn't your game.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    game.status !==
                    "PLAYING"
                ) {

                    await interaction.reply({
                        content:
                            "❌ This game is already over.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    game.turn !==
                    "PLAYER"
                ) {

                    await interaction.reply({
                        content:
                            "⏳ Wait for the AI.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    game.board[position] !==
                    null
                ) {

                    await interaction.reply({
                        content:
                            "❌ That space is already taken.",
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

                if (
                    result === "X"
                ) {

                    game.status =
                        "PLAYER_WON";

                    tttGames.delete(
                        userId
                    );

                    await interaction.update({
                        embeds: [
                            createTTTEmbed(
                                game
                            )
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
                            createTTTEmbed(
                                game
                            )
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
                game.turn = "AI";

                await interaction.update({
                    embeds: [
                        createTTTEmbed(
                            game
                        )
                    ],
                    components:
                        createBoardButtons(
                            userId,
                            game.board,
                            true
                        )
                });

                // Small AI delay
                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            700
                        )
                );

                const aiMove =
                    chooseAIMove(
                        game.board,
                        game.difficulty
                    );

                if (
                    aiMove !== null
                ) {
                    game.board[aiMove] =
                        "O";
                }

                result =
                    checkWinner(
                        game.board
                    );

                if (
                    result === "O"
                ) {

                    game.status =
                        "AI_WON";

                    tttGames.delete(
                        userId
                    );

                }
                else if (
                    result === "DRAW"
                ) {

                    game.status =
                        "DRAW";

                    tttGames.delete(
                        userId
                    );

                }
                else {

                    game.turn =
                        "PLAYER";
                }

                await interaction.editReply({
                    embeds: [
                        createTTTEmbed(
                            game
                        )
                    ],
                    components:
                        createBoardButtons(
                            userId,
                            game.board,
                            game.status !==
                            "PLAYING"
                        )
                });

                return;
            }

        }
        catch (error) {

            console.error(
                "===================================="
            );

            console.error(
                "INTERACTION ERROR:"
            );

            console.error(error);

            console.error(
                "===================================="
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {

                try {

                    await interaction.reply({
                        content:
                            "❌ Something went wrong.",
                        ephemeral: true
                    });

                }
                catch {}

            }
        }
    }
);

// ============================================================
// BGUESSER MESSAGE HANDLER
// ============================================================

client.on(
    "messageCreate",
    async message => {

        if (
            message.author.bot
        ) {
            return;
        }

        if (!guessGame) {
            return;
        }

        const guess =
            Number(
                message.content.trim()
            );

        if (
            !Number.isInteger(guess)
        ) {
            return;
        }

        const settings =
            difficulties[
                guessGame.difficulty
            ];

        if (
            guess < settings.min ||
            guess > settings.max
        ) {

            await message.reply(
                `❌ Pick a number between **${settings.min}** and **${settings.max}**.`
            );

            return;
        }

        if (
            guessGame.guesses.includes(
                guess
            )
        ) {

            await message.reply(
                "❌ You already guessed that number."
            );

            return;
        }

        guessGame.guesses.push(
            guess
        );

        const distance =
            Math.abs(
                guess -
                guessGame.number
            );

        let temperature =
            "";

        if (
            guessGame.lastDistance === null
        ) {

            temperature =
                "🤔 First guess!";

        }
        else if (
            distance <
            guessGame.lastDistance
        ) {

            temperature =
                "🔥 Warmer!";

        }
        else if (
            distance >
            guessGame.lastDistance
        ) {

            temperature =
                "🧊 Colder!";

        }
        else {

            temperature =
                "😐 Same distance!";
        }

        guessGame.lastDistance =
            distance;

        // CORRECT
        if (
            guess ===
            guessGame.number
        ) {

            const attempts =
                guessGame.guesses.length;

            await message.reply(
                `🎉 **${message.author.username}** guessed the number!\n\n` +
                `The number was **${guessGame.number}**.\n` +
                `Guesses used: **${attempts}/${settings.guesses}**`
            );

            guessGame = null;

            return;
        }

        // OUT OF GUESSES
        if (
            guessGame.guesses.length >=
            settings.guesses
        ) {

            await message.reply(
                `💀 No guesses left!\n\n` +
                `The number was **${guessGame.number}**.`
            );

            guessGame = null;

            return;
        }

        const remaining =
            settings.guesses -
            guessGame.guesses.length;

        await message.reply(
            `${temperature}\n` +
            `❌ **${guess}** is incorrect.\n` +
            `Guesses remaining: **${remaining}**`
        );
    }
);

// ============================================================
// READY
// ============================================================

client.once(
    "clientReady",
    async () => {

        console.log(
            `BGames is online as ${client.user.tag}!`
        );

        await registerCommands();
    }
);

// ============================================================
// LOGIN
// ============================================================

client.login(
    process.env.DISCORD_TOKEN
);
