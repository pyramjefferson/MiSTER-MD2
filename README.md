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
