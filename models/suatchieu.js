var mongoose = require('mongoose');
var suatChieuSchema = new mongoose.Schema({
 start: { type: String, unique: true, required: true },
 end: { type: String, unique: true, required: true },
 Phim: { type: mongoose.Schema.Types.ObjectId, ref: 'Phim' },
 PhongChieu: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongChieu' },
 NgayChieu: { type: Date, required: true },
});
var suatChieuModel = mongoose.model('suatChieu', suatChieuSchema);
module.exports = suatChieuModel;