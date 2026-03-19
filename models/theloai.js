var mongoose = require('mongoose');
var theLoaiSchema = new mongoose.Schema({
 TenTheLoai: { type: String, unique: true, required: true }
});
var theLoaiModel = mongoose.model('TheLoai', theLoaiSchema);
module.exports = theLoaiModel;