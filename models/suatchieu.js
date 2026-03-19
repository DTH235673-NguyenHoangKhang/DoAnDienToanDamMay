var mongoose = require('mongoose');
var suatChieuSchema = new mongoose.Schema({
 start: { type: Date, unique: true, required: true },
 end: { type: Date, unique: true, required: true },
 Phim: { type: mongoose.Schema.Types.ObjectId, ref: 'Phim' },
 PhongChieu: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongChieu' },
});
var suatChieuModel = mongoose.model('suatChieu', suatChieuSchema);
module.exports = suatChieuModel;