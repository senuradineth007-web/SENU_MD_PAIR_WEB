const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8080;

app.get('/', async (req, res) => {
    const num = req.query.number;
    const htmlPath = path.join(__dirname, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    if (!num) {
        const formHtml = `
            <form action="/" method="GET" class="space-y-4">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WhatsApp Number</label>
                <input type="text" name="number" placeholder="947xxxxxxxx" required 
                       class="w-full bg-slate-900/50 border border-slate-700 p-5 rounded-2xl focus:outline-none focus:border-blue-500 text-center text-xl font-bold text-white">
                <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold py-5 rounded-2xl shadow-lg transition-all active:scale-95">
                    GET PAIRING CODE
                </button>
            </form>`;
        return res.send(html.replace('${content}', formHtml));
    }

    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const conn = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })) },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    if (!conn.authState.creds.registered) {
        await delay(1500);
        const code = await conn.requestPairingCode(num);
        const codeHtml = `
            <p class="text-blue-400 font-bold mb-2 uppercase text-xs tracking-widest">Your Pairing Code</p>
            <div class="bg-slate-900/80 py-6 rounded-2xl border border-blue-500/30 mb-4">
                <h2 class="text-5xl font-mono font-black tracking-[0.2em] text-white">${code}</h2>
            </div>
            <p class="text-[11px] text-slate-500 px-4">WhatsApp -> Linked Devices එකට ගොස් මෙම කේතය ඇතුළත් කරන්න.</p>`;
        res.send(html.replace('${content}', codeHtml));
    }
    conn.ev.on('creds.update', saveCreds);
});

app.listen(port, () => console.log(`Server started on port ${port}`));
