const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbFile = './messages.db';
const dbExists = fs.existsSync(dbFile);

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
function saveMessage(chatId, text, callback) {
    db.run(
        'INSERT INTO messages (chatId, text) VALUES (?, ?)',
        [chatId, text],
        function(err) {
            if (err) console.error('DB Error:', err);
            if (callback) callback(err, this.lastID);
        }
    );
}

// Получение сообщений
function getMessages(callback) {
    db.all(
        'SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50',
        [],
        (err, rows) => {
            callback(err, rows || []);
        }
    );
}

// Сохранение лога
function saveLog(message, callback) {
    db.run(
        'INSERT INTO logs (message) VALUES (?)',
        [message],
        function(err) {
            if (err) console.error('Log Error:', err);
            if (callback) callback(err, this.lastID);
        }
    );
}

// Получение логов
function getLogs(callback) {
    db.all(
        'SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100',
        [],
        (err, rows) => {
            callback(err, rows || []);
        }
    );
}

module.exports = {
    saveMessage,
    getMessages,
    saveLog,
    getLogs
};