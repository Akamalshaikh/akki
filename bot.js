/*const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

// === CONFIG ===
const BOT_TOKEN = '8021373170:AAG75WxyYO8RK_4AiljLNuaGV7nX_kKRJXI';
const CHANNEL_ID = -1002478772431; // Your channel ID (as a number)
const CHANNEL_LINK = 'https://t.me/+3b2KKwNi01YzMTNl';
const ADMIN_IDS = [6994528708]; // <-- Put your Telegram user ID(s) here

const COUNTRY_FLAGS = {
  "FRANCE": "🇫🇷", "UNITED STATES": "🇺🇸", "BRAZIL": "🇧🇷", "NAMIBIA": "🇳🇦",
  "INDIA": "🇮🇳", "GERMANY": "🇩🇪", "THAILAND": "🇹🇭", "MEXICO": "🇲🇽", "RUSSIA": "🇷🇺",
};

// 🌍 Supported country codes and locales for fake address generation
const LOCALE_MAP = {
  'us': 'en_US',
  'uk': 'en_GB',
  'mx': 'es_MX',
  'ca': 'en_CA',
  'fr': 'fr_FR',
  'de': 'de_DE',
  'jp': 'ja_JP',
  'cn': 'zh_CN',
  'in': 'en_IN',
  'au': 'en_AU',
  'it': 'it_IT',
  'es': 'es_ES',
  'br': 'pt_BR',
  'ru': 'ru_RU',
  'kr': 'ko_KR',
  'nl': 'nl_NL',
  'pl': 'pl_PL',
  'tr': 'tr_TR',
};

const USERS_FILE = './users.json';
let users = [];
if (fs.existsSync(USERS_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
  } catch (e) {
    users = [];
  }
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// === Helper: Save user if new ===
function saveUser(id) {
  if (!users.includes(id)) {
    users.push(id);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));
  }
}

// === Helper: Extract BIN ===
function extractBin(input) {
  const match = input.match(/(\d{6,16})/);
  if (!match) return null;
  let bin = match[1];
  return bin.length === 6 ? bin.padEnd(16, 'x') : bin;
}

// === Helper: Force Join Check ===
async function isUserInChannel(userId) {
  try {
    const res = await bot.getChatMember(CHANNEL_ID, userId);
    return ['member', 'creator', 'administrator'].includes(res.status);
  } catch (e) {
    return false;
  }
}

// === Helper: Generate CCs ===
async function generateCC(bin) {
  const url = `https://drlabapis.onrender.com/api/ccgenerator?bin=${bin}&count=10`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) return { error: `API error: ${res.status}` };
    const text = await res.text();
    return text.trim().split('\n');
  } catch (e) {
    return { error: e.message };
  }
}

// === Helper: Lookup BIN ===
async function lookupBin(bin) {
  const url = `https://drlabapis.onrender.com/api/bin?bin=${bin.slice(0,6)}`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) return { error: `API error: ${res.status}` };
    const data = await res.json();
    const country = (data.country || 'NOT FOUND').toUpperCase();
    return {
      bank: (data.issuer || 'NOT FOUND').toUpperCase(),
      card_type: (data.type || 'NOT FOUND').toUpperCase(),
      network: (data.scheme || 'NOT FOUND').toUpperCase(),
      tier: (data.tier || 'NOT FOUND').toUpperCase(),
      country,
      flag: COUNTRY_FLAGS[country] || '🏳️'
    };
  } catch (e) {
    return { error: e.message };
  }
}

// === Helper: Format CC Response ===
function formatCCResponse(data, bin, binInfo) {
  if (data.error) return `❌ ERROR: ${data.error}`;
  if (!data.length) return '❌ NO CARDS GENERATED.';
  let text = `𝗕𝗜𝗡 ⇾ <code>${bin.slice(0,6)}</code>\n`;
  text += `𝗔𝗺𝗼𝘂𝗻𝘁 ⇾ <code>${data.length}</code>\n\n`;
  data.forEach(card => text += `<code>${card.toUpperCase()}</code>\n`);
  text += `\n𝗜𝗻𝗳𝗼: ${binInfo.card_type || 'NOT FOUND'} - ${binInfo.network || 'NOT FOUND'} (${binInfo.tier || 'NOT FOUND'})\n`;
  text += `𝐈𝐬𝐬𝐮𝐞𝐫: ${binInfo.bank || 'NOT FOUND'}\n`;
  text += `𝗖𝗼𝘂𝗻𝘁𝗿𝘆: ${binInfo.country || 'NOT FOUND'} ${binInfo.flag || '🏳️'}`;
  return text;
}

// 🏗️ Generate fake address with phone number
function generateFakeAddress(countryCode) {
  const locale = LOCALE_MAP[countryCode.toLowerCase()];
  if (!locale) {
    return null;
  }

  // Create localized faker instance
  const fake = faker[locale.split('_')[0]];
  
  // Fall back to en if the locale doesn't have specific methods
  const name = fake?.person?.fullName() || faker.person.fullName();
  const street = fake?.location?.streetAddress() || faker.location.streetAddress();
  const address2 = fake?.location?.secondaryAddress() || faker.location.secondaryAddress();
  const city = fake?.location?.city() || faker.location.city();
  const state = fake?.location?.state() || faker.location.state();
  const zipcode = fake?.location?.zipCode() || faker.location.zipCode();
  const phone = fake?.phone?.number() || faker.phone.number();

  const address = (
    `✧ Name : ${name}\n` +
    `✧ Street : ${street}\n` +
    `✧ Address 2 : ${address2}\n` +
    `✧ City : ${city}\n` +
    `✧ State : ${state}\n` +
    `✧ Country : ${locale.toUpperCase()}\n` +
    `✧ ZIP Code : ${zipcode}\n` +
    `✧ Phone : ${phone}\n` +
    `✧ Join : https://t.me/dailyb1ns`
  );
  
  return address;
}

// === Force Join Middleware ===
bot.on('message', async (msg) => {
  saveUser(msg.from.id);
  if (msg.text && !msg.text.startsWith('/broadcast')) {
    const inChannel = await isUserInChannel(msg.from.id);
    if (!inChannel) {
      bot.sendMessage(msg.chat.id,
        `🔒 <b>Join our channel to use this bot!</b>\n\n👉 <a href="${CHANNEL_LINK}">Join Channel</a>`,
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
      return;
    }
  }
});

// === /gen Command ===
bot.onText(/^([/.]gen) (.+)/i, async (msg, match) => {
  const binInput = match[2];
  const bin = extractBin(binInput);
  if (!bin) {
    return bot.sendMessage(msg.chat.id, "❌ INVALID BIN FORMAT.", { parse_mode: "Markdown" });
  }
  const ccData = await generateCC(bin);
  const binInfo = await lookupBin(bin);
  const result = formatCCResponse(ccData, bin, binInfo);
  bot.sendMessage(msg.chat.id, result, { parse_mode: "HTML" });
});

// 👋 /start command
bot.onText(/^\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    "👋 Welcome to Telegram Multi-Tool Bot!\n\n" +
    "Commands:\n" +
    "- Use `/gen <bin>` to generate cards\n" +
    "- Use `.fake <country_code>` to generate a fake address\n\n" +
    `Supported country codes: ${Object.keys(LOCALE_MAP).join(', ')}`
  );
});

// 🤖 Handle .fake commands
bot.onText(/^\.fake (.+)/i, async (msg, match) => {
  const countryCode = match[1].trim();
  
  const address = generateFakeAddress(countryCode);
  if (address) {
    bot.sendMessage(msg.chat.id, address);
  } else {
    const supported = Object.keys(LOCALE_MAP).join(', ');
    bot.sendMessage(msg.chat.id, `❗ Unsupported country code. Try: ${supported}`);
  }
});

// === /broadcast Command (Admins Only) ===
bot.onText(/^\/broadcast (.+)/i, async (msg, match) => {
  if (!ADMIN_IDS.includes(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
  }
  const text = match[1];
  let sent = 0, failed = 0;
  for (const userId of users) {
    try {
      await bot.sendMessage(userId, `📢 Broadcast:\n\n${text}`);
      sent++;
    } catch (e) {
      failed++;
    }
  }
  bot.sendMessage(msg.chat.id, `✅ Broadcast sent to ${sent} users. Failed: ${failed}`);
});*/



