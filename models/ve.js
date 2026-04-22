const mongoose = require('mongoose');
const veSchema = new mongoose.Schema({
    SuatChieu: { type: mongoose.Schema.Types.ObjectId, ref: 'SuatChieu' },
    Taikhoan: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan' },
    DanhSachGhe: [String], 
    TongTien: Number,
    MaGiaoDich: String, // app_trans_id gửi sang ZaloPay
    TrangThai: { type: Number, default: 0 }, // 0: Chờ, 1: Thành công
    LoyaltySD: { type: Number, default: 0 }, // Điểm Loyalty đã sử dụng
    NgayDat: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Ve', veSchema);