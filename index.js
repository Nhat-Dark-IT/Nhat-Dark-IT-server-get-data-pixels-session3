const puppeteer = require('puppeteer-core');
const { google } = require('googleapis');
const fs = require('fs');

const SPREADSHEET_ID = "1-82lpqzMehme79OH16z1_loUlZ9oZ7WvzK-vSgwROnk";
const SHEETS = {
  "Whittlewood Plank": "White Plank",
  "Craftbark Plank": "Craft Plank"
};

// Hàm chuyển số thành chữ cái cột
function getColumnLetter(columnNumber) {
  let dividend = columnNumber;
  let columnName = '';
  let modulo;

  while (dividend > 0) {
    modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - 1) / 26);
  }

  return columnName;
}

// Hàm xác định cột hiện tại
function getCurrentColumn() {
  const now = new Date();
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  
  // Set ngày bắt đầu cố định 27/12/2024
  const startDate = new Date('2024-12-27T00:00:00+07:00');
  
  // Tính số ngày chênh lệch
  const diffTime = vnTime.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Bắt đầu từ cột C (số 3)
  const columnNumber = diffDays + 3;
  
  console.log(`=== Debug thông tin cột ===`);
  console.log(`Ngày bắt đầu: ${startDate.toLocaleDateString()}`);
  console.log(`Ngày hiện tại: ${vnTime.toLocaleDateString()}`);
  console.log(`Số ngày chênh lệch: ${diffDays}`);
  console.log(`Số thứ tự cột: ${columnNumber}`);
  
  return getColumnLetter(columnNumber);
}

// Hàm xác định dòng hiện tại
function getCurrentRow() {
  const now = new Date();
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  
  const hours = vnTime.getHours();
  const minutes = vnTime.getMinutes();
  
  // Map trực tiếp với index của mảng thời gian (0:00 -> 23:45)
  const row = (hours * 4) + Math.floor(minutes / 15) + 3;
  
  // Format thời gian để log
  const timeString = `${hours.toString().padStart(2, '0')}:${(Math.floor(minutes/15)*15).toString().padStart(2, '0')}:00`;
  
  console.log(`=== Thông tin thời gian ===`);
  console.log(`Thời gian hiện tại: ${timeString}`);
  console.log(`Dòng tương ứng: ${row}`);
  
  // Kiểm tra giới hạn dòng
  if (row < 3 || row > 98) {
    console.error(`Dòng ${row} nằm ngoài khoảng cho phép (3-98)`);
    return null;
  }
  
  return row;
}

// Hàm ghi dữ liệu vào sheets
async function writeToSheets(auth, results) {
  const sheets = google.sheets({ version: 'v4', auth });
  const column = getCurrentColumn();
  const row = getCurrentRow();
  
  console.log(`=== Thông tin ghi dữ liệu ===`);
  console.log(`Vị trí ghi: Cột ${column}, Dòng ${row}`);
  
  if (row > 98) {
    console.error('Row number exceeds limit');
    return;
  }

  for (const result of results) {
    const sheetName = SHEETS[result.itemName];
    // Sửa xử lý giá trị
    const value = result.profitPerEnergy
      .replace('/E', '') // Xóa /E
      .trim() // Xóa khoảng trắng
      .replace("'", '') // Xóa dấu ' nếu có
      .replace(/^\s*['"]?|['"]?\s*$/g, ''); // Xóa dấu quote và khoảng trắng ở đầu/cuối
    
    const range = `${sheetName}!${column}${row}`;

    try {
      console.log(`Attempting to write to ${range}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: [[Number(value)]] // Chuyển đổi sang số
        }
      });
      console.log(`Đã ghi ${value} vào ${sheetName} tại ${column}${row}`);
    } catch (error) {
      console.error(`Lỗi khi ghi vào ${sheetName}!${column}${row}:`, error.message);
    }
  }
}

// Đọc từ GitHub Secrets thay vì sử dụng tệp cục bộ
const CREDENTIALS_JSON = process.env.GOOGLE_CREDENTIALS_JSON; // Đọc từ biến môi trường
console.log(process.env.GOOGLE_CREDENTIALS_JSON);

// Hàm xác thực Google Sheets
async function authenticateGoogleSheets() {
  try {
    // Read credentials from file
    const credentialsJson = fs.readFileSync('credentials.json', 'utf8');
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      console.error('Failed to parse credentials:', error);
      throw error;
    }

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Invalid credentials format');
    }

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    await auth.authorize();
    console.log('Authentication successful');
    return auth;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Helper function để chuyển số thành chữ cái cột
function getColumnLetter(columnNumber) {
  let dividend = columnNumber;
  let columnName = '';
  let modulo;

  while (dividend > 0) {
    modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - 1) / 26);
  }

  return columnName;
}

// Hàm ghi dữ liệu vào Google Sheets
async function writeToSheets(auth, results) {
  const sheets = google.sheets({ version: 'v4', auth });
  const column = getCurrentColumn();
  const row = getCurrentRow();

  if (row > 98) {
    console.error('Row number exceeds limit');
    return;
  }

  for (const result of results) {
    const sheetName = SHEETS[result.itemName];
    // Sửa xử lý giá trị
    const value = result.profitPerEnergy
      .replace('/E', '') // Xóa /E
      .trim() // Xóa khoảng trắng
      .replace("'", '') // Xóa dấu ' nếu có
      .replace(/^\s*['"]?|['"]?\s*$/g, ''); // Xóa dấu quote và khoảng trắng ở đầu/cuối
    
    const range = `${sheetName}!${column}${row}`;

    try {
      console.log(`Attempting to write to ${range}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: [[Number(value)]] // Chuyển đổi sang số
        }
      });
      console.log(`Đã ghi ${value} vào ${sheetName} tại ${column}${row}`);
    } catch (error) {
      console.error(`Lỗi khi ghi vào ${sheetName}!${column}${row}:`, error.message);
    }
  }
}

