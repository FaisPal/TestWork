const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const db = require('./database.js');

const app = express();
const PORT = 3000;
const TOKEN = '7648230730:AAFQ2Aycmm7prrpyWh-cx9ElqA8ijh1so8I'; // Замените на ваш токен

// Инициализация бота
const bot = new TelegramBot(TOKEN, { polling: true });

// Middleware
app.use(bodyParser.json());
app.use(express.static('view')); // Раздаём статику (HTML/CSS/JS)

// Обработчик сообщений из Telegram
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Сохраняем в базу
  db.saveMessage(chatId, text);
  
  // Ответим эхом (можно заменить своей логикой)
  bot.sendMessage(chatId, `Вы написали: "${text}"`);
});

// API для сайта
app.post('/send-to-telegram', (req, res) => {
  const { chatId, text } = req.body;
  bot.sendMessage(chatId, text);
  res.json({ success: true });
});

app.get('/get-messages', (req, res) => {
  db.getMessages((messages) => {
    res.json(messages);
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});