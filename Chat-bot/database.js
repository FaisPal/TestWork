const sqlite3 = require('sqlite3').verbose();
const fs = require('fs'); // Модуль для работы с файловой системой
const dbFile = './messages.db';

// Проверяем, существует ли файл базы данных
const dbExists = fs.existsSync(dbFile);

// Создаем/подключаем базу данных
const db = new sqlite3.Database(dbFile);

// Инициализация таблицы (только если база не существовала ранее)
if (!dbExists) {
  db.serialize(() => {
    db.run(`
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId INTEGER NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('База данных и таблица messages созданы');
  });
} else {
  console.log('Подключение к существующей базе данных');
}

// Сохранение сообщения
const saveMessage = (chatId, text) => {
  db.run(
    'INSERT INTO messages (chatId, text) VALUES (?, ?)',
    [chatId, text]
  );
};

// Получение всех сообщений
const getMessages = (callback) => {
  db.all('SELECT * FROM messages ORDER BY timestamp DESC', [], (err, rows) => {
    callback(rows || []);
  });
};


module.exports = { saveMessage, getMessages };