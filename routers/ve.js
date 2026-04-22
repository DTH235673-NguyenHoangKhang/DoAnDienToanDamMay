var express = require('express');
var router = express.Router();
var Ve = require('../models/ve');

// GET: Danh sách 
router.get('/', async (req, res) => {
    try {
        var tl = await Ve.find({Taikhoan: req.session.MaNguoiDung}).populate('SuatChieu');
        res.render('ve', {
            title: 'Lịch sử mua vé',
            ve: tl
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});


module.exports = router;