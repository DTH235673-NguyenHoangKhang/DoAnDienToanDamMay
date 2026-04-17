var express = require('express');
var router = express.Router();
var DinhDang = require('../models/dinhdang');

// GET: Danh sách 
router.get('/', async (req, res) => {
    var dd = await DinhDang.find();
    res.render('dinhdang', {
        title: 'Danh sách định dạng',
        dinhdang: dd
    });
});

// GET: Thêm 
router.get('/them', (req, res) => {
     res.render('dinhdang_them', {
        title: 'Thêm định dạng',
        error: null,
        oldData: {}
    });
});

// POST: Thêm 
router.post('/them', async (req, res) => {
    try {
        const { TenDinhDang } = req.body;

        // 1. Kiểm tra xem tên định dạng đã tồn tại chưa
        const isExisted = await DinhDang.findOne({ TenDinhDang: TenDinhDang });

        if (isExisted) {
            return res.render('dinhdang_them', {
                title: 'Thêm định dạng',
                error: "Lỗi: Tên định dạng này đã tồn tại!",
                oldData: req.body
            });
        }

        await DinhDang.create({ TenDinhDang });
        res.redirect('/dinhdang');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// GET: Sửa
router.get('/sua/:id', async (req, res) => {
    var id = req.params.id;
    var dd = await DinhDang.findById(id);
    res.render('dinhdang_sua', {
        title: 'Sửa định dạng',
        dinhdang: dd,
        error: null
    });
});

// POST: Sửa 
router.post('/sua/:id', async (req, res) => {
    try {
        var id = req.params.id;
        const { TenDinhDang } = req.body;

        // 1. Kiểm tra trùng (loại trừ chính bản ghi đang sửa)
        const isExisted = await DinhDang.findOne({ 
            TenDinhDang: TenDinhDang, 
            _id: { $ne: id } 
        });

        if (isExisted) {
            return res.render('dinhdang_sua', {
                title: 'Sửa định dạng',
                dinhdang: { _id: id, TenDinhDang },
                error: "Lỗi: Tên định dạng này đã tồn tại!"
            });
        }

        await DinhDang.findByIdAndUpdate(id, { TenDinhDang });
        res.redirect('/dinhdang');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    var id = req.params.id;
    await DinhDang.findByIdAndDelete(id);
    res.redirect('/dinhdang');
});

module.exports = router;