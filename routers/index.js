var express = require('express');
var router = express.Router();
var Phim = require('../models/phim');
var SuatChieu = require('../models/suatchieu'); // Giả sử bạn có model này

router.get('/', async (req, res) => {
    try {
        // 1. Xử lý chọn ngày (mặc định là ngày hiện tại)
        let ngayChon = req.query.ngay || new Date().toISOString().split('T')[0];

        // 2. Tạo danh sách 7 ngày để hiện thanh cuộn
        let dsNgay = [];
        for (let i = 0; i < 7; i++) {
            let d = new Date();
            d.setDate(d.getDate() + i);
            dsNgay.push(d.toISOString().split('T')[0]);
        }

        // 3. Lấy danh sách phim
        const phim = await Phim.find();

        // 4. Lấy suất chiếu của ngày đã chọn và populate thông tin phim
        // Giả sử model SuatChieu có trường 'NgayChieu' và 'IdPhim'
        const suatChieu = await SuatChieu.find({ NgayChieu: ngayChon });

        res.render('index', {
            title: 'Lịch Chiếu',
            phim: phim,
            suatChieu: suatChieu,
            dsNgay: dsNgay,
            ngayChon: ngayChon,
            tuKhoa: '',
            session: req.session || {}
        });
    } catch (error) {
        res.send("Lỗi: " + error.message);
        
    }
});
// GET: Lỗi
router.get('/error', async (req, res) => {
    res.render('error', {
        title: 'Lỗi'
    });
});
// GET: Thành công
router.get('/success', async (req, res) => {
    res.render('success', {
        title: 'Hoàn thành'
    });
});
router.get('/timkiem', async (req, res) => {
    try {
        const tukhoa = req.query.tukhoa;
        
        // 1. Lấy ngày hôm nay định dạng YYYY-MM-DD
        const homNay = new Date().toLocaleDateString('sv-SE'); 

        // 2. Tìm phim
        const phimTimKiem = await Phim.find({ TenPhim: new RegExp(tukhoa, 'i') });

        // 3. Render với danh sách ngày chỉ chứa đúng hôm nay
        res.render('index', {
            title: 'Kết quả tìm kiếm: ' + tukhoa,
            phim: phimTimKiem,
            dsNgay: [homNay],        // Chỉ có 1 ngày duy nhất
            ngayChon: homNay,       // Mặc định chọn ngày hôm nay
            suatChieu: [],          // Hoặc query SuatChieu nếu cần
            tuKhoa: tukhoa,
            session: req.session || {}
        });
    } catch (error) {
        res.status(500).send("Lỗi: " + error.message);
    }
});module.exports = router;