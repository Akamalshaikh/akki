require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Configuration
const token = process.env.BOT_TOKEN;
const ownerId = parseInt(process.env.OWNER_ID);
let admins = new Set([ownerId]);
const usersFile = './users.json';
const adminsFile = './admins.json';
const channelsFile = './channels.json';
const claimedFile = './claimed.json';

// Initialize bot
const bot = new TelegramBot(token, { polling: true });

// Data storage
let requiredChannels = [
    { id: -1002690583423, url: 'https://t.me/+ISX82ZNLnYQ4YjNl', title: 'Main Channel' }
];
let accounts = [];
let allUsers = new Set();
let claimedUsers = new Set();

// Load data
try {
    if (fs.existsSync('./accounts.json')) accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
    if (fs.existsSync(usersFile)) allUsers = new Set(JSON.parse(fs.readFileSync(usersFile, 'utf8')));
    if (fs.existsSync(adminsFile)) admins = new Set(JSON.parse(fs.readFileSync(adminsFile, 'utf8')));
    if (fs.existsSync(channelsFile)) requiredChannels = JSON.parse(fs.readFileSync(channelsFile, 'utf8'));
    if (fs.existsSync(claimedFile)) claimedUsers = new Set(JSON.parse(fs.readFileSync(claimedFile, 'utf8')));
} catch (error) {
    console.error('Initialization error:', error);
}

// Helper functions
function saveData() {
    fs.writeFileSync('./accounts.json', JSON.stringify(accounts, null, 2));
    fs.writeFileSync(usersFile, JSON.stringify([...allUsers], null, 2));
    fs.writeFileSync(adminsFile, JSON.stringify([...admins], null, 2));
    fs.writeFileSync(channelsFile, JSON.stringify(requiredChannels, null, 2));
    fs.writeFileSync(claimedFile, JSON.stringify([...claimedUsers], null, 2));
}

// Admin check middleware
function isAdmin(userId) {
    return admins.has(userId);
}

// Start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    allUsers.add(chatId);
    saveData();
    await showMainMenu(chatId);
});

// Admin commands
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(chatId)) return;
    await showAdminPanel(chatId);
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(chatId)) return;
    
    const message = match[1];
    Array.from(allUsers).forEach(user => {
        bot.sendMessage(user, `📢 Broadcast:\n\n${message}`).catch(console.error);
    });
});

bot.onText(/\/setadmin (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId !== ownerId) return;
    
    const newAdminId = parseInt(match[1]);
    admins.add(newAdminId);
    saveData();
    bot.sendMessage(chatId, `✅ User ${newAdminId} added as admin`);
});

// Menu functions
async function showMainMenu(chatId) {
    const markup = {
        inline_keyboard: [
            [{ text: '🌟 Get Account', callback_data: 'get_account' }],
            [{ text: '📢 Official Channel', url: 'https://t.me/+ISX82ZNLnYQ4YjNl' }]
        ]
    };
    await bot.sendMessage(chatId, 'Main Menu:', { reply_markup: markup });
}

async function showAdminPanel(chatId) {
    const markup = {
        inline_keyboard: [
            [{ text: '➕ Add Accounts', callback_data: 'add_accounts' }],
            [{ text: '📤 Broadcast', callback_data: 'broadcast' }],
            [{ text: '📊 Statistics', callback_data: 'stats' }],
            [{ text: '➕ Add Channel', callback_data: 'add_channel' }],
            [{ text: '🗑 Delete Channel', callback_data: 'delete_channel' }],
            [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
        ]
    };
    await bot.sendMessage(chatId, 'Admin Panel:', { reply_markup: markup });
}

// Callback handling
const userStates = {};
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    try {
        switch(data) {
            case 'get_account':
                await handleAccountRequest(chatId);
                break;
                
            case 'add_accounts':
                if (!isAdmin(userId)) return;
                userStates[userId] = { action: 'add_accounts' };
                await bot.sendMessage(chatId, 'Send accounts in format:\nemail:password\n(one per line)');
                break;
                
            case 'delete_channel':
                if (!isAdmin(userId)) return;
                await showChannelManagement(chatId);
                break;
                
            case 'broadcast':
                if (!isAdmin(userId)) return;
                userStates[userId] = { action: 'broadcast' };
                await bot.sendMessage(chatId, 'Send broadcast message:');
                break;
                
            case 'stats':
                if (!isAdmin(userId)) return;
                const stats = `📊 Statistics:\nUsers: ${allUsers.size}\nAccounts: ${accounts.length}\nChannels: ${requiredChannels.length}`;
                await bot.sendMessage(chatId, stats);
                break;
                
            case 'account_working':
                await bot.answerCallbackQuery(callbackQuery.id, { text: "Thanks for confirming!" });
                break;
                
            case 'account_not_working':
                await bot.answerCallbackQuery(callbackQuery.id, { text: "Please contact @Its_solox with screenshot" });
                break;
                
            default:
                if (data.startsWith('delete_ch_')) {
                    const index = parseInt(data.split('_')[2]);
                    requiredChannels.splice(index, 1);
                    saveData();
                    await bot.sendMessage(chatId, '✅ Channel deleted successfully');
                }
                else if (data === 'main_menu') {
                    await showMainMenu(chatId);
                }
                break;
        }
    } catch (error) {
        console.error('Callback error:', error);
    }
});

