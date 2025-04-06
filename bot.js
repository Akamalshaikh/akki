require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Configuration
const token = process.env.BOT_TOKEN;
const ownerId = parseInt(process.env.OWNER_ID);
let admins = new Set([ownerId]);

// File paths
const DATA_FILES = {
    accounts: './accounts.json',
    users: './users.json',
    admins: './admins.json',
    channels: './channels.json',
    claims: './claims.json'
};

// Initialize bot
const bot = new TelegramBot(token, { polling: true });

// Data storage
let requiredChannels = [
    { id: -1002690583423, url: 'https://t.me/+ISX82ZNLnYQ4YjNl', title: '🌟 VIP Channel' }
];
let accounts = [];
let allUsers = new Set();
let claims = {};

// Load data
function loadData() {
    try {
        accounts = fs.existsSync(DATA_FILES.accounts) ? JSON.parse(fs.readFileSync(DATA_FILES.accounts)) : [];
        allUsers = new Set(fs.existsSync(DATA_FILES.users) ? JSON.parse(fs.readFileSync(DATA_FILES.users)) : []);
        admins = new Set(fs.existsSync(DATA_FILES.admins) ? JSON.parse(fs.readFileSync(DATA_FILES.admins)) : [ownerId]);
        requiredChannels = fs.existsSync(DATA_FILES.channels) ? JSON.parse(fs.readFileSync(DATA_FILES.channels)) : [];
        claims = fs.existsSync(DATA_FILES.claims) ? JSON.parse(fs.readFileSync(DATA_FILES.claims)) : {};
    } catch (error) {
        console.error('Data load error:', error);
    }
}
loadData();

// Save data
function saveData() {
    try {
        fs.writeFileSync(DATA_FILES.accounts, JSON.stringify(accounts, null, 2));
        fs.writeFileSync(DATA_FILES.users, JSON.stringify([...allUsers], null, 2));
        fs.writeFileSync(DATA_FILES.admins, JSON.stringify([...admins], null, 2));
        fs.writeFileSync(DATA_FILES.channels, JSON.stringify(requiredChannels, null, 2));
        fs.writeFileSync(DATA_FILES.claims, JSON.stringify(claims, null, 2));
    } catch (error) {
        console.error('Data save error:', error);
    }
}

// Admin check
function isAdmin(userId) {
    return admins.has(userId);
}

// Start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    allUsers.add(chatId);
    saveData();
    
    const isMember = await verifyMembership(chatId);
    await showMainMenu(chatId, isMember);
});

// Main menu
async function showMainMenu(chatId, isMember) {
    let buttons = [];
    
    if (isMember) {
        const lastClaim = claims[chatId] || 0;
        const cooldown = Date.now() - lastClaim;
        
        if (cooldown < 3600000) {
            const remaining = Math.ceil((3600000 - cooldown) / 60000);
            buttons.push([{ 
                text: `⏳ Try Again in ${remaining}min`, 
                callback_data: 'cooldown' 
            }]);
        } else {
            buttons.push([{ 
                text: '🎁 Claim Free Account', 
                callback_data: 'get_account' 
            }]);
        }
    } else {
        requiredChannels.forEach(ch => {
            buttons.push([{ 
                text: `🔗 Join ${ch.title}`, 
                url: ch.url 
            }]);
        });
        buttons.push([{ 
            text: '✅ Verify Membership', 
            callback_data: 'check_membership' 
        }]);
    }

    await bot.sendMessage(chatId, `
✨ *Welcome to CrunchyRoll Premium* ✨

🎬 Get instant access to premium accounts
⏳ 1 account per hour per user
🔒 100% working accounts guarantee
    `, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
    });
}

// Membership verification
async function verifyMembership(userId) {
    try {
        for (const channel of requiredChannels) {
            const member = await bot.getChatMember(channel.id, userId);
            if (!['member', 'administrator', 'creator'].includes(member.status)) return false;
        }
        return true;
    } catch (error) {
        console.error('Verification error:', error);
        return false;
    }
}

// Account distribution
async function provideAccount(chatId) {
    if (accounts.length === 0) {
        await bot.sendMessage(chatId, '😢 *No accounts available currently!*\nPlease try again later.', {
            parse_mode: 'Markdown'
        });
        return;
    }

    const account = accounts.shift();
    claims[chatId] = Date.now();
    saveData();
    
    await bot.sendMessage(
        chatId,
        `🎉 *Account Details* 🎉\n\n` +
        `📧 Email: \`${account.id}\`\n` +
        `🔑 Password: \`${account.password}\`\n\n` +
        `⚠️ *Please confirm if working:*`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Working Perfectly", callback_data: 'account_working' },
                        { text: "❌ Not Working", callback_data: 'account_not_working' }
                    ],
                    [
                        { text: "📢 Join Updates Channel", url: 'https://t.me/+ISX82ZNLnYQ4YjNl' }
                    ]
                ]
            }
        }
    );
}

