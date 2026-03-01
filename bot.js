const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const XLSX = require('xlsx');

const token = '8727500030:AAGtOUvHHq5FRkUtVqURmZawOlI6GqTV4aw';

// 👉 Yaha apna Telegram User ID daalo
const ADMIN_ID = 123456789;

const bot = new TelegramBot(token, { polling: true });

let users = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    users[chatId] = { step: 1 };
    bot.sendMessage(chatId, "Enter Your Roll No:");
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (!users[chatId]) return;

    const user = users[chatId];

    // STEP 1 - Roll
    if (user.step === 1) {
        if (!msg.text || msg.text === '/start') {
            bot.sendMessage(chatId, "❌ Please enter Roll No in text.");
            return;
        }
        user.roll = msg.text;
        user.step = 2;
        bot.sendMessage(chatId, "Enter Your Name:");
        return;
    }

    // STEP 2 - Name
    if (user.step === 2) {
        if (!msg.text) {
            bot.sendMessage(chatId, "❌ Please enter Name in text.");
            return;
        }
        user.name = msg.text;
        user.step = 3;
        bot.sendMessage(chatId, "Send First Video:");
        return;
    }

    // STEP 3 - First Video
    if (user.step === 3) {
        if (!msg.video) {
            bot.sendMessage(chatId, "❌ Only video allowed. Send First Video.");
            return;
        }
        user.video1 = msg.video.file_id;
        user.step = 4;
        bot.sendMessage(chatId, "Send Second Video:");
        return;
    }

    // STEP 4 - Second Video
    if (user.step === 4) {
        if (!msg.video) {
            bot.sendMessage(chatId, "❌ Only video allowed. Send Second Video.");
            return;
        }
        user.video2 = msg.video.file_id;

        const finalData = {
            roll: user.roll,
            name: user.name,
            video1: user.video1,
            video2: user.video2,
            userId: chatId,
            date: new Date()
        };

        let oldData = [];
        if (fs.existsSync('data.json')) {
            oldData = JSON.parse(fs.readFileSync('data.json'));
        }

        oldData.push(finalData);
        fs.writeFileSync('data.json', JSON.stringify(oldData, null, 2));

        bot.sendMessage(chatId, "✅ Data Saved Successfully!");
        delete users[chatId];
    }
});

// 🔎 ADMIN COMMAND - View Data
bot.onText(/\/viewdata/, (msg) => {
    const chatId = msg.chat.id;

    
    if (!fs.existsSync('data.json')) {
        bot.sendMessage(chatId, "No data found.");
        return;
    }

    const data = fs.readFileSync('data.json', 'utf8');

    bot.sendMessage(chatId, "📂 Saved Data:\n\n" + data);
});



bot.onText(/\/downloadall/, async (msg) => {
    const chatId = msg.chat.id;

       if (!fs.existsSync('data.json')) {
        bot.sendMessage(chatId, "No data found.");
        return;
    }

    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

    if (!data.length) {
        bot.sendMessage(chatId, "No records available.");
        return;
    }

    bot.sendMessage(chatId, "⬇ Downloading all videos... Please wait");

    for (let i = 0; i < data.length; i++) {
        const user = data[i];

        const userFolder = `./downloads/${user.roll}_${user.name}`;
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }

        try {
            if (user.video1) {
                await bot.downloadFile(user.video1, userFolder);
            }

            if (user.video2) {
                await bot.downloadFile(user.video2, userFolder);
            }

        } catch (err) {
            console.log("Error downloading for:", user.roll);
        }
    }

    bot.sendMessage(chatId, "✅ All videos downloaded successfully!");
});

bot.onText(/\/exportexcel/, async (msg) => {
    const chatId = msg.chat.id;

   
    if (!fs.existsSync('data.json')) {
        bot.sendMessage(chatId, "No data found.");
        return;
    }

    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

    if (!data.length) {
        bot.sendMessage(chatId, "No records available.");
        return;
    }

    // Excel format ke liye clean data
    const excelData = data.map(item => ({
        Roll: item.roll,
        Name: item.name,
        Video1_FileID: item.video1,
        Video2_FileID: item.video2,
        UserID: item.userId,
        Date: item.date
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Data");

    const filePath = "StudentData.xlsx";
    XLSX.writeFile(workbook, filePath);

    await bot.sendDocument(chatId, filePath);

    bot.sendMessage(chatId, "✅ Excel file generated successfully!");
});

bot.onText(/\/getvideo (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fileId = match[1];

    try {
        const filePath = await bot.downloadFile(fileId, './downloads');
        bot.sendMessage(chatId, "✅ Video downloaded:\n" + filePath);
    } catch (error) {
        bot.sendMessage(chatId, "❌ Download failed");
        console.log(error);
    }
});