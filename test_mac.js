const crypto = require('crypto');
const key1 = "sdngY6n6m9VAtSjYwP39599B62G60zAs"; // Gõ tay, không copy
const app_id = "2553";

// Lấy dữ liệu từ log lỗi gần nhất của bạn để đối chứng
const app_trans_id = "260422_bc3e1b7b"; // Thay bằng id trong log của bạn
const app_user = "69e63e1b496c39a3eb38296d";
const amount = 65000;
const app_time = 1776833511050; // Thay bằng time trong log của bạn
const embed_data = "{}";
const item = "[]";

const data = `${app_id}|${app_trans_id}|${app_user}|${amount}|${app_time}|${embed_data}|${item}`;
const mac = crypto.createHmac('sha256', key1).update(data).digest('hex');

console.log("Chuỗi băm test:", data);
console.log("MAC tính toán được:", mac);