// Hàm truy cập và ghi dữ liệu từ trang web
async function fetchAndLogData() {
  console.log('Bắt đầu truy cập trang web...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',  // Chỉ định đường dẫn tới Chrome
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage' // Add this
    ]
  });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0');
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
      request.abort();
    } else {
      request.continue();
    }
  });

  async function processPage() {
    try {
      await page.goto('https://www.pixels.tips/crafting', { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 90000 
      });
      
      await new Promise(resolve => setTimeout(resolve, 8000));

      console.log('Đợi tiêu đề hiển thị...');
      await page.waitForSelector('#woodwork', {
        visible: true,
        timeout: 90000
      });

      try {
        await page.click('div.col-span-4 button');
        
        await page.evaluate(() => {
          function setValueToElement(selector, value) {
            const element = document.querySelector(selector);
            if (element) {
              element.value = value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        
          setInterval(() => {
            setValueToElement("#marketplace-fee-input", "19");
          }, 1000);
        });
      } catch (error) {
        console.error('Lỗi:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      await new Promise(resolve => setTimeout(resolve, 2000));
      const results = await page.evaluate(() => {
        const targetItems = ["Whittlewood Plank", "Craftbark Plank"];
        const items = [];
        const seenItems = new Set();

        document.querySelectorAll('tr').forEach(row => {
          const nameCell = row.querySelector('[data-key="itemId"]');
          const profitCell = row.querySelector('[data-key="profitPerEnergy"]');
          
          if (nameCell && profitCell) {
            const name = nameCell.textContent.trim();
            const profit = profitCell.textContent.trim();
            
            if (targetItems.includes(name) && !seenItems.has(name) && profit) {
              seenItems.add(name);
              items.push({
                itemName: name,
                profitPerEnergy: profit
              });
            }
          }
        });
        
        return items;
      });

      if (results.length === 0 || results.some(item => !item.profitPerEnergy)) {
        console.log('Không tìm thấy giá trị profitPerEnergy, đang thử lại...');
        await processPage(); // Gọi lại nếu không có kết quả
        return;
      }

      console.log('Tìm thấy:', results);
      
      if (results.length > 0) {
        const auth = await authenticateGoogleSheets();
        await writeToSheets(auth, results);
      }
      
    } catch (error) {
      console.error('Lỗi:', error);
      await processPage(); // Thử lại nếu có lỗi
    }
  }

  try {
    await processPage();
  } finally {
    await browser.close();
  }
}

console.log('Bắt đầu quy trình...');
fetchAndLogData();
