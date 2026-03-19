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
router.get('/phim/them', async (req, res) => {
    try {
        const listTheLoai = await TheLoai.find(); 
        const listDinhDang = await DinhDang.find();

        res.render('ten_file_cua_ban', {
            title: 'Thêm Phim Mới',
            theloais: listTheLoai,     // Gửi mảng thể loại sang view
            dinhdangs: listDinhDang    // Gửi mảng định dạng sang view
        });
         await Phim.create(data);
        res.redirect('/phim');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
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
     try {
        const listTheLoai = await TheLoai.find(); 
        const listDinhDang = await DinhDang.find();

        res.render('ten_file_cua_ban', {
            title: 'Thêm Phim Mới',
            theloais: listTheLoai,     // Gửi mảng thể loại sang view
            dinhdangs: listDinhDang    // Gửi mảng định dạng sang view
        });
         await Phim.findByIdAndUpdate(data);
        res.redirect('/phim');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});
// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    var id=req.params.id;
    await Phim.findByIdAndDelete(id);
    res.redirect('/phim');
});
module.exports = router;