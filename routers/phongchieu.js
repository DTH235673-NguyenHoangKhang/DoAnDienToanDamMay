var express = require('express');
var router = express.Router();
var PhongChieu = require('../models/phongchieu');
// GET: Danh sách 
router.get('/', async (req, res) => {
    var pc=await PhongChieu.find();
    res.render('phongchieu', {
        title: 'Danh sách phòng chiếu',
        phongchieu: pc
    });
});
// GET: Thêm 
router.get('/them', async (req, res) => {
    res.render('phongchieu_them', {
        title: 'Thêm phòng chiếu'
    });
});
// POST: Thêm 
router.post('/them', async (req, res) => {
    var data=
    {
        TenPhongChieu: req.body.TenPhongChieu,
        SoLuongGhe: req.body.SoLuongGhe
    }
    await PhongChieu.create(data);
    res.redirect('/phongchieu');
});
// GET: Sửa 
router.get('/sua/:id', async (req, res) => {
    var id=req.params.id;
        var tl=await PhongChieu.findById(id);
        res.render('phongchieu_sua', {
            title: 'Sửa phòng chiếu',
            phongchieu: tl
        });
});
// POST: Sửa
router.post('/sua/:id', async (req, res) => {
     var id=req.params.id;
    var data=
    {
        TenPhongChieu: req.body.TenPhongChieu,
        SoLuongGhe: req.body.SoLuongGhe
    }
    await PhongChieu.findByIdAndUpdate(id,data);
    res.redirect('/phongchieu');

});
// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    var id=req.params.id;
    await PhongChieu.findByIdAndDelete(id);
    res.redirect('/phongchieu');
});
module.exports = router;