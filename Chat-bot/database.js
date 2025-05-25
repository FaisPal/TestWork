const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { Mutex } = require('async-mutex');

const dbFile = './messages.db';
const dbExists = fs.existsSync(dbFile);
const dbMutex = new Mutex(); // Мьютекс для защиты операций с БД

const db = new sqlite3.Database(dbFile);

// Инициализация БД
db.serialize(() => {
  if (!dbExists) {
    db.run(`
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId INTEGER NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Сохранение сообщения
async function saveMessage(chatId, text, callback) {
  const release = await dbMutex.acquire();
  try {
    db.run('INSERT INTO messages (chatId, text) VALUES (?, ?)', [chatId, text], function (err) {
      if (err) console.error('DB Error:', err);
      if (callback) callback(err, this.lastID);
    });
  } finally {
    release();
  }
}

// Получение сообщений
async function getMessages(callback) {
  const release = await dbMutex.acquire();
  try {
    db.all('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50', [], (err, rows) => {
      callback(err, rows || []);
    });
  } finally {
    release();
  }
}

// Сохранение лога
async function saveLog(message, callback) {
  const release = await dbMutex.acquire();
  try {
    db.run('INSERT INTO logs (message) VALUES (?)', [message], function (err) {
      if (err) console.error('Log Error:', err);
      if (callback) callback(err, this.lastID);
    });
  } finally {
    release();
  }
}

// Получение логов
async function getLogs(callback) {
  const release = await dbMutex.acquire();
  try {
    db.all('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100', [], (err, rows) => {
      callback(err, rows || []);
    });
  } finally {
    release();
  }
}

module.exports = {
  saveMessage,
  getMessages,
  saveLog,
  getLogs
};
