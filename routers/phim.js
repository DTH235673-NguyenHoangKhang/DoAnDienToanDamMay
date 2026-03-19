var express = require('express');
var router = express.Router();
var Phim = require('../models/phim');
var TheLoai = require('../models/theloai');

// GET: Danh sách 
router.get('/', async (req, res) => {
    var p=await Phim.find();
    res.render('phim', {
        title: 'Danh sách phim',
        phim: p
    });
});
// GET: Thêm 
router.get('/them', async (req, res) => {
    try {
        const listTheLoai = await TheLoai.find(); 
        const listDinhDang = await DinhDang.find();

        res.render('phim_them', {
            title: 'Thêm Phim Mới',
            theloais: listTheLoai,     // Gửi mảng thể loại sang view
            dinhdangs: listDinhDang    // Gửi mảng định dạng sang view
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});
// POST: Thêm 
router.get('/phim/them', async (req, res) => {
    var data=
    {
        TenPhim: req.body.TenPhim,
        TheLoai: req.body.TheLoai,
        DinhDang: req.body.DinhDang
    }
    await Phim.create(data);
    res.redirect('/phim');
});
// GET: Sửa 
router.get('/sua/:id', async (req, res) => {
    var id=req.params.id;
    var tl=await Phim.findById(id);
    const listTheLoai = await TheLoai.find(); 
    const listDinhDang = await DinhDang.find();
    res.render('phim_sua', {
        title: 'Sửa phim',
        phim: tl,
        theloais: listTheLoai,     
        dinhdangs: listDinhDang 
    });
});
// POST: Sửa
router.post('/sua/:id', async (req, res) => {
    var id=req.params.id;
    var data=
    {
        TenPhim: req.body.TenPhim,
        TheLoai: req.body.TheLoai,
        DinhDang: req.body.DinhDang
    }
    await Phim.findByIdAndUpdate(id,data);
    res.redirect('/phim');
});
// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    var id=req.params.id;
    await Phim.findByIdAndDelete(id);
    res.redirect('/phim');
});
module.exports = router;