const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

// === CONFIG ===
const BOT_TOKEN = '8021373170:AAG75WxyYO8RK_4AiljLNuaGV7nX_kKRJXI';
const CHANNEL_ID = -1002478772431; // Your channel ID (as a number)
const CHANNEL_LINK = 'https://t.me/+3b2KKwNi01YzMTNl';
const ADMIN_IDS = [6994528708]; // <-- Put your Telegram user ID(s) here

const COUNTRY_FLAGS = {
"FRANCE": "🇫🇷", "UNITED STATES": "🇺🇸", "BRAZIL": "🇧🇷", "NAMIBIA": "🇳🇦",
"INDIA": "🇮🇳", "GERMANY": "🇩🇪", "THAILAND": "🇹🇭", "MEXICO": "🇲🇽", "RUSSIA": "🇷🇺",
"CANADA": "🇨🇦", "AUSTRALIA": "🇦🇺", "UNITED KINGDOM": "🇬🇧", "ITALY": "🇮🇹",
"SPAIN": "🇪🇸", "NETHERLANDS": "🇳🇱", "JAPAN": "🇯🇵", "CHINA": "🇨🇳",
"SOUTH KOREA": "🇰🇷", "POLAND": "🇵🇱", "TURKEY": "🇹🇷"
};

// 🌍 Supported country codes and locales for fake address generation
const LOCALE_MAP = {
'us': 'en_US',
'uk': 'en_GB',
'mx': 'es_MX',
'ca': 'en_CA',
'fr': 'fr_FR',
'de': 'de_DE',
'jp': 'ja_JP',
'cn': 'zh_CN',
'in': 'en_IN',
'au': 'en_AU',
'it': 'it_IT',
'es': 'es_ES',
'br': 'pt_BR',
'ru': 'ru_RU',
'kr': 'ko_KR',
'nl': 'nl_NL',
'pl': 'pl_PL',
'tr': 'tr_TR',
};

