const settings = require("../settings");
const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, args) => {
    const pushName = m.pushName || m.senderPn || (m.sender ? m.sender.split("@")[0] : "User");
    const chatId = m.key.remoteJid;
    const prefix = settings.prefix || ".";

    function runtime(seconds) {
        seconds = Number(seconds);
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const min = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${d > 0 ? d + "d " : ""}${h > 0 ? h + "h " : ""}${min > 0 ? min + "m " : ""}${s}s`;
    }

    const uptime = runtime(process.uptime());
    let commandList = [];
    try {
        const commandsDir = path.join(__dirname);
        if (fs.existsSync(commandsDir)) {
            commandList = fs.readdirSync(commandsDir)
                .filter(file => file.endsWith(".js"))
                .map(file => file.replace(".js", "").toLowerCase());
        }
    } catch (e) {
        console.error("Error reading commands folder:", e);
    }

    const categories = {
        "BOT INFO": ["alive", "ping", "menu", "owner", "runtime", "gstatut", "jidnewsletter", "fb", "repo"],
        "TOOLS": ["play", "igdl", "twitter", "clear", "tourl", "video", "vv", "image"],
        "GROUP": ["kick", "kickall", "add", "promote", "demote", "delete", "tagall", "open", "close", "link", "hidetag"],
        "SETTINGS": ["antilink", "setprefix", "help", "mode", "autoreact", "autoread", "autotyping"]
    };

    const categorized = new Set(Object.values(categories).flat());
    const otherCommands = commandList.filter(cmd => !categorized.has(cmd));
    if (otherCommands.length) categories["OTHER"] = otherCommands;

    let menuCategoriesText = "";
    for (const [catName, cmds] of Object.entries(categories)) {
        const active = cmds.filter(cmd => commandList.includes(cmd));
        if (!active.length) continue;
        const formatted = active.map(cmd => `*├▢ ${prefix}${cmd} 🇭🇹*`).join("\n");
        menuCategoriesText += `\n*╭┈───〔 ${catName} 〕┈───⊷*\n${formatted}\n*╰───────────────────⊷*\n`;
    }

    const channelUrl = settings.newsletterUrl;
    const menu = `
*╭┈───〔 ${settings.botName} 〕┈───⊷*
*├▢ 🤖 ᴏᴡɴᴇʀ:* ${settings.ownerName}
*├▢ 👤 ᴜsᴇʀ:* ${pushName}
*├▢ 📜 ᴄᴏᴍᴍᴀɴᴅs:* ${commandList.length}
*├▢ ⏱️ ʀᴜɴᴛɪᴍᴇ:* ${uptime}
*├▢ 📦 ᴘʀᴇғɪx:* ${prefix}
*├▢ ⚙️ ᴍᴏᴅᴇ:* PUBLIC
*├▢ 🏷️ ᴠᴇʀsɪᴏɴ:* ${settings.version}
*╰───────────────────⊷*
${menuCategoriesText}
*╭┈───〔 📢 NEWSLETTER 〕┈───⊷*
*├▢ ${channelUrl}*
*╰───────────────────⊷*
> *© Powered by ${settings.ownerName} 🇭🇹*
`.trim();

    try {
        await sock.sendMessage(chatId, { react: { text: "📜", key: m.key } });
        await sock.sendMessage(chatId, {
            image: { url: settings.imageUrl },
            caption: menu,
            contextInfo: {
                mentionedJid: m.sender ? [m.sender] : [],
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: settings.newsletterJid,
                    newsletterName: settings.newsletterName,
                    serverMessageId: 1
                },
                externalAdReply: {
                    title: settings.botName,
                    body: `Bot WhatsApp de ${settings.ownerName}`,
                    sourceUrl: channelUrl,
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m });
    } catch (e) {
        console.error("Menu Error:", e);
        await sock.sendMessage(chatId, { text: menu }, { quoted: m });
    }
};
