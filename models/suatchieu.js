var mongoose = require('mongoose');
var suatChieuSchema = new mongoose.Schema({
 start: { type: String, required: true },
 end: { type: String, required: true },
 Phim: { type: mongoose.Schema.Types.ObjectId, ref: 'Phim' },
 PhongChieu: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongChieu' },
 NgayChieu: { type: Date, required: true },
});
var suatChieuModel = mongoose.model('SuatChieu', suatChieuSchema);
module.exports = suatChieuModel;