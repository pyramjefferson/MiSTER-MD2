module.exports = async (sock, m, args) => {
    const chatId = m.key.remoteJid;

    const start = Date.now();

    const msg = await sock.sendMessage(
        chatId,
        {
            text: "🏓 Pinging..."
        },
        { quoted: m }
    );

    const latency = Date.now() - start;

    await sock.sendMessage(
        chatId,
        {
            text:
`╭━━━〔 *MISTER-MD PING* 〕━━━⬣
┃ 🏓 *Pong!*
┃ ⚡ *Speed:* ${latency} ms
┃ 🤖 *Bot:* MISTER-MD
╰━━━━━━━━━━━━━━━━━━━━⬣`
        },
        { quoted: m }
    );
};
