# hiChat
基于OpenAI Node.js Library写的一个简单的体验机器聊天的程序。
**运行于命令窗口**

## 相关参考文档：
- OpenAI 官方文档： <https://platform.openai.com/docs/introduction>
- openai-node Github：<https://github.com/openai/openai-node>

## 配置环境变量
> 将申请的 OPENAI_API_KEY 与 Organization ID 配置到电脑的环境变量中（[可参看这篇文章](https://www.bbsmax.com/A/ZOJPQr7E5v/)），以下为变量名：

1. OPENAI_API_KEY
2. OPENAI_Organization_ID

## 安装
> 本代码依赖 Nodejs 环境，直接访问 <https://nodejs.org/zh-cn/> 安装即可。

1. 克隆代码到本地
```javascript
git clone https://github.com/xiaosongliu/hiChat.git
```
2. 进入代码目录
```javascript
cd hiChat
```
3. 安装依赖包
```javascript
npm install
```

> 完成上面步骤即已安装完成。

## 开始聊天

1. 运行聊天程序
```javascript
node chat
```
> 完成上面步骤即已启动聊天窗口，可以打字聊天啦！

2. 退出聊天（将自动保存当前聊天内容）
```javascript
我: exit
```

3. 手动保存聊天内容
```javascript
我: save
```
> 程序将在当前目录下创建 msg 目录，以日期+日间为文件名将内容保存为 txt 文件，如： msg/20230314120130.txt
