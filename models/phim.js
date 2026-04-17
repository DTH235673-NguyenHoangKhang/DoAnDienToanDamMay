var mongoose = require('mongoose');
var phimSchema = new mongoose.Schema({
 TenPhim: { type: String, unique: true, required: true },
 poster: { type: String, required: true },
 TheLoai: { type: mongoose.Schema.Types.ObjectId, ref: 'TheLoai' },
 DinhDang: { type: mongoose.Schema.Types.ObjectId, ref: 'DinhDang' }
});
var phimModel = mongoose.model('Phim', phimSchema);
module.exports = phimModel;