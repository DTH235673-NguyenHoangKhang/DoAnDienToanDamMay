var mongoose = require('mongoose');
var phongChieuSchema = new mongoose.Schema({
 TenPhongChieu: { type: String, unique: true, required: true },
    SoLuongGhe: { type: Number, required: true }
});
var phongChieuModel = mongoose.model('PhongChieu', phongChieuSchema);
module.exports = phongChieuModel;