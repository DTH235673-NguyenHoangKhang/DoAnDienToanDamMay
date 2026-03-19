var express = require('express');
var router = express.Router();
var DinhDang = require('../models/dinhdang');
// GET: Danh sách 
router.get('/', async (req, res) => {
    var dd=await DinhDang.find();
    res.render('dinhdang', {
        title: 'Danh sách định dạng',
        dinhdang: dd
    });
});
// GET: Thêm 
router.get('/them', async (req, res) => {
     res.render('dinhdang_them', {
        title: 'Thêm định dạng'
    });
});
// POST: Thêm 
router.post('/them', async (req, res) => {
    var data=
        {
            TenDinhDang: req.body.TenDinhDang
        }
        await DinhDang.create(data);
        res.redirect('/dinhdang');
});
// GET: Sửa
router.get('/sua/:id', async (req, res) => {
    var id=req.params.id;
    var dd=await DinhDang.findById(id);
    res.render('dinhdang_sua', {
        title: 'Sửa định dạng',
        dinhdang: dd
    });
});
// POST: Sửa 
router.post('/sua/:id', async (req, res) => {
    var id=req.params.id;
        var data=
        {
            TenDinhDang: req.body.TenDinhDang
        }
    await DinhDang.findByIdAndUpdate(id,data);
    res.redirect('/dinhdang');
});
// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    var id=req.params.id;
    await DinhDang.findByIdAndDelete(id);
    res.redirect('/dinhdang');
});
module.exports = router;