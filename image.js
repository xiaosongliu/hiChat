import * as fs from "node:fs/promises";
import * as https from "https";
import moment from 'moment';
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    organization: process.env.OPENAI_Organization_ID,
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);
const argv = process.argv.slice(2);
const msg = argv[0];

try {
    const res = await openai.createImage({
        "prompt": msg,
        "n": 1,
        "size": "1024x1024"
    });
    
    if (res.data && res.data.data && res.data.data.length) {
        const img = res.data.data[0].url;
        const req = https.get(img, function (res) {
            let imgData = '';
            res.setEncoding('binary');
            res.on('data', function (chunk) {
                imgData += chunk;
            });
            res.on('end', () => {
                let name = moment().format('YYYYMMDDHHmmss');
                let file = `msg/${name}.png`;
                fs.writeFile(file, imgData, 'binary').then(() => {
                    console.log("保存成功：" + file);
                }).catch(function (err) {
                    if (err) {
                        console.log("保存失败");
                    }
                });
            });
        
            res.on('error', (err) => {
                console.log("请求失败");
            });
        
        });
        
        req.on('error', (err) => {
            console.log("请求失败: " + err.message);
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
