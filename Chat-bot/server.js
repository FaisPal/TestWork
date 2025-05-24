const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const db = require('./database.js');

const app = express();
const PORT = 3000;
const TOKEN = '7648230730:AAFQ2Aycmm7prrpyWh-cx9ElqA8ijh1so8I';

// Настройка логов
const logFile = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  logStream.write(logMessage);
  console.log(logMessage);
}

// Инициализация бота
const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

// Обработчики ошибок бота
bot.on('polling_error', (error) => {
  log(`Polling error: ${error.message}`);
});

bot.on('webhook_error', (error) => {
  log(`Webhook error: ${error.message}`);
});

app.use(bodyParser.json());
app.use(express.static('view'));

// Хранилище кодов
const authCodes = new Map();

// Генерация 6-значного кода
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Обработчик /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const code = generateCode();
  
  authCodes.set(code, chatId);
  log(`Код ${code} сгенерирован для chatId ${chatId}`);
  
  bot.sendMessage(chatId, `🔑 Ваш код подтверждения: ${code}\nВведите его на сайте`)
    .then(() => log(`Код отправлен пользователю ${chatId}`))
    .catch(err => log(`Ошибка отправки кода: ${err.message}`));
  
  setTimeout(() => {
    if (authCodes.get(code) === chatId) {
      authCodes.delete(code);
      log(`Код ${code} истек`);
    }
  }, 5 * 60 * 1000);
});

// Обработчик обычных сообщений
bot.on('message', (msg) => {
  if (!msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    db.saveMessage(chatId, `[Пользователь]: ${text}`, () => {
      log(`Сообщение от ${chatId} сохранено в БД`);
    });
    
    bot.sendMessage(chatId, `Вы написали: "${text}"`)
      .catch(err => log(`Ошибка ответа: ${err.message}`));
  }
});

// Отправка сообщений
app.post('/send-message', async (req, res) => {
  try {
    const { code, text } = req.body;
    log(`Попытка отправки с кодом ${code}`);
    
    if (!authCodes.has(code)) {
      log(`Неверный код: ${code}`);
      return res.status(400).json({
        success: false,
        error: 'Неверный код. Запросите новый через /start'
      });
    }
    
    const chatId = authCodes.get(code);
    log(`Отправка сообщения в chatId: ${chatId}`);
    
    await bot.sendMessage(chatId, text);
    db.saveMessage(chatId, `[Сайт]: ${text}`, () => {
      log(`Сообщение для ${chatId} сохранено в БД`);
    });
    
    res.json({ success: true });
  } catch (error) {
    log(`Ошибка отправки: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Ошибка при отправке',
      details: error.message
    });
  }
});

// Получение сообщений
app.get('/get-messages', (req, res) => {
  db.getMessages((err, messages) => {
    if (err) {
      log(`Ошибка получения сообщений: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(messages);
  });
});

app.get('/get-bot-info', async (req, res) => {
  try {
    const me = await bot.getMe();
    res.json({
      username: me.username // Или жестко заданный 'chatbotforcoursework_bot'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bot info' });
  }
});

// Получение логов
app.get('/get-logs', (req, res) => {
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err) {
      log(`Ошибка чтения логов: ${err.message}`);
      return res.status(500).json({ error: 'Log read error' });
    }
    res.json({ logs: data.split('\n').filter(line => line.trim()) });
  });
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'view/main.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  log(`Сервер запущен на порту ${PORT}`);
  bot.getMe().then(me => {
    log(`Бот @${me.username} готов к работе`);
  });
});