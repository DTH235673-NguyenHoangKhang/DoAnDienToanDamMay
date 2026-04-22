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
const bcrypt = require('bcryptjs');
// Import thêm các model còn thiếu
const LoyaltyLedger = require('../models/loyaltyLedger');
const TaiKhoan = require('../models/taikhoan');
// Khai báo bên ngoài hàm để biến có phạm vi toàn cục trong script đó
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
            session: req.session || {},
            taikhoan: req.session.MaNguoiDung ? await TaiKhoan.findById(req.session.MaNguoiDung) : null
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
        const taikhoan = await TaiKhoan.findById(req.session.MaNguoiDung);
        
        // Lấy thông tin suất chiếu và phim
        const suatChieu = await SuatChieu.findById(idSC).populate('Phim');
        
        // Lấy danh sách ghế đã bán
        const cacVeDaDat = await Ve.find({ SuatChieu: idSC ,TrangThai: 1});
        let gheDaBan = [];
        cacVeDaDat.forEach(ve => {
            gheDaBan = gheDaBan.concat(ve.DanhSachGhe);
        });

        res.render('datve', {
            title: 'Đặt vé: ' + suatChieu.Phim.TenPhim,
            suatChieu: suatChieu,
            gheDaBan: gheDaBan,
            taikhoan: taikhoan,
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
        const { idSuatChieu, danhSachGhe, tongTien,diemSuDung } = req.body;
        const orderId = moment().format('DDHHmmss'); // Mã đơn hàng
console.log("Dữ liệu nhận từ Form:", { diemSuDung, tongTien });
        const veMoi = new Ve({
            Taikhoan: req.session.MaNguoiDung || null,
            SuatChieu: idSuatChieu,
            DanhSachGhe: JSON.parse(danhSachGhe),
            TongTien: parseInt(tongTien),
            MaGiaoDich: orderId, // Dùng mã này để đối soát
            LoyaltySD: parseInt(diemSuDung) || 0, // Ban đầu chưa dùng điểm
            TrangThai: 0 
        });
        await veMoi.save();

        // Tạo link VietQR (Thay thông tin ngân hàng của bạn vào đây)
        // Cấu trúc: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>
        const bankId = "ICB"; // Ví dụ: VietinBank
        const accountNo = "0366162702"; // Số tài khoản của bạn
        const template = "qr_only";
        const description = `Thanh toan ve ${orderId}`;
        const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${tongTien}&addInfo=${encodeURIComponent(description)}`;

        // Chuyển hướng sang trang hiển thị QR
        res.render('thanhtoan_qr', { 
            title: 'Thanh toán qua QR', 
            qrUrl: qrUrl, 
            orderId: orderId,
            tongTien: tongTien 
        });
    } catch (error) {
        res.status(500).send("Lỗi: " + error.message);
    }
});
router.get('/xac-nhan-chuyen-khoan/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const veTam = await Ve.findOne({ MaGiaoDich: orderId });
        if (!veTam) return res.send("Đơn hàng không tồn tại.");

        // 2. Kiểm tra xem trong danh sách ghế này có ghế nào đã bị người khác thanh toán chưa
        const veDaTonTai = await Ve.findOne({
            SuatChieu: veTam.SuatChieu,
            TrangThai: 1,
            DanhSachGhe: { $in: veTam.DanhSachGhe } // Kiểm tra trùng lặp ghế
        });

        if (veDaTonTai) {
            return res.send("Rất tiếc, ghế bạn chọn vừa có người khác thanh toán xong. Vui lòng liên hệ hỗ trợ để hoàn tiền!");
        }
        // 1. Cập nhật trạng thái vé
       const ve = await Ve.findOneAndUpdate(
            { MaGiaoDich: orderId },
            { TrangThai: 1 },
            { new: true }
        ).populate({
            path: 'SuatChieu',
            model: 'SuatChieu', // Chỉ định rõ tên Model ở đây
            populate: [
                { path: 'Phim', model: 'Phim' },
                { path: 'PhongChieu', model: 'PhongChieu' }
            ]
        });
              if (ve.LoyaltySD > 0) {
                // Lấy Hash gần nhất để nối chuỗi Blockchain
                const lastBlockRedeem = await LoyaltyLedger.findOne({ TaiKhoan: ve.Taikhoan }).sort({ Timestamp: -1 });
                const prevHashRedeem = lastBlockRedeem ? lastBlockRedeem.Hash : "0000000000000000";
                
                const currentHashRedeem = crypto.createHash('sha256')
                    .update(prevHashRedeem + ve.Taikhoan + ve.LoyaltySD + "REDEEM" + Date.now())
                    .digest('hex');

                const redeemBlock = new LoyaltyLedger({
                    TaiKhoan: ve.Taikhoan,
                    SoDiem: ve.LoyaltySD,
                    HanhDong: "REDEEM",
                    PreviousHash: prevHashRedeem,
                    Hash: currentHashRedeem
                });
                await redeemBlock.save();

                // Cập nhật giảm điểm trong bảng TaiKhoan
                await TaiKhoan.findByIdAndUpdate(ve.Taikhoan, {
                    $inc: { DiemLoyalty: -ve.LoyaltySD }
                });
                            console.log(`Đã trừ ${ve.LoyaltySD} điểm cho user ${ve.Taikhoan}`);

            }
        if (ve) {
            // 2. TÍNH TOÁN LOYALTY (5% giá trị vé, 1000đ = 1 điểm)
            const diemCong = Math.floor(ve.TongTien * 0.05 / 1000);

            // 3. LOGIC BLOCKCHAIN GIẢ LẬP
            const lastBlock = await LoyaltyLedger.findOne({ TaiKhoan: ve.Taikhoan }).sort({ Timestamp: -1 });
            const previousHash = lastBlock ? lastBlock.Hash : "0000000000000000"; 
            
            const stringToHash = previousHash + ve.Taikhoan + diemCong + Date.now();
            const currentHash = crypto.createHash('sha256').update(stringToHash).digest('hex');
            
            const newBlock = new LoyaltyLedger({
                TaiKhoan: ve.Taikhoan,
                SoDiem: diemCong,
                HanhDong: "REWARD",
                PreviousHash: previousHash,
                Hash: currentHash
            });
            await newBlock.save();

            // 4. CẬP NHẬT TỔNG ĐIỂM VÀO TÀI KHOẢN
            await TaiKhoan.findByIdAndUpdate(ve.Taikhoan, {
                $inc: { DiemLoyalty: diemCong }
            });
            console.log(`Đã cộng ${diemCong} điểm cho user ${ve.Taikhoan}`);

            // 5. HIỂN THỊ VÉ THÀNH CÔNG
            res.render('ve', {
                title: 'Đặt vé thành công',
                ve: ve,
                diem: diemCong,
                phim: ve.SuatChieu.Phim, // Dữ liệu cho <%= phim.TenPhim %>
                suatChieu: ve.SuatChieu   // Dữ liệu cho <%= suatChieu.start %
            });
        } else {
            res.send("Không tìm thấy thông tin vé hoặc đơn hàng đã hết hạn.");
        }
    } catch (error) {
        console.error("Lỗi xác nhận thanh toán:", error);
        res.status(500).send("Lỗi hệ thống khi xử lý vé: " + error.message);
    }
});
// API để Frontend gọi liên tục (Polling)
router.get('/api/check-payment/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const veTam = await Ve.findOne({ MaGiaoDich: orderId });
        
        if (!veTam || veTam.TrangThai === 1) {
            return res.json({ success: veTam?.TrangThai === 1 });
        }

        // 1. Gọi đến Google Sheets API (Link App Script từ video)
        const GOOGLE_SHEET_API = "https://script.google.com/macros/s/AKfycbxmlLxJro9jw0hiKYmDcj7UPrpeYN92p_qqE8hQaX-jjtPMnyq-kgpERGnbqmvjxN8Ckg/exec"; 
        const response = await axios.get(GOOGLE_SHEET_API);
        const transactions = response.data;

        // 2. Tìm giao dịch khớp với OrderId và Số tiền
        const match = transactions.find(t => 
            t["Mô tả"].includes(orderId) && 
            parseInt(t["Giá trị"]) >= veTam.TongTien
        );

        if (match) {
            // 3. Nếu khớp, trả về tín hiệu để Frontend chuyển hướng
            // Lưu ý: Logic cập nhật DB (Loyalty, trạng thái vé) 
            // nên để ở Route /xac-nhan-chuyen-khoan để tái sử dụng code cũ của bạn.
            return res.json({ success: true });
        }

        res.json({ success: false });
    } catch (error) {
        console.error("LỖI TẠI BACKEND:", error.message);
        res.status(500).json({ error: "Lỗi Server rồi, xem Terminal nhé!" });    }
});
router.get('/lichsuve', async (req, res) => {
    try {
const danhSachVe = await Ve.find({ Taikhoan: req.session.MaNguoiDung, TrangThai: 1 })
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
            taikhoan: await TaiKhoan.findById(req.session.MaNguoiDung)
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});
router.get('/thongtinnguoidung', async (req, res) => {
    try {
        // Đảm bảo lấy đúng MaNguoiDung từ session
        const maND = req.session.MaNguoiDung;
        const taikhoan = await TaiKhoan.findById(maND);

        // KIỂM TRA: Nếu không tìm thấy tài khoản trong DB
        if (!taikhoan) {
            return res.redirect('/dangnhap'); // Hoặc báo lỗi cụ thể
        }

        // Lấy lịch sử Ledger để hiển thị cơ chế Blockchain bạn đang làm
        const lichSuDiem = await LoyaltyLedger.find({ TaiKhoan: maND }).sort({ Timestamp: -1 });

        res.render('thongtinnguoidung', {
            title: 'Thông tin cá nhân',
            taikhoan: taikhoan, // Bây giờ taikhoan chắc chắn không null
            lichSuDiem: lichSuDiem,
            session: req.session,
            error: null
        });
    } catch (error) {
        console.error("Lỗi trang cá nhân:", error);
        res.status(500).send("Lỗi máy chủ");
    }
});
router.post('/thongtinnguoidung', async (req, res) => {
    try {
        const maND = req.session.MaNguoiDung;
        const { HoVaTen, Email, MatKhau, XacNhanMatKhau } = req.body;
        const taikhoan = await TaiKhoan.findById(maND);

        if (!taikhoan) {
            return res.redirect('/dangnhap');
        }
        // Kiểm tra nếu người dùng muốn đổi mật khẩu
        if (MatKhau) {
            if (MatKhau !== XacNhanMatKhau) {
                return res.render('thongtinnguoidung', {
                    title: 'Thông tin cá nhân',
                    taikhoan: taikhoan,
                    lichSuDiem: await LoyaltyLedger.find({ TaiKhoan: maND }).sort({ Timestamp: -1 }),
                    session: req.session,
                    error: "Xác nhận mật khẩu không khớp!"
                });
            }
            
        }

        // Cập nhật thông tin khác
        var salt=bcrypt.genSaltSync(10);
        taikhoan.HoVaTen = HoVaTen;
        taikhoan.Email = Email;
        taikhoan.MatKhau = bcrypt.hashSync(MatKhau, salt);
        await TaiKhoan.findByIdAndUpdate(maND, taikhoan);
        res.render('thongtinnguoidung', {
            title: 'Thông tin cá nhân',
            taikhoan: taikhoan,
            lichSuDiem: await LoyaltyLedger.find({ TaiKhoan: maND }).sort({ Timestamp: -1 }),
            session: req.session,
            error: null,
            success: "Cập nhật thông tin thành công!"
        });
        

    } catch (error) {
        console.error("Lỗi cập nhật thông tin:", error);
        res.status(500).send("Lỗi máy chủ");
    }
    
});

module.exports = router;