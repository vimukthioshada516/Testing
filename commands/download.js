const axios = require('axios');

module.exports = async (sock, msg, args) => {
    const videoUrl = args[0];
    if (!videoUrl) return await sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a TikTok URL.' });

    const apiUrl = `https://api.botcahx.eu.org/api/dowloader/allin?url=${videoUrl}&apikey=ssGggjTC`;

    try {
        const response = await axios.get(apiUrl);
        const video = response.data.result.nowm;
        await sock.sendMessage(msg.key.remoteJid, { video: { url: video }, caption: 'Here is your video!' });
    } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Error downloading video.' });
    }
};
