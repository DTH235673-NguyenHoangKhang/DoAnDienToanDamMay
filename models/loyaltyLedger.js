var mongoose = require('mongoose');
var loyaltyLedgerSchema = new mongoose.Schema({
  TaiKhoan: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan' },
  SoDiem: Number,
  HanhDong: String, // "REWARD" (Cộng) hoặc "REDEEM" (Dùng)
  Timestamp: { type: Date, default: Date.now },
  PreviousHash: String, // Mã băm của bản ghi trước đó
  Hash: String          // Mã băm của bản ghi hiện tại
});
module.exports = mongoose.model('LoyaltyLedger', loyaltyLedgerSchema);