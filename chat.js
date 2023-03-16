const co = require('co');
const fs = require('fs/promises');
const prompt = require('co-prompt');
const moment = require('moment');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    organization: process.env.OPENAI_Organization_ID,
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);
const chatMessages = [];

const postMsg = async () => {
    try {
        const res = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: chatMessages,
            stream: true,
        }, { responseType: 'stream' });
        return await receiveMsg(res);
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

const receiveMsg = (res) => {
    return new Promise((resolve, reject) => {
        const item = {
            role: 'assistant',
            content: ''
        };
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
                            if (!item.content) {
                                process.stdout.write('ChatGPT: ');
                            }
                            process.stdout.write(delta.content);
                            item.content += delta.content;
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

const createDirectoryIfNotExists = async (dirname) => {
    try {
        await fs.access(dirname);
    } catch (error) {
        await fs.mkdir(dirname, { recursive: true });
    }
}

const saveMsg = async () => {
    let msg = [];
    let dir = './msg/';
    if (!chatMessages.length) {
        return false;
    }
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
        let name = moment().format('YYYYMMDDHHmmss');
        let file = `${dir}${name}.txt`;
        await createDirectoryIfNotExists(dir);
        await fs.appendFile(file, msg.join("\n") + "\n\n");
        return true;
    } catch {
        return false;
    }
}

const readDoc = async () => {
    const doc = './doc.txt';
    try {
        await fs.access(doc);
    } catch {
        return false;
    }
    try {
        let msg = await fs.readFile(doc, 'utf-8');
        return msg;
    } catch {
        return false;
    }
};

function *run() {
    do {
        let msg = yield prompt(`我: `);
        msg.trim();
        if (!msg) {
            continue;
        }
        if (msg.toLowerCase() == 'doc') {
            msg = yield readDoc();
            process.stdout.write(msg + "\n");
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
        let res = yield postMsg();
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
