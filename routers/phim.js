var express = require('express');
var router = express.Router();
var Phim = require('../models/phim');
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
    res.render('phim_them', {
        title: 'Thêm phim'
    });
});
// POST: Thêm 
router.post('/them', async (req, res) => {
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
    res.render('phim_sua', {
        title: 'Sửa phim',
        phim: tl
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