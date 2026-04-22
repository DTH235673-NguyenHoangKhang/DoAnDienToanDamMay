var express = require('express');
var router = express.Router();
var Phim = require('../models/phim');
var SuatChieu = require('../models/suatchieu'); // Giả sử bạn có model này
var Ve = require('../models/ve'); 
var PhongChieu = require('../models/phongchieu'); // Giả sử bạn có model này
const axios = require('axios');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const qs = require('qs');
const crypto = require('crypto');

// Import thêm các model còn thiếu
const LoyaltyLedger = require('../models/loyaltyLedger');
const TaiKhoan = require('../models/taikhoan');
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
        const phim = await Phim.find().populate('TheLoai').populate('DinhDang');

        // 4. Lấy suất chiếu của ngày đã chọn và populate thông tin phim
        // Giả sử model SuatChieu có trường 'NgayChieu' và 'IdPhim'
        const suatChieu = await SuatChieu.find({ NgayChieu: ngayChon }).populate('Phim');
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

        // 2. Tìm phim theo từ khóa
        const phimTimKiem = await Phim.find({ TenPhim: new RegExp(tukhoa, 'i') });

        // 3. Lấy danh sách ID của các phim tìm được
        const idsPhim = phimTimKiem.map(p => p._id);

        // 4. Tìm các suất chiếu của những phim này trong ngày hôm nay
        // Lưu ý: Trường 'Phim' phải khớp với tên field trong Model SuatChieu của bạn
        const suatChieuTimKiem = await SuatChieu.find({ 
            Phim: { $in: idsPhim }, 
            NgayChieu: homNay 
        });

        // 5. Render lại trang index
        res.render('index', {
            title: 'Kết quả tìm kiếm: ' + tukhoa,
            phim: phimTimKiem,
            dsNgay: [homNay],        
            ngayChon: homNay,       
            suatChieu: suatChieuTimKiem, // Thay [] bằng kết quả vừa tìm được
            tuKhoa: tukhoa,
            session: req.session || {}
        });
    } catch (error) {
        res.status(500).send("Lỗi: " + error.message);
    }
});
// Hàm kiểm tra xem người dùng đã đăng nhập chưa
function kiemTraDangNhap(req, res, next) {
    if (req.session && req.session.MaNguoiDung) {
        // Nếu đã có session user, cho phép đi tiếp vào trang đặt vé
        return next();
    } else {
        // Nếu chưa đăng nhập, chuyển hướng về trang đăng nhập
        // Có thể kèm theo thông báo hoặc lưu url để quay lại sau khi login
        res.redirect('/dangnhap'); 
    }
}
// --- 1. Trang hiển thị sơ đồ ghế ---
router.get('/datve/:idSuatChieu', kiemTraDangNhap, async (req, res) => {
    try {
        const idSC = req.params.idSuatChieu;
        
        // Lấy thông tin suất chiếu và phim
        const suatChieu = await SuatChieu.findById(idSC).populate('Phim');
        
        // Lấy danh sách ghế đã bán
        const cacVeDaDat = await Ve.find({ SuatChieu: idSC });
        let gheDaBan = [];
        cacVeDaDat.forEach(ve => {
            gheDaBan = gheDaBan.concat(ve.DanhSachGhe);
        });

        res.render('datve', {
            title: 'Đặt vé: ' + suatChieu.Phim.TenPhim,
            suatChieu: suatChieu,
            gheDaBan: gheDaBan,
            session: req.session
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});
// --- 2. Xử lý lưu vé khi nhấn Thanh toán ---
router.post('/xuly-datve', async (req, res) => {
    try {
        const { idSuatChieu, danhSachGhe, tongTien } = req.body;
        const gheArray = JSON.parse(danhSachGhe);
        const amount = parseInt(tongTien);

        // 1. Thông số cấu hình Sandbox
        const tmnCode = "2QX1X615";
        const secretKey = "97L9A2R8Y441K4V64M00T2Y2W6K1027W";
        const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        const returnUrl = "http://localhost:5000/vnpay_return";

        // 2. Tạo các tham số cơ bản
        let date = new Date();
        let orderId = moment(date).format('DDHHmmss'); // Mã đơn hàng duy nhất

        // Thay đổi dòng tạo createDate
        let vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss'); // Định dạng YYYYMMDDHHmmss

        // Log ra màn hình để kiểm tra trước khi redirect
        console.log("Thời gian gửi đi:", vnp_CreateDate);
        console.log("--- URL GỬI SANG VNPAY ---");
        console.log(finalUrl);
        let vnp_Params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': "2QX1X615",
            'vnp_Locale': 'vn',
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': moment().format('HHmmss'),
            'vnp_OrderInfo': 'Thanh toan ve xem phim',
            'vnp_OrderType': 'other',
            'vnp_Amount': amount * 100,
            'vnp_ReturnUrl': "http://127.0.0.1:5000/vnpay_return", // Thử dùng IP thay vì localhost
            'vnp_IpAddr': '127.0.0.1',
            'vnp_CreateDate': vnp_CreateDate
        };
        // 3. Sắp xếp tham số theo Alphabet (BẮT BUỘC)
        vnp_Params = Object.keys(vnp_Params)
            .sort()
            .reduce((obj, key) => {
                obj[key] = vnp_Params[key];
                return obj;
            }, {});

        // 4. Tạo chữ ký bảo mật (Secure Hash)
        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        
        vnp_Params['vnp_SecureHash'] = signed;

        // 5. Tạo URL cuối cùng và lưu Database
        const finalUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });

        const veMoi = new Ve({
            IdTaiKhoan: req.session.MaNguoiDung || null,
            SuatChieu: idSuatChieu,
            DanhSachGhe: gheArray,
            TongTien: amount,
            MaGiaoDichZalo: orderId, // Bạn có thể đổi tên field này sau
            TrangThai: 0 
        });
        await veMoi.save();

        res.redirect(finalUrl);
    } catch (error) {
        console.error("Lỗi VNPay:", error);
        res.status(500).send("Không thể khởi tạo thanh toán.");
    }
});
router.get('/ketqua-thanhtoan', async (req, res) => {
    try {
        // ZaloPay trả về các tham số trên URL như apptransid, status...
        const { apptransid, status } = req.query;

        // Giả sử status = 1 là thành công (theo Sandbox ZaloPay)
        if (status == "1") {
            // 1. Cập nhật trạng thái vé trong Collection DatVe
                const ve = await Ve.findOneAndUpdate(
                    { MaGiaoDichZalo: apptransid },
                    { TrangThai: 1 },
                    { new: true }
                );

            if (ve) {
                // 2. TÍNH TOÁN LOYALTY (Ví dụ: 5% giá trị vé, 1000đ = 1 điểm)
                const diemCong = Math.floor(ve.TongTien * 0.05 / 1000);

                // 3. LOGIC BLOCKCHAIN GIẢ LẬP TRÊN CLOUD
                // Lấy "Block" cuối cùng trong LoyaltyLedger của User này
                const lastBlock = await LoyaltyLedger.findOne({ IdTaiKhoan: ve.IdTaiKhoan }).sort({ Timestamp: -1 });
                
                const previousHash = lastBlock ? lastBlock.Hash : "0000000000000000"; // Block đầu tiên (Genesis Block) sẽ là "0"
                
                // Tạo Hash cho Block mới (Sử dụng SHA256: PreviousHash + Dữ liệu mới)
                const stringToHash = previousHash + ve.IdTaiKhoan + diemCong + Date.now();
                // Thay dòng 193:
const currentHash = crypto.createHash('sha256').update(stringToHash).digest('hex');
                // Lưu vào Sổ cái Loyalty (Blockchain)
                const newBlock = new LoyaltyLedger({
                    IdTaiKhoan: ve.IdTaiKhoan,
                    SoDiem: diemCong,
                    HanhDong: "REWARD",
                    PreviousHash: previousHash,
                    Hash: currentHash
                });
                await newBlock.save();

                // 4. CẬP NHẬT TỔNG ĐIỂM VÀO TÀI KHOẢN
                await TaiKhoan.findByIdAndUpdate(ve.IdTaiKhoan, {
                    $inc: { DiemLoyalty: diemCong }
                });

                // 5. HIỂN THỊ VÉ THÀNH CÔNG
                res.render('ve', {
                    title: 'Đặt vé thành công',
                    ve: ve,
                    diem: diemCong
                });
            }
        } else {
            res.send("Thanh toán thất bại hoặc đã bị hủy.");
        }
    } catch (error) {
        console.error("Lỗi xác nhận thanh toán:", error);
        res.status(500).send("Lỗi hệ thống khi xử lý vé.");
    }
});
module.exports = router;