// Message handling
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;
    
    // Handle admin actions
    if (userStates[userId]?.action === 'add_accounts' && isAdmin(userId)) {
        const accountsToAdd = text.split('\n').map(line => {
            const [id, password] = line.split(':').map(s => s.trim());
            return { id, password };
        }).filter(a => a.id && a.password);
        
        accounts.push(...accountsToAdd);
        saveData();
        await bot.sendMessage(chatId, `✅ Added ${accountsToAdd.length} accounts`);
        userStates[userId] = null;
    }
    else if (userStates[userId]?.action === 'broadcast' && isAdmin(userId)) {
        Array.from(allUsers).forEach(user => {
            bot.sendMessage(user, `📢 Broadcast:\n\n${text}`).catch(console.error);
        });
        userStates[userId] = null;
    }
    else if (userStates[userId]?.action === 'add_channel' && isAdmin(userId)) {
        try {
            const [title, url] = text.split('\n').map(s => s.trim());
            const channelId = await bot.getChatIdFromInviteLink(url.split('/').pop());
            requiredChannels.push({ id: channelId, url, title });
            saveData();
            await bot.sendMessage(chatId, '✅ Channel added successfully');
        } catch (error) {
            await bot.sendMessage(chatId, '❌ Error adding channel. Use format:\nTitle\nURL');
        }
        userStates[userId] = null;
    }
});

// Channel management
async function showChannelManagement(chatId) {
    const channels = requiredChannels.map((ch, index) => [
        { text: `${index + 1}. ${ch.title}`, callback_data: `delete_ch_${index}` }
    ]);
    await bot.sendMessage(chatId, 'Select channel to delete:', {
        reply_markup: { inline_keyboard: channels }
    });
}

// Account handling
async function handleAccountRequest(chatId) {
    if (claimedUsers.has(chatId)) {
        await bot.sendMessage(chatId, "❌ You've already claimed your account. Only one account per user!");
        return;
    }
    
    if (await verifyMembership(chatId)) {
        await provideAccount(chatId);
    } else {
        await showChannelJoinPrompt(chatId);
    }
}

async function showChannelJoinPrompt(chatId) {
    const buttons = requiredChannels.map(ch => [{ text: `Join ${ch.title}`, url: ch.url }]);
    buttons.push([{ text: '✅ Verify Membership', callback_data: 'get_account' }]);
    
    await bot.sendMessage(chatId, 'Please join all required channels:', {
        reply_markup: { inline_keyboard: buttons }
    });
}

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

async function provideAccount(chatId) {
    if (accounts.length === 0) {
        await bot.sendMessage(chatId, '❌ No accounts available. Please try later.');
        return;
    }

    const account = accounts.shift();
    claimedUsers.add(chatId);
    saveData();
    
    await bot.sendMessage(
        chatId,
        `🎉 Account Details:\nEmail: ${account.id}\nPassword: ${account.password}\n\nPlease confirm if working:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Working', callback_data: 'account_working' },
                        { text: '❌ Not Working', callback_data: 'account_not_working' }
                    ]
                ]
            }
        }
    );
}

console.log('Bot started successfully!');
