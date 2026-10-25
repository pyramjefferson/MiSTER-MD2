const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const http = require("http");
const path = require("path");
const settings = require("./settings");

// ======================================================
// MISTER-MD WEB + PAIRING CODE PAGE
// ======================================================
let activeSock = null;
let activeAuthState = null;
let pairingRequestInProgress = false;
const pairingRateLimit = new Map();

const pairingPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MISTER-MD | Pairing Code</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at top,#153c3a 0,#0a1018 45%,#05080d 100%);font-family:Arial,sans-serif;color:#eefbf8}
.card{width:min(100%,440px);padding:28px;border:1px solid #2ce5bf55;border-radius:24px;background:#0d171eee;box-shadow:0 20px 70px #0009}
.logo{width:86px;height:86px;object-fit:cover;border-radius:22px;border:1px solid #43eac6;margin-bottom:14px}
h1{margin:0;font-size:28px;letter-spacing:1px} .sub{color:#9eb8b3;line-height:1.55;font-size:14px}
label{display:block;margin:22px 0 8px;font-size:13px;color:#c8e8e1}
input{width:100%;padding:15px 14px;border-radius:12px;border:1px solid #365b55;background:#07100f;color:#fff;font-size:16px;outline:none}
input:focus{border-color:#37e5bc;box-shadow:0 0 0 3px #37e5bc22}
button{width:100%;margin-top:13px;padding:15px;border:0;border-radius:12px;background:linear-gradient(90deg,#19b991,#4ce9c0);font-weight:800;color:#04120f;font-size:15px;cursor:pointer}
button:disabled{opacity:.6;cursor:wait}.result{display:none;margin-top:18px;padding:15px;border-radius:12px;background:#06100f;border:1px solid #2ce5bf55;overflow-wrap:anywhere}.code{font-size:24px;letter-spacing:3px;font-weight:800;color:#56f0c8}.foot{font-size:12px;color:#8aa49e;margin-top:18px;line-height:1.6}.channel{display:inline-block;margin-top:12px;color:#60e9c7;text-decoration:none}
</style></head>
<body><main class="card">
<img class="logo" src="https://files.catbox.moe/jk9nuf.png" alt="MISTER-MD">
<h1>MISTER-MD</h1><p class="sub">WhatsApp Pairing Portal<br>Antre nimewo WhatsApp ou ak kòd peyi a pou mande yon pairing code.</p>
<form id="pairForm"><label for="phone">NIMEWO WHATSAPP (avèk kòd peyi)</label>
<input id="phone" name="phone" type="tel" inputmode="numeric" placeholder="509XXXXXXXX" minlength="10" maxlength="15" required>
<button id="submit" type="submit">GET PAIRING CODE</button></form>
<div id="result" class="result" role="status"></div>
<p class="foot">Pa pataje kòd la ak okenn lòt moun. Itilize sèlman sou kont WhatsApp ou gen dwa konekte a. Si bot la deja konekte, pa mande yon lòt kòd.</p>
<a class="channel" href="https://whatsapp.com/channel/0029Vb8oizBBKfi9ZF3urZ29" target="_blank" rel="noopener">Join MISTER-MD Newsletter ↗</a>
</main>
<script>
const form=document.getElementById('pairForm'),btn=document.getElementById('submit'),box=document.getElementById('result');
form.addEventListener('submit',async e=>{e.preventDefault();btn.disabled=true;btn.textContent='REQUESTING CODE...';box.style.display='block';box.textContent='Ap mande WhatsApp kòd la...';
try{const phone=document.getElementById('phone').value.replace(/[^0-9]/g,'');const r=await fetch('/api/pairing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Pa t kapab jwenn kòd la.');box.innerHTML='<div>PAIRING CODE</div><div class="code"></div><p></p>';box.querySelector('.code').textContent=data.code;box.querySelector('p').textContent=data.message||'Antre kòd sa a nan WhatsApp sou telefòn ou.';}catch(err){box.textContent=err.message;}finally{btn.disabled=false;btn.textContent='GET PAIRING CODE';}});
</script></body></html>`;

const startServer = (port) => {
    const server = http.createServer(async (req, res) => {
        if (req.method === "GET" && (req.url === "/" || req.url === "/pair")) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
            return res.end(pairingPage);
        }
        if (req.method === "GET" && req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: true, bot: "MISTER-MD", connected: Boolean(activeSock?.user) }));
        }
        if (req.method === "POST" && req.url === "/api/pairing") {
            let body = "";
            req.on("data", chunk => { body += chunk; if (body.length > 4096) req.destroy(); });
            req.on("end", async () => {
                const send = (status, data) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(data)); };
                try {
                    const data = JSON.parse(body || "{}");
                    const phone = String(data.phone || "").replace(/[^0-9]/g, "");
                    if (!/^\\d{10,15}$/.test(phone)) return send(400, { error: "Antre yon nimewo konplè avèk kòd peyi a (10–15 chif)." });
                    if (!activeSock || !activeAuthState) return send(503, { error: "WhatsApp poko pare. Tann sèvè a fini demare epi eseye ankò." });
                    if (activeAuthState.creds?.registered) return send(409, { error: "Sesyon WhatsApp sa a deja konekte. Se sèlman responsab bot la ki ta dwe reset sesyon an." });
                    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
                    const now = Date.now();
                    const previous = (pairingRateLimit.get(ip) || []).filter(ts => now - ts < 10 * 60 * 1000);
                    if (previous.length >= 3) return send(429, { error: "Twòp demann soti nan koneksyon sa a. Eseye ankò nan 10 minit." });
                    previous.push(now);
                    pairingRateLimit.set(ip, previous);
                    if (pairingRequestInProgress) return send(429, { error: "Gen yon demann pairing ki deja ap fèt. Tann kèk segonn." });
                    pairingRequestInProgress = true;
                    const code = await activeSock.requestPairingCode(phone);
                    const prettyCode = code?.match(/.{1,4}/g)?.join("-") || code;
                    return send(200, { code: prettyCode, message: "Sou WhatsApp: Aparèy ki konekte > Konekte yon aparèy > Konekte ak nimewo telefòn, epi antre kòd la." });
                } catch (err) {
                    return send(500, { error: "WhatsApp pa t kapab kreye kòd la: " + (err.message || "erè enkoni") });
                } finally {
                    pairingRequestInProgress = false;
                }
            });
            return;
        }
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
    });
    server.listen(port, "0.0.0.0", () => console.log(`🌐 MISTER-MD web server running on port ${port}`));
    server.on("error", e => {
        if (e.code === "EADDRINUSE") { console.log(`⚠️ Port ${port} busy, trying ${port + 1}...`); startServer(port + 1); }
        else console.error("Server Error:", e);
    });
};
startServer(Number(process.env.PORT) || 3000);

// ======================================================
// DATABASE
// ======================================================

const dbPath = path.join(__dirname, "database.json");

if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
        dbPath,
        JSON.stringify({
            antilink: [],
            autoreact: false,
            autoread: false,
            mode: "public"
        }, null, 2)
    );
}

// ======================================================
// LOAD COMMANDS
// ======================================================

const commands = {};
const commandsPath = path.join(__dirname, "commands");

function loadCommands() {

    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, {
            recursive: true
        });

        console.log("⚠️ commands folder created.");
        return;
    }

    const files = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of files) {

        const commandName = path
            .basename(file, ".js")
            .toLowerCase();

        const filePath = path.join(commandsPath, file);

        try {

            // Clear require cache
            delete require.cache[require.resolve(filePath)];

            const command = require(filePath);

            if (typeof command !== "function") {
                console.error(
                    `❌ Command ${file} does not export a function.`
                );
                continue;
            }

            commands[commandName] = command;

        } catch (error) {

            console.error(`\n❌ Failed to load command: ${file}`);
            console.error(`➡️ Error: ${error.message}`);

            if (error.stack) {
                console.error(error.stack);
            }

            console.error("");
        }
    }

    console.log(
        `📦 Commands loaded successfully: ${Object.keys(commands).length}\n`
    );
}

loadCommands();

// ======================================================
// START BOT
// ======================================================

async function startBot() {

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState("session");

    activeAuthState = state;

    const {
        version
    } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({
            level: "silent"
        }),
        auth: state,
        browser: [
            "Ubuntu",
            "Chrome",
            "20.0.04"
        ],
        printQRInTerminal: false
    });

    activeSock = sock;

    // ==================================================
    // SAVE CREDENTIALS
    // ==================================================

    sock.ev.on(
        "creds.update",
        saveCreds
    );

    // ==================================================
    // AUTO STATUS VIEW + REACTION
    // ==================================================

    sock.ev.on(
        "messages.upsert",
        async (chatUpdate) => {

            try {

                const m =
                    chatUpdate.messages?.[0];

                if (!m || !m.message) return;

                if (
                    m.key.remoteJid !==
                    "status@broadcast"
                ) {
                    return;
                }

                const emojis = [
                    "💚",
                    "🔥",
                    "✨",
                    "🙌",
                    "💯",
                    "👑",
                    "🚀",
                    "😍",
                    "⚡",
                    "💎"
                ];

                const randomEmoji =
                    emojis[
                        Math.floor(
                            Math.random() *
                            emojis.length
                        )
                    ];

                const participant =
                    m.key.participant ||
                    m.participant;

                if (!participant) return;

                // View status
                await sock.readMessages([
                    m.key
                ]);

                // React to status
                await sock.sendMessage(
                    "status@broadcast",
                    {
                        react: {
                            text: randomEmoji,
                            key: m.key
                        }
                    },
                    {
                        statusJidList: [
                            participant
                        ]
                    }
                );

            } catch (error) {

                console.error(
                    "Auto Status Error:",
                    error.message
                );
            }
        }
    );

    // ==================================================
    // CONNECTION UPDATE
    // ==================================================

    sock.ev.on(
        "connection.update",
        async (update) => {

            const {
                connection,
                lastDisconnect
            } = update;

            if (connection === "close") {

                const statusCode =
                    lastDisconnect
                        ?.error
                        ?.output
                        ?.statusCode;

                if (
                    statusCode !==
                    DisconnectReason.loggedOut
                ) {

                    console.log(
                        "🔄 Connection closed. Reconnecting..."
                    );

                    setTimeout(() => {
                        startBot();
                    }, 3000);

                } else {

                    console.log(
                        "❌ WhatsApp logged out."
                    );
                }

            } else if (connection === "open") {

                const ownerJid =
                    settings.ownerNumber
                        .replace(/[^0-9]/g, "") +
                    "@s.whatsapp.net";

                console.log(
                    "\n🎊 MISTER-MD IS CONNECTED!"
                );

                const channelInfo = {
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid:
                                settings.newsletterJid,
                            newsletterName:
                                "MISTER-MD",
                            serverMessageId: -1
                        }
                    }
                };

                try {

                    await sock.sendMessage(
                        ownerJid,
                        {
                            image: {
                                url: settings.imageUrl
                            },

                            caption:
                                `╭━━━〔 🤖 *MISTER-MD STATUS* 〕━━━⬣\n` +
                                `┃ ✨ *Bot:* Online & Ready!\n` +
                                `┃ 🚀 *Status:* Fully Connected\n` +
                                `┃ ⚡ *Mode:* Active\n` +
                                `┃ 📦 *Commands:* ${Object.keys(commands).length}\n` +
                                `╰━━━━━━━━━━━━━━━━━━━━⬣`,

                            ...channelInfo
                        }
                    );

                } catch (error) {

                    console.error(
                        "Owner notification error:",
                        error.message
                    );
                }
            }
        }
    );

    // ==================================================
    // MESSAGE HANDLER
    // ==================================================

    sock.ev.on(
        "messages.upsert",
        async ({
            messages,
            type
        }) => {

            try {

                if (type !== "notify") return;

                const m =
                    messages?.[0];

                if (!m || !m.message) return;

                const from =
                    m.key.remoteJid;

                if (
                    !from ||
                    from === "status@broadcast"
                ) {
                    return;
                }

                // ======================================
                // DATABASE READ FOR GLOBAL FEATURES
                // ======================================
                let globalDb = { antilink: [], autoreact: false, autoread: false, mode: "public" };
                if (fs.existsSync(dbPath)) {
                    try {
                        globalDb = JSON.parse(fs.readFileSync(dbPath, "utf8"));
                    } catch {
                        globalDb = { antilink: [], autoreact: false, autoread: false, mode: "public" };
                    }
                }

                // AUTOREAD FEATURE
                if (globalDb.autoread) {
                    try {
                        await sock.readMessages([m.key]);
                    } catch (e) {
                        console.error("AutoRead Error:", e.message);
                    }
                }

                // AUTOREACT FEATURE
                if (globalDb.autoreact) {
                    try {
                        const emojis = ["💚", "🔥", "✨", "🙌", "💯", "👑", "🚀", "😍", "⚡", "💎"];
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await sock.sendMessage(from, {
                            react: {
                                text: randomEmoji,
                                key: m.key
                            }
                        });
                    } catch (e) {
                        console.error("AutoReact Error:", e.message);
                    }
                }

                const isGroup =
                    from.endsWith("@g.us");

                const sender =
                    m.key.participant ||
                    m.key.remoteJid;

                // ======================================
                // MESSAGE BODY
                // ======================================

                const body =
                    m.message.conversation ||
                    m.message.extendedTextMessage?.text ||
                    m.message.imageMessage?.caption ||
                    m.message.videoMessage?.caption ||
                    m.message.documentMessage?.caption ||
                    "";

                if (!body) return;

                const prefix =
                    settings.prefix || ".";

                const ownerNumber =
                    settings.ownerNumber
                        .replace(/[^0-9]/g, "");

                const isOwner =
                    sender.includes(ownerNumber) ||
                    m.key.fromMe;

                // ======================================
                // MODE CHECK (PUBLIC / PRIVATE)
                // ======================================
                const botMode = globalDb.mode || "public";
                if (botMode === "private" && !isOwner) {
                    return; // Bloke tout lòt moun si l an Private epi se pa ou menm
                }

                // ======================================
                // ANTILINK
                // ======================================

                if (isGroup && body) {

                    let db = {
                        antilink: []
                    };

                    if (fs.existsSync(dbPath)) {

                        try {

                            db = JSON.parse(
                                fs.readFileSync(
                                    dbPath,
                                    "utf8"
                                )
                            );

                        } catch {

                            db = {
                                antilink: []
                            };
                        }
                    }

                    if (
                        Array.isArray(db.antilink) &&
                        db.antilink.includes(from)
                    ) {

                        const linkRegex =
                            /chat\.whatsapp\.com\/|https?:\/\//i;

                        if (
                            linkRegex.test(body)
                        ) {

                            try {

                                const metadata =
                                    await sock.groupMetadata(
                                        from
                                    );

                                const admins =
                                    metadata.participants
                                        .filter(
                                            p =>
                                                p.admin !== null
                                        )
                                        .map(
                                            p => p.id
                                        );

                                const botId =
                                    sock.user.id
                                        .split(":")[0] +
                                    "@s.whatsapp.net";

                                const isBotAdmin =
                                    admins.includes(
                                        botId
                                    );

                                const isSenderAdmin =
                                    admins.includes(
                                        sender
                                    );

                                if (
                                    !isSenderAdmin &&
                                    !isOwner &&
                                    isBotAdmin
                                ) {

                                    await sock.sendMessage(
                                        from,
                                        {
                                            delete:
                                                m.key
                                        }
                                    );

                                    await sock.sendMessage(
                                        from,
                                        {
                                            text:
                                                `🚫 *Link Detected!*\n\n` +
                                                `@${sender.split("@")[0]}, links are not allowed here!`,
                                            mentions: [
                                                sender
                                            ]
                                        }
                                    );
                                }

                            } catch (error) {

                                console.error(
                                    "AntiLink Error:",
                                    error.message
                                );
                            }
                        }
                    }
                }

                // ======================================
                // PREFIX CHECK
                // ======================================

                if (
                    !body.startsWith(prefix)
                ) {
                    return;
                }

                const input =
                    body
                        .slice(prefix.length)
                        .trim();

                if (!input) return;

                const parts =
                    input.split(/\s+/);

                const commandName =
                    parts.shift()
                        .toLowerCase();

                const args = parts;

                // ======================================
                // ANTILINK COMMAND
                // ======================================

                if (
                    commandName === "antilink"
                ) {

                    if (!isOwner) {

                        return await sock.sendMessage(
                            from,
                            {
                                text:
                                    "❌ *Access Denied:* Only the Bot Owner can use this command."
                            },
                            {
                                quoted: m
                            }
                        );
                    }

                    let db = {
                        antilink: []
                    };

                    try {

                        if (
                            fs.existsSync(dbPath)
                        ) {

                            db = JSON.parse(
                                fs.readFileSync(
                                    dbPath,
                                    "utf8"
                                )
                            );
                        }

                    } catch {

                        db = {
                            antilink: []
                        };
                    }

                    if (
                        !Array.isArray(
                            db.antilink
                        )
                    ) {

                        db.antilink = [];
                    }

                    if (
                        args[0] === "on"
                    ) {

                        if (
                            !db.antilink.includes(
                                from
                            )
                        ) {

                            db.antilink.push(
                                from
                            );
                        }

                        fs.writeFileSync(
                            dbPath,
                            JSON.stringify(
                                db,
                                null,
                                2
                            )
                        );

                        return await sock.sendMessage(
                            from,
                            {
                                text:
                                    "🛡️ *AntiLink System:* Activated! ✅"
                            },
                            {
                                quoted: m
                            }
                        );

                    } else if (
                        args[0] === "off"
                    ) {

                        db.antilink =
                            db.antilink.filter(
                                id =>
                                    id !== from
                            );

                        fs.writeFileSync(
                            dbPath,
                            JSON.stringify(
                                db,
                                null,
                                2
                            )
                        );

                        return await sock.sendMessage(
                            from,
                            {
                                text:
                                    "🛡️ *AntiLink System:* Deactivated! ❌"
                            },
                            {
                                quoted: m
                            }
                        );

                    } else {

                        return await sock.sendMessage(
                            from,
                            {
                                text:
                                    `❌ *Usage:* \`${prefix}antilink on/off\``
                            },
                            {
                                quoted: m
                            }
                        );
                    }
                }

                // ======================================
                // SET PREFIX
                // ======================================

                if (
                    commandName === "setprefix"
                ) {

                    if (!isOwner) {

                        return await sock.sendMessage(
                            from,
                            {
                                text:
                                    "❌ *Access Denied:* Only the Bot Owner can use this command."
                            },
                            {
                                quoted: m
                            }
                        );
                    }

                    if (!args[0]) {

                        return await sock.sendMessage(
                            from,
                            {
                                text:
                                    `❌ *Usage:* \`${prefix}setprefix [new_prefix]\`\n` +
                                    `💡 *Example:* \`${prefix}setprefix !\``
                            },
                            {
                                quoted: m
                            }
                        );
                    }

                    const newPrefix =
                        args[0];

                    try {

                        const settingsPath =
                            path.join(
                                __dirname,
                                "settings.js"
                            );

                        let settingsContent =
                            fs.readFileSync(
                                settingsPath,
                                "utf8"
                            );

                        settingsContent =
                            settingsContent.replace(
                                /prefix:\s*["'`].*?["'`]/,
                                `prefix: "${newPrefix}"`
                            );

                        fs.writeFileSync(
                            settingsPath,
                            settingsContent,
                            "utf8"
                        );

                        settings.prefix =
                            newPrefix;

                        return await sock.sendMessage(
                            from,
                            {
                                text:
                                    `✅ *Prefix successfully changed to:* \`${newPrefix}\``
                            },
                            {
                                quoted: m
                            }
                        );

                    } catch (error) {

                        console.error(
                            "SetPrefix Error:",
                            error.message
                        );

                        return await sock.sendMessage(
                            from,
                            {
                                text:
                                    "❌ *Error:* Failed to update settings.js"
                            },
                            {
                                quoted: m
                            }
                        );
                    }
                }

                // ======================================
                // COMMAND ALIASES
                // ======================================

                const aliases = {
                    "ig": "igdl",
                    "instagram": "igdl",
                    "song": "play",
                    "mp3": "play",
                    "mp4": "video",
                    "yt": "video"
                };

                const resolvedCommand =
                    aliases[commandName] || commandName;

                // ======================================
                // COMMAND EXECUTION
                // ======================================

                if (
                    commands[resolvedCommand]
                ) {

                    try {

                        await commands[
                            resolvedCommand
                        ](
                            sock,
                            m,
                            args
                        );

                        if (resolvedCommand !== "menu") {
                            await sock.sendMessage(from, {
                                text: `📢 *MISTER-MD OFFICIAL NEWSLETTER*\n${settings.newsletterUrl}`
                            }, { quoted: m });
                        }

                    } catch (error) {

                        console.error(
                            `❌ Error executing ${commandName}:`,
                            error
                        );

                        await sock.sendMessage(
                            from,
                            {
                                text:
                                    `❌ *Command Error:* ${commandName}\n\n` +
                                    `⚠️ ${error.message}`
                            },
                            {
                                quoted: m
                            }
                        );
                    }

                    return;
                }

            } catch (error) {

                console.error(
                    "Message Handler Error:",
                    error
                );
            }
        }
    );
}

// ======================================================
// START
// ======================================================

startBot().catch(error => {
    console.error(
        "❌ FATAL BOT ERROR:",
        error
    );
});
