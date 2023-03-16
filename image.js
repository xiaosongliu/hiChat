const fs = require('fs');
const https = require('https');
const moment = require('moment');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    organization: process.env.OPENAI_Organization_ID,
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);
const argv = process.argv.slice(2);
const msg = argv[0];

const run = async () => {
    try {
        const res = await openai.createImage({
            "prompt": msg,
            "n": 1,
            "size": "1024x1024"
        });
        
        if (res.data && res.data.data && res.data.data.length) {
            const imageUrl = res.data.data[0].url;
            console.log('GPT: ' + imageUrl);

            const fileName = moment().format('YYYYMMDDHHmmss');
            const filePath = `msg/${fileName}.png`;
            const fileStream = fs.createWriteStream(filePath);

            https.get(imageUrl, (response) => {
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`Image downloaded and saved to ${filePath}`);
                });
            }).on('error', (error) => {
                console.error(`Error downloading image: ${error.message}`);
            });
        }
    
    } catch (error) {
        if (error.response?.status) {
            console.error(error.response.status, error.message);
            error.response.data.on('data', data => {
                const message = data.toString();
                try {
                    const parsed = JSON.parse(message);
                    console.error('An error occurred during OpenAI request: ', parsed);
                } catch(error) {
                    console.error('An error occurred during OpenAI request: ', message);
                }
            });
        } else {
            console.error('An error occurred during OpenAI request', error);
        }
    }
}

if (msg) {
    run();
}
