module.exports = async (sock, m, args) => {
    const repoText = `╭━━━〔 🤖 *MISTER-MD REPOSITORY* 〕━━━⬣
┃ 🤖 *Bot Name:* MISTER-MD
┃ 👑 *Owner:* MISTER TD
┃ 📦 *GitHub:* https://github.com/MISTER TD/MISTER-MD
╰━━━━━━━━━━━━━━━━━━━━⬣`;

    const channelInfo = {
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363413121615710@newsletter',
                newsletterName: 'MISTER-MD',
                serverMessageId: -1
            }
        }
    };

    await sock.sendMessage(m.key.remoteJid, {
        image: { url: require("../settings").imageUrl },
        caption: repoText,
        ...channelInfo
    }, { quoted: m });
};
