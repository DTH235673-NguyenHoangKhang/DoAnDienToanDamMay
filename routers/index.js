var express = require('express');
var router = express.Router();
// GET: Trang chủ
router.get('/', async (req, res) => {
 res.render('index', {
 title: 'Trang chủ'
 });
});
// GET: Lỗi
router.get('/error', async (req, res) => {
 res.render('error', {
 title: 'Lỗi'
 });
});
// GET: Thành công
router.get('/success', async (req, res) => {
 res.render('success', {
 title: 'Hoàn thành'
 });
});
module.exports = router;