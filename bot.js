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

import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Copy, Check } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  type?: 'success' | 'error' | 'info';
  timestamp: Date;
}

interface BinInfo {
  bank?: string;
  card_type?: string;
  network?: string;
  tier?: string;
  country?: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "FRANCE": "🇫🇷", "UNITED STATES": "🇺🇸", "BRAZIL": "🇧🇷", "NAMIBIA": "🇳🇦",
  "INDIA": "🇮🇳", "GERMANY": "🇩🇪", "THAILAND": "🇹🇭", "MEXICO": "🇲🇽", "RUSSIA": "🇷🇺",
  "CANADA": "🇨🇦", "UNITED KINGDOM": "🇬🇧", "AUSTRALIA": "🇦🇺", "JAPAN": "🇯🇵",
  "CHINA": "🇨🇳", "ITALY": "🇮🇹", "SPAIN": "🇪🇸", "NETHERLANDS": "🇳🇱"
};

const LOCALE_MAP: Record<string, string> = {
  'us': 'United States', 'uk': 'United Kingdom', 'mx': 'Mexico', 'ca': 'Canada',
  'fr': 'France', 'de': 'Germany', 'jp': 'Japan', 'cn': 'China',
  'in': 'India', 'au': 'Australia', 'it': 'Italy', 'es': 'Spain',
  'br': 'Brazil', 'ru': 'Russia', 'kr': 'South Korea', 'nl': 'Netherlands'
};

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "👋 Welcome to Telegram Multi-Tool Bot!\n\nCommands:\n• Use `/gen <bin>` to generate cards\n• Use `/bin <bin>` to lookup BIN info\n• Use `.fake <country_code>` to generate fake address\n\nSupported countries: us, uk, mx, ca, fr, de, jp, cn, in, au, it, es, br, ru, kr, nl",
      isUser: false,
      type: 'info',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, isUser: boolean, type?: 'success' | 'error' | 'info') => {
    const newMessage: Message = {
      id: Date.now(),
      text,
      isUser,
      type,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const extractBin = (input: string): string | null => {
    const match = input.match(/(\d{6,16})/);
    if (!match) return null;
    let bin = match[1];
    return bin.length >= 6 ? bin.slice(0, 6) : null;
  };

  const lookupBin = async (bin: string): Promise<BinInfo | { error: string }> => {
    try {
      const response = await fetch(`https://drlabapis.onrender.com/api/bin?bin=${bin}`, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return { error: `API error: ${response.status}` };
      const data = await response.json();
      return {
        bank: data.issuer?.toUpperCase() || 'NOT FOUND',
        card_type: data.type?.toUpperCase() || 'NOT FOUND',
        network: data.scheme?.toUpperCase() || 'NOT FOUND',
        tier: data.tier?.toUpperCase() || 'NOT FOUND',
        country: data.country?.toUpperCase() || 'NOT FOUND'
      };
    } catch (error) {
      return { error: 'Network error or timeout' };
    }
  };

  const generateCC = async (bin: string): Promise<string[] | { error: string }> => {
    try {
      const paddedBin = bin.padEnd(16, 'x');
      const response = await fetch(`https://drlabapis.onrender.com/api/ccgenerator?bin=${paddedBin}&count=10`, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return { error: `API error: ${response.status}` };
      const text = await response.text();
      return text.trim().split('\n').filter(card => card.length > 0);
    } catch (error) {
      return { error: 'Network error or timeout' };
    }
  };

  const generateFakeAddress = (countryCode: string): string => {
    const country = LOCALE_MAP[countryCode.toLowerCase()];
    if (!country) {
      return `❗ Unsupported country code. Try: ${Object.keys(LOCALE_MAP).join(', ')}`;
    }

    // Generate random fake data
    const names = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emma Wilson', 'David Davis'];
    const streets = ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm Dr', '654 Cedar Ln'];
    const cities = {
      'us': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
      'uk': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
      'ca': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa']
    };
    
    const name = names[Math.floor(Math.random() * names.length)];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const cityList = cities[countryCode as keyof typeof cities] || ['Capital City', 'Metro City'];
    const city = cityList[Math.floor(Math.random() * cityList.length)];
    const zip = Math.floor(10000 + Math.random() * 90000);
    const phone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    return (
      `✧ Name : ${name}\n` +
      `✧ Street : ${street}\n` +
      `✧ Address 2 : Apt ${Math.floor(100 + Math.random() * 900)}\n` +
      `✧ City : ${city}\n` +
      `✧ State : ${countryCode.toUpperCase()}\n` +
      `✧ Country : ${country.toUpperCase()}\n` +
      `✧ ZIP Code : ${zip}\n` +
      `✧ Phone : ${phone}\n` +
      `✧ Generated by : Telegram Multi-Tool Bot`
    );
  };

  const formatBinResponse = (binInfo: BinInfo, bin: string): string => {
    const country = binInfo.country || 'NOT FOUND';
    const flag = COUNTRY_FLAGS[country] || '🏳️';
    
    return (
      `┏━━━━━━━⍟\n` +
      `┃ BIN Information\n` +
      `┗━━━━━━━━━━━⊛\n\n` +
      `✧ 𝐁𝐈𝐍 ➳ ${bin}\n` +
      `✧ 𝐁𝐚𝐧𝐤 ➳ ${binInfo.bank}\n` +
      `✧ 𝐁𝐫𝐚𝐧𝐝 ➳ ${binInfo.network}\n` +
      `✧ 𝐓𝐲𝐩𝐞 ➳ ${binInfo.card_type}\n` +
      `✧ 𝐂𝐨𝐮𝐧𝐭𝐫𝐲 ➳ ${country} ${flag}\n` +
      `✧ 𝐋𝐞𝐯𝐞𝐥 ➳ ${binInfo.tier}\n\n` +
      `✧ 𝐂𝐡𝐞𝐜𝐤𝐞𝐝 𝐁𝐲 ➳ Multi-Tool Bot`
    );
  };

  const formatCCResponse = (cards: string[], bin: string, binInfo: BinInfo): string => {
    let text = `𝗕𝗜𝗡 ⇾ ${bin}\n`;
    text += `𝗔𝗺𝗼𝘂𝗻𝘁 ⇾ ${cards.length}\n\n`;
    cards.forEach(card => text += `${card.toUpperCase()}\n`);
    text += `\n𝗜𝗻𝗳𝗼: ${binInfo.card_type || 'NOT FOUND'} - ${binInfo.network || 'NOT FOUND'} (${binInfo.tier || 'NOT FOUND'})\n`;
    text += `𝐈𝐬𝐬𝐮𝐞𝐫: ${binInfo.bank || 'NOT FOUND'}\n`;
    const country = binInfo.country || 'NOT FOUND';
    const flag = COUNTRY_FLAGS[country] || '🏳️';
    text += `𝗖𝗼𝘂𝗻𝘁𝗿𝘆: ${country} ${flag}`;
    return text;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    addMessage(userInput, true);
    setInput('');
    setIsLoading(true);

    try {
      if (userInput.match(/^[\/.]gen\s+(.+)/i)) {
        const match = userInput.match(/^[\/.]gen\s+(.+)/i);
        const binInput = match![1];
        const bin = extractBin(binInput);
        
        if (!bin) {
          addMessage("❌ INVALID BIN FORMAT. Please provide a valid 6+ digit BIN.", false, 'error');
          return;
        }

        const [ccData, binInfo] = await Promise.all([generateCC(bin), lookupBin(bin)]);
        
        if ('error' in ccData) {
          addMessage(`❌ ERROR: ${ccData.error}`, false, 'error');
          return;
        }
        
        if ('error' in binInfo) {
          addMessage(`❌ ERROR: ${binInfo.error}`, false, 'error');
          return;
        }

        const result = formatCCResponse(ccData, bin, binInfo);
        addMessage(result, false, 'success');

      } else if (userInput.match(/^[\/.]bin\s+(.+)/i)) {
        const match = userInput.match(/^[\/.]bin\s+(.+)/i);
        const binInput = match![1];
        const bin = extractBin(binInput);
        
        if (!bin || bin.length < 6) {
          addMessage("❌ INVALID BIN FORMAT. Please provide a valid 6+ digit BIN.", false, 'error');
          return;
        }

        const binInfo = await lookupBin(bin);
        
        if ('error' in binInfo) {
          addMessage(`❌ ERROR: ${binInfo.error}`, false, 'error');
          return;
        }

        const result = formatBinResponse(binInfo, bin);
        addMessage(result, false, 'success');

      } else if (userInput.match(/^\.fake\s+(.+)/i)) {
        const match = userInput.match(/^\.fake\s+(.+)/i);
        const countryCode = match![1].trim();
        const result = generateFakeAddress(countryCode);
        addMessage(result, false, result.includes('❗') ? 'error' : 'success');

      } else {
        addMessage("❌ Unknown command. Use `/gen <bin>`, `/bin <bin>`, or `.fake <country_code>`", false, 'error');
      }
    } catch (error) {
      addMessage("❌ An unexpected error occurred. Please try again.", false, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-lg border-b border-blue-500/30 p-4">
        <div className="max-w-4xl mx-auto flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
            <Terminal className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-mono">Telegram Multi-Tool Bot</h1>
            <p className="text-blue-300 text-sm">BIN Lookup • CC Generation • Fake Data</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-4xl p-4 rounded-2xl relative group ${
                  message.isUser
                    ? 'bg-blue-600 text-white ml-12'
                    : message.type === 'error'
                    ? 'bg-red-900/30 border border-red-500/30 text-red-200 mr-12'
                    : message.type === 'success'
                    ? 'bg-green-900/30 border border-green-500/30 text-green-100 mr-12'
                    : 'bg-gray-800/50 border border-gray-600/30 text-gray-100 mr-12'
                }`}
              >
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {message.text}
                </pre>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <span className="text-xs opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {!message.isUser && (
                    <button
                      onClick={() => copyToClipboard(message.text, message.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                      title="Copy message"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800/50 border border-gray-600/30 text-gray-100 p-4 rounded-2xl mr-12">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm font-mono">Processing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-black/30 backdrop-blur-lg border-t border-blue-500/30 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter command: /gen <bin>, /bin <bin>, .fake <country>"
              className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;

// === Error Handling ===
bot.on('polling_error', (err) => console.error(err));

console.log("✅ Bot is running...");
