div style="background-color: #0b0f19; padding: 25px; border-radius: 12px; border: 1px solid #00ffcc55; font-family: 'Share Tech Mono', monospace;">

  <p align="center">
    <img src="https://files.catbox.moe/jk9nuf.png" width="220" style="border-radius: 50%; border: 2px solid #00FFCC; box-shadow: 0 0 15px rgba(0,255,204,0.5);" alt="RIFT-MD Logo">
  </p>

  <h1 align="center">
    <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code:wght@700&size=28&duration=5000&color=00FFCC&background=0B0F1900&center=true&vCenter=true&width=900&lines=RIFT+MD+%E2%9C%A8+THE+BEST+WHATSAPP+BOT+%F0%9F%9A%80;PLUS+30%2B+ADVANCED+FEATURES+%F0%9F%94%A5" alt="Typing Animation">
  </h1>

  <p align="center" style="color: #00ffcc; font-size: 13px; letter-spacing: 2px; margin-top: 15px; text-shadow: 0 0 8px rgba(0,255,204,0.4);">
    ⚡ POWERED BY MISTER-TECH• ULTIMATE EXPERIENCE ⚡
  </p>

</div>

<div style="background-color: #0d1117; padding: 25px; border-radius: 12px; border: 1px solid #30363d; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">

# MISTER-MD 🇭🇹

WhatsApp bot Node.js/Baileys ki gen 37 kòmand ki soti nan pwojè baz la. Non fichye kòmand yo ak non kòmand yo rete menm jan.

## Konfigirasyon

- Bot: MISTER-MD
- Owner: MISTER TD
- Owner WhatsApp: `50955231160`
- Prefix: `.`
- Newsletter: https://whatsapp.com/channel/0029Vb8oizBBKfi9ZF3urZ29
- Imaj Catbox: https://files.catbox.moe/jk9nuf.png

## Kòmanse lokalman

1. Enstale Node.js 20 oswa vèsyon ki konpatib ak depandans Baileys yo.
2. Kouri `npm install`.
3. Kouri `npm start`.
4. Louvri paj Pairing Code la sou adrès sèvè a, pa egzanp `http://localhost:3000`.
5. Antre nimewo a avèk kòd peyi a. Pa mete `+`, espas, oswa tirè.
6. Sou telefòn WhatsApp ki pou nimewo sa a: **Aparèy ki konekte > Konekte yon aparèy > Konekte ak nimewo telefòn**, epi antre kòd la.

## Deploy sou Render

- Kreye yon **Web Service** epi konekte depo GitHub la.
- Build command: `npm install`
- Start command: `npm start`
- Render bay varyab `PORT` la otomatikman; aplikasyon an sèvi avè l.
- Pou koneksyon an siviv redeploy/restart, sèvi ak yon disk pèmanan pou fichye `session/` si plan Render ou sipòte sa. San depo pèmanan, sesyon WhatsApp la ka pèdi.
- Pa mete dosye `session/` oswa kredansyèl WhatsApp yo nan GitHub.

## Sekirite Pairing Code

Paj la limite demann pa adrès IP, men li piblik. Pataje paj la sèlman ak moun ki gen dwa konekte nimewo WhatsApp pa yo. Pa janm mande oswa pataje kòd pairing yon lòt moun san pèmisyon. Kòd la se pou konekte kont WhatsApp nimewo ki antre a.

## Fichye prensipal yo

- `index.js`: sèvè web, Pairing Code ak dispatch kòmand.
- `settings.js`: non bot la, owner, prefix, imaj ak newsletter.
- `commands/`: 37 fichye kòmand yo.
- `lib/`: fonksyon sipò.
- `database.json`: done fonksyon bot yo.
