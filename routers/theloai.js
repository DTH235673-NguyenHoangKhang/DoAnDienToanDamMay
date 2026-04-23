var express = require('express');
var router = express.Router();
var TheLoai = require('../models/theloai');
var Phim = require('../models/phim');

// GET: Danh sách 
router.get('/', async (req, res) => {
    try {
        var tl = await TheLoai.find();
        res.render('theloai', {
            title: 'Danh sách thể loại',
            theloai: tl
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// GET: Thêm 
router.get('/them', (req, res) => {
    res.render('theloai_them', {
        title: 'Thêm thể loại',
        error: null,
        oldData: {}
    });
});

// POST: Thêm 
router.post('/them', async (req, res) => {
    try {
        const { TenTheLoai } = req.body;

        // 1. Kiểm tra trùng tên thể loại
        const isExisted = await TheLoai.findOne({ TenTheLoai: TenTheLoai });

        if (isExisted) {
            return res.render('theloai_them', {
                title: 'Thêm thể loại',
                error: "Lỗi: Tên thể loại này đã tồn tại!",
                oldData: req.body
            });
        }

        await TheLoai.create({ TenTheLoai });
        res.redirect('/theloai');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// GET: Sửa 
router.get('/sua/:id', async (req, res) => {
    try {
        var id = req.params.id;
        var tl = await TheLoai.findById(id);
        res.render('theloai_sua', {
            title: 'Sửa thể loại',
            theloai: tl,
            error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// POST: Sửa
router.post('/sua/:id', async (req, res) => {
    try {
        var id = req.params.id;
        const { TenTheLoai } = req.body;

        // 1. Kiểm tra trùng (loại trừ chính nó)
        const isExisted = await TheLoai.findOne({ 
            TenTheLoai: TenTheLoai, 
            _id: { $ne: id } 
        });

        if (isExisted) {
            return res.render('theloai_sua', {
                title: 'Sửa thể loại',
                theloai: { _id: id, TenTheLoai },
                error: "Lỗi: Tên thể loại này đã tồn tại!"
            });
        }

        await TheLoai.findByIdAndUpdate(id, { TenTheLoai });
        res.redirect('/theloai');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    try {
        var id = req.params.id;
        const phimCount = await Phim.countDocuments({ TheLoai: id });

        if (phimCount > 0) {
            return res.status(400).send("Không thể xóa thể loại này vì còn phim liên quan.");
        }

        await TheLoai.findByIdAndDelete(id);
        res.redirect('/theloai');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

module.exports = router;