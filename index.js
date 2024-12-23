const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { join } = require('path');
const { state, saveState } = useSingleFileAuthState(join(__dirname, './auth_info.json'));
const fs = require('fs');
const axios = require('axios');

// Initialize the bot
const startBot = async () => {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Display QR code in the terminal
    });

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode || 0) !== 401;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('WhatsApp bot connected successfully!');
        }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveState);

    // Load commands dynamically
    const commands = new Map();
    fs.readdirSync('./commands').forEach((file) => {
        const command = require(`./commands/${file}`);
        commands.set(file.replace('.js', ''), command);
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]; // Take the first message
        if (!msg.message || msg.key.fromMe) return; // Ignore empty and self-sent messages

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const sender = msg.key.remoteJid;
        console.log(`[Message] From: ${sender} | Message: ${text}`);

        if (text.startsWith('!')) {
            const [cmd, ...args] = text.slice(1).split(' '); // Parse command and arguments
            if (commands.has(cmd)) {
                try {
                    await commands.get(cmd)(sock, msg, args); // Execute the command
                } catch (error) {
                    console.error(`Error executing command ${cmd}:`, error);
                    await sock.sendMessage(sender, { text: 'Something went wrong while executing the command!' });
                }
            } else {
                await sock.sendMessage(sender, { text: `Unknown command: ${cmd}` });
            }
        }
    });
};

startBot();