const USERS_FILE = './users.json';
let users = [];
if (fs.existsSync(USERS_FILE)) {
try {
users = JSON.parse(fs.readFileSync(USERS_FILE));
} catch (e) {
users = [];
}
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// === Helper: Save user if new ===
function saveUser(id) {
if (!users.includes(id)) {
users.push(id);
fs.writeFileSync(USERS_FILE, JSON.stringify(users));
}
}

// === Helper: Extract BIN ===
function extractBin(input) {
const match = input.match(/(\d{6,16})/);
if (!match) return null;
let bin = match[1];
return bin.length === 6 ? bin.padEnd(16, 'x') : bin;
}

// === Helper: Force Join Check ===
async function isUserInChannel(userId) {
try {
const res = await bot.getChatMember(CHANNEL_ID, userId);
return ['member', 'creator', 'administrator'].includes(res.status);
} catch (e) {
return false;
}
}

// === Helper: Generate CCs ===
async function generateCC(bin) {
const url = `https://drlabapis.onrender.com/api/ccgenerator?bin=${bin}&count=10`;
try {
const res = await fetch(url, { timeout: 10000 });
if (!res.ok) return { error: `API error: ${res.status}` };
const text = await res.text();
return text.trim().split('\n');
} catch (e) {
return { error: e.message };
}
}

// === Helper: Lookup BIN ===
async function lookupBin(bin) {
const url = `https://drlabapis.onrender.com/api/bin?bin=${bin.slice(0,6)}`;
try {
const res = await fetch(url, { timeout: 10000 });
if (!res.ok) return { error: `API error: ${res.status}` };
const data = await res.json();
const country = (data.country || 'NOT FOUND').toUpperCase();
return {
bank: (data.issuer || 'NOT FOUND').toUpperCase(),
card_type: (data.type || 'NOT FOUND').toUpperCase(),
network: (data.scheme || 'NOT FOUND').toUpperCase(),
tier: (data.tier || 'NOT FOUND').toUpperCase(),
country,
flag: COUNTRY_FLAGS[country] || '🏳️'
};
} catch (e) {
return { error: e.message };
}
}

// === Helper: Format CC Response ===
function formatCCResponse(data, bin, binInfo) {
if (data.error) return `❌ <b>ERROR:</b> ${data.error}`;
if (!data.length) return '❌ <b>NO CARDS GENERATED.</b>';

let text = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n`;
text += `┃ <b>💳 CARD GENERATOR</b>\n`;
text += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n`;
text += `✧ <b>𝐁𝐈𝐍</b> ➳ <code>${bin.slice(0,6)}</code>\n`;
text += `✧ <b>𝐀𝐦𝐨𝐮𝐧𝐭</b> ➳ <code>${data.length} Cards</code>\n\n`;
text += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n`;
text += `┃ <b>🎯 GENERATED CARDS</b>\n`;
text += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n`;

data.forEach((card, index) => {
text += `<code>${card.toUpperCase()}</code>\n`;
});

text += `\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n`;
text += `┃ <b>ℹ️ BIN INFORMATION</b>\n`;
text += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n`;
text += `✧ <b>𝐓𝐲𝐩𝐞</b> ➳ ${binInfo.card_type || 'NOT FOUND'}\n`;
text += `✧ <b>𝐁𝐫𝐚𝐧𝐝</b> ➳ ${binInfo.network || 'NOT FOUND'}\n`;
text += `✧ <b>𝐋𝐞𝐯𝐞𝐥</b> ➳ ${binInfo.tier || 'NOT FOUND'}\n`;
text += `✧ <b>𝐈𝐬𝐬𝐮𝐞𝐫</b> ➳ ${binInfo.bank || 'NOT FOUND'}\n`;
text += `✧ <b>𝐂𝐨𝐮𝐧𝐭𝐫𝐲</b> ➳ ${binInfo.country || 'NOT FOUND'} ${binInfo.flag || '🏳️'}\n\n`;
text += `✧ <b>𝐂𝐡𝐞𝐜𝐤𝐞𝐝 𝐁𝐲</b> ➳ <a href="${CHANNEL_LINK}">Daily Bins</a>`;

return text;
}

// === Helper: Format BIN Only Response ===
function formatBinResponse(binInfo, bin) {
if (binInfo.error) return `❌ <b>ERROR:</b> ${binInfo.error}`;

let text = `┏━━━━━━━⍟\n`;
text += `┃ <b>BIN Information</b>\n`;
text += `┗━━━━━━━━━━━⊛\n\n`;
text += `✧ <b>𝐁𝐈𝐍</b> ➳ <code>${bin.slice(0,6)}</code>\n`;
text += `✧ <b>𝐁𝐚𝐧𝐤</b> ➳ ${binInfo.bank || 'NOT FOUND'}\n`;
text += `✧ <b>𝐁𝐫𝐚𝐧𝐝</b> ➳ ${binInfo.network || 'NOT FOUND'}\n`;
text += `✧ <b>𝐓𝐲𝐩𝐞</b> ➳ ${binInfo.card_type || 'NOT FOUND'}\n`;
text += `✧ <b>𝐂𝐨𝐮𝐧𝐭𝐫𝐲</b> ➳ ${binInfo.country || 'NOT FOUND'} ${binInfo.flag || '🏳️'}\n`;
text += `✧ <b>𝐋𝐞𝐯𝐞𝐥</b> ➳ ${binInfo.tier || 'NOT FOUND'}\n\n`;
text += `✧ <b>𝐂𝐡𝐞𝐜𝐤𝐞𝐝 𝐁𝐲</b> ➳ <a href="${CHANNEL_LINK}">Daily Bins</a>`;

return text;
}

// 🏗️ Generate fake address with phone number
function generateFakeAddress(countryCode) {
const locale = LOCALE_MAP[countryCode.toLowerCase()];
if (!locale) {
return null;
}

// Create localized faker instance
const fake = faker[locale.split('_')[0]];

// Fall back to en if the locale doesn't have specific methods
const name = fake?.person?.fullName() || faker.person.fullName();
const street = fake?.location?.streetAddress() || faker.location.streetAddress();
const address2 = fake?.location?.secondaryAddress() || faker.location.secondaryAddress();
const city = fake?.location?.city() || faker.location.city();
const state = fake?.location?.state() || faker.location.state();
const zipcode = fake?.location?.zipCode() || faker.location.zipCode();
const phone = fake?.phone?.number() || faker.phone.number();

const address = (
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n` +
`┃ <b>🏠 FAKE ADDRESS GENERATOR</b>\n` +
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n` +
`✧ <b>Name</b> : <code>${name}</code>\n` +
`✧ <b>Street</b> : <code>${street}</code>\n` +
`✧ <b>Address 2</b> : <code>${address2}</code>\n` +
`✧ <b>City</b> : <code>${city}</code>\n` +
`✧ <b>State</b> : <code>${state}</code>\n` +
`✧ <b>Country</b> : <code>${locale.toUpperCase()}</code>\n` +
`✧ <b>ZIP Code</b> : <code>${zipcode}</code>\n` +
`✧ <b>Phone</b> : <code>${phone}</code>\n\n` +
`✧ <b>Join</b> : <a href="${CHANNEL_LINK}">Daily Bins</a>`
);

return address;
}

// === Force Join Middleware ===
bot.on('message', async (msg) => {
saveUser(msg.from.id);
if (msg.text && !msg.text.startsWith('/broadcast')) {
const inChannel = await isUserInChannel(msg.from.id);
if (!inChannel) {
bot.sendMessage(msg.chat.id,
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n` +
`┃ <b>🔒 ACCESS REQUIRED</b>\n` +
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n` +
`<b>🚫 You must join our channel to use this bot!</b>\n\n` +
`👉 <a href="${CHANNEL_LINK}">Click here to join</a>\n\n` +
`<i>After joining, try your command again!</i>`,
{ parse_mode: 'HTML', disable_web_page_preview: true }
);
return;
}
}
});

// === /gen Command ===
bot.onText(/^([/.]gen) (.+)/i, async (msg, match) => {
const binInput = match[2];
const bin = extractBin(binInput);
if (!bin) {
return bot.sendMessage(msg.chat.id, 
`❌ <b>INVALID BIN FORMAT</b>\n\n` +
`<i>Please provide a valid 6-16 digit BIN number.</i>\n` +
`<b>Example:</b> <code>/gen 440066</code>`, 
{ parse_mode: "HTML" });
}

// Send processing message
const processingMsg = await bot.sendMessage(msg.chat.id, 
`⏳ <b>Processing BIN:</b> <code>${bin.slice(0,6)}</code>\n` +
`<i>Generating cards and fetching BIN info...</i>`, 
{ parse_mode: "HTML" });

const ccData = await generateCC(bin);
const binInfo = await lookupBin(bin);
const result = formatCCResponse(ccData, bin, binInfo);

// Edit the processing message with results
bot.editMessageText(result, {
chat_id: msg.chat.id,
message_id: processingMsg.message_id,
parse_mode: "HTML",
disable_web_page_preview: true
});
});

// === /or.bin Command - BIN Lookup Only ===
bot.onText(/^\/or\.bin (.+)/i, async (msg, match) => {
const binInput = match[1];
const bin = extractBin(binInput);
if (!bin) {
return bot.sendMessage(msg.chat.id, 
`❌ <b>INVALID BIN FORMAT</b>\n\n` +
`<i>Please provide a valid 6-16 digit BIN number.</i>\n` +
`<b>Example:</b> <code>/or.bin 440066</code>`, 
{ parse_mode: "HTML" });
}

// Send processing message
const processingMsg = await bot.sendMessage(msg.chat.id, 
`⏳ <b>Looking up BIN:</b> <code>${bin.slice(0,6)}</code>\n` +
`<i>Fetching BIN information...</i>`, 
{ parse_mode: "HTML" });

const binInfo = await lookupBin(bin);
const result = formatBinResponse(binInfo, bin);

// Edit the processing message with results
bot.editMessageText(result, {
chat_id: msg.chat.id,
message_id: processingMsg.message_id,
parse_mode: "HTML",
disable_web_page_preview: true
});
});

// 👋 /start command
bot.onText(/^\/start/, (msg) => {
const welcomeText = 
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n` +
`┃ <b>🤖 TELEGRAM MULTI-TOOL BOT</b>\n` +
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n` +
`<b>👋 Welcome to the ultimate toolkit!</b>\n\n` +
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n` +
`┃ <b>📋 AVAILABLE COMMANDS</b>\n` +
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n` +
`🎯 <b>Card Generation:</b>\n` +
`• <code>/gen [BIN]</code> - Generate cards with BIN info\n` +
`• <code>.gen [BIN]</code> - Generate cards with BIN info\n\n` +
`🔍 <b>BIN Lookup:</b>\n` +
`• <code>/or.bin [BIN]</code> - Get detailed BIN information\n\n` +
`🏠 <b>Address Generation:</b>\n` +
`• <code>.fake [country_code]</code> - Generate fake address\n\n` +
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n` +
`┃ <b>🌍 SUPPORTED COUNTRIES</b>\n` +
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n` +
`<code>${Object.keys(LOCALE_MAP).join(', ')}</code>\n\n` +
`<b>💡 Examples:</b>\n` +
`• <code>/gen 440066</code>\n` +
`• <code>/or.bin 440066</code>\n` +
`• <code>.fake us</code>\n\n` +
`✧ <b>Join our channel:</b> <a href="${CHANNEL_LINK}">Daily Bins</a>`;

bot.sendMessage(msg.chat.id, welcomeText, { 
parse_mode: 'HTML', 
disable_web_page_preview: true 
});
});

// 🤖 Handle .fake commands
bot.onText(/^\.fake (.+)/i, async (msg, match) => {
const countryCode = match[1].trim();

const address = generateFakeAddress(countryCode);
if (address) {
bot.sendMessage(msg.chat.id, address, { parse_mode: 'HTML', disable_web_page_preview: true });
} else {
const supported = Object.keys(LOCALE_MAP).join(', ');
const errorText = 
`❗ <b>UNSUPPORTED COUNTRY CODE</b>\n\n` +
`<b>Supported codes:</b>\n<code>${supported}</code>\n\n` +
`<b>Example:</b> <code>.fake us</code>`;
bot.sendMessage(msg.chat.id, errorText, { parse_mode: 'HTML' });
}
});

// === /broadcast Command (Admins Only) ===
bot.onText(/^\/broadcast (.+)/i, async (msg, match) => {
if (!ADMIN_IDS.includes(msg.from.id)) {
return bot.sendMessage(msg.chat.id, 
`❌ <b>UNAUTHORIZED ACCESS</b>\n\n` +
`<i>You are not authorized to use this command.</i>`, 
{ parse_mode: 'HTML' });
}

const text = match[1];
let sent = 0, failed = 0;

const broadcastMsg = await bot.sendMessage(msg.chat.id, 
`📢 <b>Broadcasting message...</b>\n` +
`<i>Sending to ${users.length} users...</i>`, 
{ parse_mode: 'HTML' });

for (const userId of users) {
try {
const broadcastText = 
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍟\n` +
`┃ <b>📢 BROADCAST MESSAGE</b>\n` +
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⊛\n\n` +
`${text}\n\n` +
`✧ <b>From:</b> <a href="${CHANNEL_LINK}">Daily Bins</a>`;

await bot.sendMessage(userId, broadcastText, { parse_mode: 'HTML', disable_web_page_preview: true });
sent++;
} catch (e) {
failed++;
}
}

bot.editMessageText(
`✅ <b>BROADCAST COMPLETED</b>\n\n` +
`📤 <b>Sent:</b> ${sent} users\n` +
`❌ <b>Failed:</b> ${failed} users\n\n` +
`<i>Broadcast finished successfully!</i>`, 
{
chat_id: msg.chat.id,
message_id: broadcastMsg.message_id,
parse_mode: 'HTML'
});
});

// === Error Handling ===
bot.on('polling_error', (err) => console.error('Polling error:', err));

console.log("✅ Bot is running with enhanced UI and /or.bin command...");
