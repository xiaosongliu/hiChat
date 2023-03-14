import co from "co";
import * as fs from "node:fs/promises";
import prompt from "co-prompt";
import { Configuration, OpenAIApi } from "openai";

Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S": this.getMilliseconds()
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
  }

const configuration = new Configuration({
    organization: process.env.OPENAI_Organization_ID,
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);
const chatMessages = [];

const doMsg = (res) => {
    return new Promise((resolve, reject) => {
        const item = { role: 'assistant', content: '' };
        process.stdout.write('ChatGPT: ');
        res.data.on('data', data => {
            const lines = data.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                const message = line.replace(/^data: /, '');
                if (message === '[DONE]') {
                    resolve(item);
                    return;
                }
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.choices[0].delta) {
                        const delta = parsed.choices[0].delta;
                        if (delta.role) {
                            item.role = delta.role;
                        }
                        if (delta.content) {
                            item.content += delta.content;
                            process.stdout.write(delta.content);
                        }
                    }
                } catch(error) {
                    console.error('Could not JSON parse stream message', message, error);
                    reject(error);
                }
            }
        });
    });
}

const doChat = async () => {
    try {
        const res = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: chatMessages,
            stream: true,
        }, { responseType: 'stream' });
        return await doMsg(res);
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
        return false;
    }
}

const saveMsg = async () => {
    let msg = [];
    let dir = './msg/';
    chatMessages.forEach((item, i) => {
        let name = '';
        let content = item.content.trim();
        switch (item.role) {
            case 'user':
                name = '我';
                break;
            case 'assistant':
                name = 'ChatGPT';
                break;
            case 'system':
                name = '系统';
                break;
        }
        msg.push(`${name}: ${content}`);
    });
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir);
    }
    try {
        let file = (new Date()).Format('yyyyMMddhhmmss');
        await fs.appendFile(`${dir}${file}.txt`, msg.join("\n") + "\n\n");
        return true;
    } catch {
        return false;
    }
}

function *run() {
    do {
        let msg = yield prompt(`我: `);
        if (!msg) {
            continue;
        }
        if (msg.toLowerCase() == 'save') {
            let res = yield saveMsg();
            process.stdout.write("聊天内容保存" + (res ? '成功' : '失败') + "\n");
            continue;
        }
        if (msg.toLowerCase() == 'exit') {
            yield saveMsg();
            process.exit();
        }
        process.stdout.write("\n");
        chatMessages.push({
            "role": 'user',
            "content": msg
        });
        let res = yield doChat();
        switch (res.role) {
            case 'assistant':
                if (res.content != '') {
                    chatMessages.push(res);
                } else {
                    process.exit();
                }
                break;
            case 'system':
                break;

        }
        process.stdout.write("\n\n");
        
    } while (true);
}

co(run);
