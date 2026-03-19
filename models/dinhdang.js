var mongoose = require('mongoose');
var dinhDangSchema = new mongoose.Schema({
 TenDinhDang: { type: String, unique: true, required: true }
});
var dinhDangModel = mongoose.model('DinhDang', dinhDangSchema);
module.exports = dinhDangModel;