// Callback handling
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    try {
        switch(data) {
            case 'get_account':
                await bot.answerCallbackQuery(callbackQuery.id);
                await provideAccount(chatId);
                break;
                
            case 'check_membership':
                await bot.answerCallbackQuery(callbackQuery.id, { text: "🔍 Checking membership..." });
                const isMember = await verifyMembership(chatId);
                await showMainMenu(chatId, isMember);
                break;
                
            case 'account_not_working':
                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.sendMessage(
                    chatId,
                    `⚠️ *Account Not Working?*\n\n` +
                    `Please contact our support team:\n` +
                    `👤 @Its_solox\n\n` +
                    `Include:\n` +
                    `1. The account details\n` +
                    `2. Screenshot of the issue\n` +
                    `We'll provide a replacement within 24 hours!`,
                    { parse_mode: 'Markdown' }
                );
                break;

            case 'account_working':
                await bot.answerCallbackQuery(callbackQuery.id, { text: "🎉 Enjoy your premium access!" });
                break;

            // Admin features
            case 'admin_panel':
                if (!isAdmin(userId)) return;
                await showAdminPanel(chatId);
                break;
        }
    } catch (error) {
        console.error('Callback error:', error);
    }
});

// Admin commands
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(chatId)) return;
    await showAdminPanel(chatId);
});

async function showAdminPanel(chatId) {
    const buttons = [
        [{ text: '📤 Broadcast Message', callback_data: 'admin_broadcast' }],
        [{ text: '📥 Add Accounts', callback_data: 'admin_add_accounts' }],
        [{ text: '⚙️ Channel Management', callback_data: 'admin_channels' }],
        [{ text: '📊 Statistics', callback_data: 'admin_stats' }],
        [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
    ];
    
    await bot.sendMessage(chatId, '🔧 *Admin Panel*', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
    });
}

// Admin callback handlers
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    if (!isAdmin(userId)) return;

    try {
        switch(data) {
            case 'admin_broadcast':
                userStates[userId] = { action: 'broadcast' };
                await bot.sendMessage(chatId, '📢 Enter broadcast message:');
                break;

            case 'admin_add_accounts':
                userStates[userId] = { action: 'add_accounts' };
                await bot.sendMessage(chatId, '📩 Send accounts (format: email:password) one per line:');
                break;

            case 'admin_channels':
                await showChannelManagement(chatId);
                break;

            case 'admin_stats':
                const stats = `
📊 *Statistics*
Users: ${allUsers.size}
Accounts Available: ${accounts.length}
Channels: ${requiredChannels.length}
                `;
                await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
                break;
        }
    } catch (error) {
        console.error('Admin callback error:', error);
    }
});

// Channel management
async function showChannelManagement(chatId) {
    const buttons = requiredChannels.map((ch, index) => [
        { text: `🗑 ${ch.title}`, callback_data: `delete_ch_${index}` }
    ]);
    buttons.push([{ text: '➕ Add Channel', callback_data: 'add_channel' }]);
    
    await bot.sendMessage(chatId, '🔗 Channel Management:', {
        reply_markup: { inline_keyboard: buttons }
    });
}

// Message handling
const userStates = {};
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    // Admin actions
    if (isAdmin(userId) && userStates[userId]) {
        switch(userStates[userId].action) {
            case 'broadcast':
                Array.from(allUsers).forEach(user => {
                    bot.sendMessage(user, `📢 *Admin Broadcast*\n\n${text}`, { parse_mode: 'Markdown' })
                       .catch(console.error);
                });
                delete userStates[userId];
                await bot.sendMessage(chatId, '✅ Broadcast sent to all users');
                break;

            case 'add_accounts':
                const newAccounts = text.split('\n')
                    .map(line => line.trim().split(':'))
                    .filter(([id, pass]) => id && pass)
                    .map(([id, password]) => ({ id, password }));
                
                accounts.push(...newAccounts);
                saveData();
                delete userStates[userId];
                await bot.sendMessage(chatId, `✅ Added ${newAccounts.length} new accounts`);
                break;

            case 'add_channel':
                try {
                    const [title, url] = text.split('\n');
                    const inviteCode = url.split('/').pop();
                    const chat = await bot.getChat(inviteCode);
                    
                    requiredChannels.push({
                        id: chat.id,
                        title: title.trim(),
                        url: url.trim()
                    });
                    saveData();
                    await bot.sendMessage(chatId, '✅ Channel added successfully');
                } catch (error) {
                    await bot.sendMessage(chatId, '❌ Error adding channel. Use format:\nTitle\nURL');
                }
                delete userStates[userId];
                break;
        }
    }
});

// Error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

console.log('🤖 Bot started successfully!');
