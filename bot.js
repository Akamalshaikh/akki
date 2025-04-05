const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Bot configuration
const token = '8014954303:AAHgmvc1cxJjlba0Wq5O_gHjHmFLfz1y4Zc';
const adminId = 6048265605;

// Initialize bot
const bot = new TelegramBot(token, { polling: true });

// Store required channels
let requiredChannels = [
    { url: 'https://t.me/+9N72TRLiO5kyZTU1', title: 'Main Channel' },
    { url: 'https://t.me/+nD2F89aUQF1kNmY9', title: 'Updates Channel' },
];

// Load or create accounts database
let accounts = [];
try {
    if (fs.existsSync('./accounts.json')) {
        accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
    } else {
        fs.writeFileSync('./accounts.json', JSON.stringify([]));
    }
} catch (error) {
    console.error('Error with accounts database:', error);
    fs.writeFileSync('./accounts.json', JSON.stringify([]));
}

// User states tracking
const userStates = {};

// Start command handler
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await sendWelcomeMessage(chatId, false); // Initially hide "JOINED" button

    // Wait for 20 seconds before showing the "JOINED" button
    setTimeout(async () => {
        await sendWelcomeMessage(chatId, true); // Show "JOINED" button after 20 seconds
    }, 20000);
});

// Admin command handler
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;

    if (chatId !== adminId) {
        bot.sendMessage(chatId, "❌ You are not authorized to access the admin panel.");
        return;
    }

    await sendAdminPanel(chatId);
});

// Send welcome message with channel buttons
async function sendWelcomeMessage(chatId, showJoinedButton) {
    try {
        const channelButtons = [];

        // Create rows of buttons for channels
        for (let i = 0; i < requiredChannels.length; i++) {
            channelButtons.push([{ text: `🔗 ${requiredChannels[i].title}`, url: requiredChannels[i].url }]);
        }

        // Add "JOINED" button only if showJoinedButton is true
        if (showJoinedButton) {
            channelButtons.push([{ text: '✅ [ JOINED ] ✅', callback_data: 'check_joined' }]);
        }

        const markup = { inline_keyboard: channelButtons };

        await bot.sendMessage(
            chatId,
            showJoinedButton ? 
            "Click the buttons below to join our channels and then click 'JOINED' to proceed:" :
            "Please join all channels below. The 'JOINED' button will appear after you joined all channels.",
            { reply_markup: markup }
        );
    } catch (error) {
        console.error('Error sending welcome message:', error);
        bot.sendMessage(chatId, "There was an error. Please try again later.");
    }
}

// Send admin panel
async function sendAdminPanel(chatId) {
    try {
        const markup = {
            inline_keyboard: [
                [{ text: '➕ Add Account', callback_data: 'admin_add_account' }],
                [{ text: '➕ Add Channel', callback_data: 'admin_add_channel' }],
                [{ text: '📊 Statistics', callback_data: 'admin_stats' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'admin_back' }]
            ]
        };

        await bot.sendMessage(chatId, "Welcome to Admin Panel", { reply_markup: markup });
    } catch (error) {
        console.error('Error sending admin panel:', error);
        bot.sendMessage(chatId, "There was an error. Please try again later.");
    }
}

// Handle button clicks for admin and users
bot.on('callback_query', async (callbackQuery) => {
    try {
        const userId = callbackQuery.from.id;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        // Handle admin callbacks
        if (userId === adminId) {
            if (data === 'admin_add_account') {
                await bot.answerCallbackQuery(callbackQuery.id);
                userStates[userId] = { action: 'add_account' };
                await bot.sendMessage(chatId, "Please send account details in this format:\n\nID:example@email.com\nPassword:examplepassword");
                return;
            } else if (data === 'admin_add_channel') {
                await bot.answerCallbackQuery(callbackQuery.id);
                userStates[userId] = { action: 'add_channel' };
                await bot.sendMessage(chatId, "Please send channel details in this format:\n\nTitle:Channel Name\nURL:https://t.me/...");
                return;
            } else if (data === 'admin_stats') {
                await bot.answerCallbackQuery(callbackQuery.id);
                const stats = `📊 Bot Statistics\n\nTotal accounts available: ${accounts.length}\nRequired channels: ${requiredChannels.length}`;
                await bot.sendMessage(chatId, stats);
                return;
            } else if (data === 'admin_back') {
                await bot.answerCallbackQuery(callbackQuery.id);
                await sendWelcomeMessage(chatId, true);
                return;
            }
        }

        // Handle user callbacks
        if (data === 'check_joined') {
            await bot.answerCallbackQuery(callbackQuery.id, { text: "You can now claim your account!" });
            await provideAccount(chatId);
        } else if (data === 'account_not_working') {
            await bot.answerCallbackQuery(callbackQuery.id);
            bot.sendMessage(
                chatId,
                "❌ Sorry that the account is not working. Please directly message @Its_solox with a screenshot of the issue."
            );
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
});

// Provide a random account to user
async function provideAccount(chatId) {
    try {
        if (accounts.length === 0) {
            bot.sendMessage(chatId, "Sorry, there are no accounts available right now. Please try again later.");
            return;
        }

        const randomIndex = Math.floor(Math.random() * accounts.length);
        const account = accounts[randomIndex];
        accounts.splice(randomIndex, 1);

        fs.writeFileSync('./accounts.json', JSON.stringify(accounts, null, 2));

        bot.sendMessage(
            chatId,
            `🎉 Here's your Crunchyroll account:\n\nID: ${account.id}\nPassword: ${account.password}\n\nIs this account working for you?`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Yes, it's working", callback_data: 'account_working' },
                            { text: "❌ No, it's not working", callback_data: 'account_not_working' }
                        ]
                    ]
                }
            }
        );
    } catch (error) {
        console.error('Error providing account:', error);
        bot.sendMessage(chatId, "There was an error providing an account. Please try again later.");
    }
}

// Handle admin actions for adding accounts or channels
bot.on('message', async (msg) => {
    try {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text || !userStates[userId]) return;

        if (userStates[userId].action === 'add_account') {
            userStates[userId] = null;

            try {
                const lines = text.split('\n');
                if (lines.length < 2) throw new Error("Invalid format");

                const idLine = lines[0].split(':');
                const passwordLine = lines[1].split(':');

                if (idLine.length < 2 || passwordLine.length < 2) throw new Error("Invalid format");

                const id = idLine[1].trim();
                const password = passwordLine[1].trim();

                accounts.push({ id, password });
                fs.writeFileSync('./accounts.json', JSON.stringify(accounts, null, 2));

                await bot.sendMessage(chatId, `Account added successfully!\n\nID: ${id}\nPassword: ${password}`);
            } catch (error) {
                await bot.sendMessage(chatId, "Error adding account. Please use the correct format:\n\nID:example@email.com\nPassword:examplepassword");
            }
        } else if (userStates[userId].action === 'add_channel') {
            userStates[userId] = null;

            try {
                const lines = text.split('\n');
                if (lines.length < 2) throw new Error("Invalid format");

                const titleLine = lines[0].split(':');
                const urlLine = lines[1].split(':');

                if (titleLine.length < 2 || urlLine.length < 2) throw new Error("Invalid format");

                const title = titleLine[1].trim();
                const url = urlLine.slice(1).join(':').trim();

                requiredChannels.push({ url, title });

                await bot.sendMessage(chatId, `Channel added successfully!\n\nTitle: ${title}\nURL: ${url}`);
            } catch (error) {
                await bot.sendMessage(chatId, "Error adding channel. Please use the correct format:\n\nTitle:Channel Name\nURL:https://t.me/...");
            }
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

console.log('Bot started...');
