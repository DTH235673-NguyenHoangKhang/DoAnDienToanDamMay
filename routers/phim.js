var express = require('express');
var router = express.Router();
var Phim = require('../models/phim');
var TheLoai = require('../models/theloai');
var DinhDang = require('../models/dinhdang');
var SuatChieu = require('../models/suatchieu');

const multer = require('multer');

// Cấu hình nơi lưu trữ file
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Sử dụng path.join để đảm bảo đường dẫn luôn đúng với thư mục dự án
        const dest = path.resolve(__dirname, '..', 'public', 'images');
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        // Giữ tên gốc như bạn mong muốn
        cb(null, file.originalname); 
    }
});const upload = multer({ storage: storage });
// GET: Danh sách 
router.get('/', async (req, res) => {
    try {
        var p = await Phim.find()
                         .populate('TheLoai')
                         .populate('DinhDang');
                         
        res.render('phim', {
            title: 'Danh sách phim',
            phim: p
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi tải danh sách phim");
    }
});

// GET: Thêm 
router.get('/them', async (req, res) => {
    try {
        const listTheLoai = await TheLoai.find(); 
        const listDinhDang = await DinhDang.find();

        res.render('phim_them', {
            title: 'Thêm Phim Mới',
            theloais: listTheLoai,
            dinhdangs: listDinhDang,
            error: null,
            oldData: {}
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// POST: Thêm 
router.post('/them', upload.single('poster'), async (req, res) => {
    try {
        const { TenPhim, TheLoai: theLoaiId, DinhDang: dinhDangId } = req.body;
        const poster = req.file ? '/images/' + req.file.filename : '';
        // 1. Kiểm tra trùng tên phim
        const isExisted = await Phim.findOne({ TenPhim: TenPhim });

        if (isExisted) {
            const listTheLoai = await TheLoai.find();
            const listDinhDang = await DinhDang.find();
            return res.render('phim_them', {
                title: 'Thêm Phim Mới',
                theloais: listTheLoai,
                dinhdangs: listDinhDang,
                error: "Lỗi: Tên phim này đã tồn tại trong hệ thống!",
                oldData: req.body
            });
        }

        await Phim.create({
            TenPhim: TenPhim,
            poster: poster,
            TheLoai: theLoaiId,
            DinhDang: dinhDangId
        });
        res.redirect('/phim');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// GET: Sửa 
router.get('/sua/:id', async (req, res) => {
    try {
        var id = req.params.id;
        var tl = await Phim.findById(id);
        const listTheLoai = await TheLoai.find(); 
        const listDinhDang = await DinhDang.find();
        res.render('phim_sua', {
            title: 'Sửa phim',
            phim: tl,
            poster: tl.poster,
            theloais: listTheLoai, 
            dinhdangs: listDinhDang,
            error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// POST: Sửa
router.post('/sua/:id', upload.single('poster'), async (req, res) => {
    try {
        var id = req.params.id;
        const { TenPhim, TheLoai: theLoaiId, DinhDang: dinhDangId } = req.body;
        const poster = req.file ? '/images/' + req.file.filename : req.body.poster;

        // 1. Kiểm tra trùng tên (loại trừ chính phim đang sửa)
        const isExisted = await Phim.findOne({ 
            TenPhim: TenPhim, 
            _id: { $ne: id } 
        });

        if (isExisted) {
            const listTheLoai = await TheLoai.find();
            const listDinhDang = await DinhDang.find();
            return res.render('phim_sua', {
                title: 'Sửa phim',
                phim: { _id: id, TenPhim, poster, TheLoai: theLoaiId, DinhDang: dinhDangId },
                theloais: listTheLoai,
                dinhdangs: listDinhDang,
                error: "Lỗi: Tên phim này đã trùng với một phim khác!"
            });
        }

        await Phim.findByIdAndUpdate(id, {
            TenPhim: TenPhim,
            poster: poster,
            TheLoai: theLoaiId,
            DinhDang: dinhDangId
        });
        res.redirect('/phim');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    var id = req.params.id;
    const suatChieuCount = await SuatChieu.countDocuments({ Phim: id });

    if (suatChieuCount > 0) {
        return res.status(400).send("Không thể xóa phim này vì còn suất chiếu liên quan.");
    }
    await Phim.findByIdAndDelete(id);
    res.redirect('/phim');
});

module.exports = router;