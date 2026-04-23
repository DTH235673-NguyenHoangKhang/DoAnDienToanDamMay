var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');
var Ve = require('../models/ve');

// GET: Tài khoản
router.get('/', async (req, res) => {
    var tk = await TaiKhoan.find();
    res.render('taikhoan', {
        title: 'Danh sách tài khoản',
        taikhoan: tk
    });
});

// GET: Thêm 
router.get('/them', (req, res) => {
     res.render('taikhoan_them', {
        title: 'Thêm tài khoản',
        error: null,
        oldData: {}
    });
});

// POST: Thêm 
router.post('/them', async (req, res) => {
    var salt=bcrypt.genSaltSync(10);
    var data=
    {
        HoVaTen: req.body.HoVaTen,
        Email: req.body.Email,
        TenDangNhap: req.body.TenDangNhap,
        MatKhau: bcrypt.hashSync(req.body.MatKhau, salt)

    }
    await TaiKhoan.create(data);
    res.redirect('/taikhoan');
});

// GET: Sửa
router.get('/sua/:id', async (req, res) => {
    var id = req.params.id;
    var tk = await TaiKhoan.findById(id);
    res.render('taikhoan_sua', {
        title: 'Sửa tài khoản',
        taikhoan: tk,
        error: null
    });
});

// POST: Sửa 
router.post('/sua/:id', async (req, res) => {
    var id = req.params.id;
    var salt=bcrypt.genSaltSync(10);
    var data=
    {
        HoVaTen: req.body.HoVaTen,
        Email: req.body.Email,
        TenDangNhap: req.body.TenDangNhap,
        QuyenHan: req.body.QuyenHan,
        KichHoat: req.body.KichHoat
    };
    if(req.body.MatKhau)
        data['MatKhau']=bcrypt.hashSync(req.body.MatKhau, salt);    
    await TaiKhoan.findByIdAndUpdate(id, data);
    res.redirect('/taikhoan');
});

// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    var id = req.params.id;
    const veCount = await Ve.countDocuments({ Taikhoan: id });

    if (veCount > 0) {
        return res.status(400).send("Không thể xóa tài khoản này vì còn vé liên quan.");
    }
    await TaiKhoan.findByIdAndDelete(id);
    res.redirect('/taikhoan');
});
router.get('/lichsuve/:id', async (req, res) => {
    try {
        const danhSachVe = await Ve.find({ Taikhoan: req.params.id, TrangThai: 1 })
            .populate({
                path: 'SuatChieu', // Tên field trong Model Ve
                populate: [
                    { path: 'Phim', select: 'TenPhim' }, // Lấy tên phim từ Model Phim
                    { path: 'PhongChieu', select: 'TenPhongChieu' } // Lấy tên phòng từ Model Phong
                ]
            })
            .sort({ NgayDat: -1 });
        res.render('lichsuve', {
            title: 'Lịch sử mua vé',
            ve: danhSachVe,
            taikhoan: await TaiKhoan.findById(req.params.id)
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

module.exports = router;