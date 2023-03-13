import co from "co";
import prompt from "co-prompt";
import { Configuration, OpenAIApi } from "openai";
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
                // Stream finished
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

function *run() {
    let exit = false;
    do {
        let msg = yield prompt(`我: `);
        if (!msg) {
            continue;
        }
        if (msg.toLowerCase() == 'exit') {
            exit = true;
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
        
    } while (!exit);
}

co(run);
