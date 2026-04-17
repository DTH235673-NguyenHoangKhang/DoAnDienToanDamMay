var express = require('express');
var router = express.Router();
var SuatChieu = require('../models/suatchieu');
var Phim = require('../models/phim');
var PhongChieu = require('../models/phongchieu');
// GET: Danh sách 
router.get('/', async (req, res) => {
    try {
            var p = await SuatChieu.find()
                         .populate('Phim')
                         .populate('PhongChieu');
                         
            res.render('suatchieu', {
                title: 'Danh sách suất chiếu',
                suatchieu: p
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi tải danh sách suất chiếu");
        }
        
});
async function checkConstraints(reqBody) {
    const { start, end, NgayChieu } = reqBody;
    if (!start || !end || !NgayChieu) return "Vui lòng nhập đầy đủ thông tin.";

    // Chuyển "HH:mm" thành số phút để so sánh chính xác
    const timeToMinutes = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    // 1. Kiểm tra Giờ bắt đầu phải trước Giờ kết thúc
    if (startMin >= endMin) {
        return "Lỗi: Giờ bắt đầu phải trước giờ kết thúc.";
    }

    // 2. Kiểm tra Ngày chiếu (Phải dùng local time để tránh lệch múi giờ)
    const [year, month, day] = NgayChieu.split('-').map(Number);
    const inputDate = new Date(year, month - 1, day); 
    inputDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inputDate <= today) {
        return "Lỗi: Ngày chiếu phải từ ngày mai.";
    }

    return null; 
}// GET: Thêm 
router.get('/them', async (req, res) => {
    try {
            const listPhim = await Phim.find(); 
            const listPhongChieu = await PhongChieu.find();
    
            res.render('suatchieu_them', {
                title: 'Thêm Suất Chiếu',
                phims: listPhim,
                phongchieus: listPhongChieu,
                error: null,    
                oldData: {}
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi server");
        }
    });

// POST: Thêm 
router.post('/them', async (req, res) => {
    try {
        const { start, end, Phim: phimId, PhongChieu: phongId, NgayChieu } = req.body;

        // BƯỚC 1: Kiểm tra ràng buộc (Giờ bắt đầu < Giờ kết thúc, Ngày tương lai)
        const constraintError = await checkConstraints(req.body);
        if (constraintError) {
            const listPhim = await Phim.find();
            const listPhongChieu = await PhongChieu.find();
            return res.render('suatchieu_them', {
                title: 'Thêm Suất Chiếu',
                phims: listPhim,
                phongchieus: listPhongChieu,
                error: constraintError,
                oldData: req.body
            });
        }

        // BƯỚC 2: Kiểm tra trùng lịch (So sánh trực tiếp chuỗi String)
        const isExisted = await SuatChieu.findOne({
            NgayChieu: NgayChieu,
            PhongChieu: phongId,
            $or: [
                { 
                    start: { $lt: end }, 
                    end: { $gt: start } 
                }
            ]
        });

        if (isExisted) {
            const listPhim = await Phim.find();
            const listPhongChieu = await PhongChieu.find();
            return res.render('suatchieu_them', {
                title: 'Thêm Suất Chiếu',
                phims: listPhim,
                phongchieus: listPhongChieu,
                error: "Lỗi: Phòng này đã có lịch chiếu trong khoảng thời gian này!",
                oldData: req.body
            });
        }

        // BƯỚC 3: Lưu vào DB (Lưu start và end là chuỗi "HH:mm")
        await SuatChieu.create({ 
            start, 
            end, 
            Phim: phimId, 
            PhongChieu: phongId, 
            NgayChieu 
        });
        
        res.redirect('/suatchieu');
    } catch (err) {
        console.error("Lỗi tại POST /them:", err);
        res.status(500).send("Lỗi server: " + err.message);
    }
});
// GET: Sửa 
router.get('/sua/:id', async (req, res) => {
    var id=req.params.id;
        var tl=await SuatChieu.findById(id);
        const listPhim = await Phim.find(); 
        const listPhongChieu = await PhongChieu.find();
        res.render('suatchieu_sua', {
            title: 'Sửa suất chiếu',
            suatchieu: tl,
            phims: listPhim,
            phongchieus: listPhongChieu
        });
});
// POST: Sửa
router.post('/sua/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { start, end, Phim: phimId, PhongChieu: phongId, NgayChieu } = req.body;

        const constraintError = await checkConstraints(req.body);
        if (constraintError) {
            const listPhim = await Phim.find();
            const listPhongChieu = await PhongChieu.find();
            return res.render('suatchieu_sua', {
                title: 'Sửa Suất Chiếu',
                phims: listPhim,
                phongchieus: listPhongChieu,
                error: constraintError,
                suatchieu: { _id: id, ...req.body }
            });
        }

        // BƯỚC 2: Kiểm tra trùng lịch (Dùng String so sánh như route Thêm)
        const isExisted = await SuatChieu.findOne({
            _id: { $ne: id },
            NgayChieu: NgayChieu,
            PhongChieu: phongId,
            $or: [{ start: { $lt: end }, end: { $gt: start } }]
        });

        if (isExisted) {
            // ... render lại trang sửa với lỗi trùng lịch ...
        }

        await SuatChieu.findByIdAndUpdate(id, { start, end, Phim: phimId, PhongChieu: phongId, NgayChieu });
        res.redirect('/suatchieu');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});
// GET: Xóa 
router.get('/xoa/:id', async (req, res) => {
    var id=req.params.id;
    await SuatChieu.findByIdAndDelete(id);
    res.redirect('/suatchieu');
});
module.exports = router;