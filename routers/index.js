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
        const phimTimKiem = await Phim.find({ TenPhim: new RegExp(tukhoa, 'i') }).populate('TheLoai').populate('DinhDang');

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
        const cacVeDaDat = await Ve.find({ SuatChieu: idSC, TrangThai: 1 });
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
router.post('/xuly-datve',kiemTraDangNhap, async (req, res) => {
    try {
        const vnp_TmnCode = 'M6PCH80J';
        const vnp_HashSecret = '0F9AZURX5L7IHNOBFZD69V5RK6M2Z8B1';
        const vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const vnp_ReturnUrl = 'https://doandientoandammay-kwqn.onrender.com/vnpay_return';
        const { idSuatChieu, danhSachGhe, tongTien, diemSuDung } = req.body;
        const orderId = moment().format('DDHHmmss');
        let finalDiemSuDung = parseInt(diemSuDung) || 0;
        const total = parseInt(tongTien);

        // --- LOGIC MỚI: Giới hạn tối đa 50% tổng tiền ---
        const maxAllowedDiem = Math.floor(total * 0.5); 
        if (finalDiemSuDung > maxAllowedDiem) {
            finalDiemSuDung = maxAllowedDiem;
        }
        const veMoi = new Ve({
            Taikhoan: req.session.MaNguoiDung || null,
            SuatChieu: idSuatChieu,
            DanhSachGhe: JSON.parse(danhSachGhe),
            TongTien: parseInt(tongTien),
            MaGiaoDich: orderId,
            LoyaltySD: finalDiemSuDung,
            TrangThai: 0
        });
        await veMoi.save();

        // --- CẤU HÌNH VNPAY ---
        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');

        let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = vnp_TmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan ve xem phim: ' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = tongTien * 100;
        vnp_Params['vnp_ReturnUrl'] = vnp_ReturnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        // Bước 1: Sắp xếp tham số theo alphabet (Quan trọng)
        vnp_Params = Object.keys(vnp_Params)
            .sort()
            .reduce((obj, key) => {
                obj[key] = encodeURIComponent(vnp_Params[key]).replace(/%20/g, "+");
                return obj;
            }, {});

        // Bước 2: Tạo chuỗi băm (Sử dụng qs với tùy chọn encode: false vì ta đã encode ở trên)
        const signData = qs.stringify(vnp_Params, { encode: false });

        // Bước 3: Tạo chữ ký HMAC-SHA512
        const hmac = crypto.createHmac("sha512", vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;

        // Bước 4: Tạo URL cuối cùng
        const paymentUrl = vnp_Url + '?' + qs.stringify(vnp_Params, { encode: false });

        res.redirect(paymentUrl);

    } catch (error) {
        res.status(500).send("Lỗi: " + error.message);
    }
});
// Route xử lý kết quả trả về từ VNPAY (GET: /vnpay_return)
router.get('/vnpay_return', kiemTraDangNhap,async (req, res) => {
    try {
        let vnp_Params = req.query;
        let secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        // 1. Sắp xếp tham số theo alphabet (Quan trọng nhất)
        vnp_Params = Object.keys(vnp_Params).sort().reduce((obj, key) => {
            obj[key] = vnp_Params[key];
            return obj;
        }, {});

        const vnp_HashSecret = '0F9AZURX5L7IHNOBFZD69V5RK6M2Z8B1';

        // 2. Tạo chuỗi ký thô (Sử dụng encode của querystring để khớp chuẩn VNPAY)
        // Lưu ý: Không dùng qs.stringify thông thường mà dùng hàm băm chuẩn
        let signData = qs.stringify(vnp_Params, { encode: true }).replace(/%20/g, "+");
        const hmac = crypto.createHmac("sha512", vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            const orderId = vnp_Params['vnp_TxnRef'];
            const responseCode = vnp_Params['vnp_ResponseCode'];

            if (responseCode === "00") {
                // Kiểm tra trạng thái vé trong DB để tránh xử lý 2 lần
                const veTam = await Ve.findOne({ MaGiaoDich: orderId });
                if (!veTam) return res.send("Đơn hàng không tồn tại.");
                if (veTam.TrangThai === 1) return res.redirect('/lichsuve');

                // Cập nhật trạng thái và xử lý Blockchain/Loyalty
                const ve = await Ve.findOneAndUpdate(
                    { MaGiaoDich: orderId },
                    { TrangThai: 1 },
                    { new: true }
                ).populate({
                    path: 'SuatChieu',
                    populate: [{ path: 'Phim' }, { path: 'PhongChieu' }]
                });                 
                // --- XỬ LÝ BLOCKCHAIN: TRỪ ĐIỂM SỬ DỤNG (REDEEM) ---
                if (ve.LoyaltySD > 0) {
                    const lastBlockRedeem = await LoyaltyLedger.findOne({ TaiKhoan: ve.Taikhoan }).sort({ Timestamp: -1 });
                    const prevHashRedeem = lastBlockRedeem ? lastBlockRedeem.Hash : "0".repeat(64);
                    
                    const now = new Date(); // Tạo một đối tượng Date cố định

                    const currentHashRedeem = crypto.createHash('sha256')
                        .update(prevHashRedeem + ve.Taikhoan + ve.LoyaltySD + "REDEEM" + now.getTime()) // Dùng now.getTime()
                        .digest('hex');

                    await new LoyaltyLedger({
                        TaiKhoan: ve.Taikhoan,
                        SoDiem: ve.LoyaltySD,
                        HanhDong: "REDEEM",
                        PreviousHash: prevHashRedeem,
                        Hash: currentHashRedeem,
                        Timestamp: now // Lưu chính xác đối tượng Date này
                    }).save();

                    await TaiKhoan.findByIdAndUpdate(ve.Taikhoan, {
                        $inc: { DiemLoyalty: -ve.LoyaltySD }
                    });
                }

                // --- XỬ LÝ BLOCKCHAIN: CỘNG ĐIỂM THƯỞNG (REWARD 5%) ---
                const diemCong = Math.floor(ve.TongTien * 0.05 / 1000);
                const lastBlock = await LoyaltyLedger.findOne({ TaiKhoan: ve.Taikhoan }).sort({ Timestamp: -1 });
                const previousHash = lastBlock ? lastBlock.Hash : "0".repeat(64);

                const currentHash = crypto.createHash('sha256')
                    .update(previousHash + ve.Taikhoan + diemCong + "REWARD" + Date.now())
                    .digest('hex');
                const now = new Date(); 
                await new LoyaltyLedger({
                    TaiKhoan: ve.Taikhoan,
                    SoDiem: diemCong,
                    HanhDong: "REWARD",
                    PreviousHash: previousHash,
                    Hash: currentHash,
                    Timestamp: now
                }).save();

                await TaiKhoan.findByIdAndUpdate(ve.Taikhoan, {
                    $inc: { DiemLoyalty: diemCong }
                });

                // Render trang vé thành công
                return res.render('ve', {
                    title: 'Đặt vé thành công',
                    ve: ve,
                    diem: diemCong,
                    phim: ve.SuatChieu.Phim,
                    suatChieu: ve.SuatChieu
                });

            } else {
                return res.render('error', {
                    title: 'Thanh toán thất bại',
                    message: "Giao dịch bị hủy hoặc lỗi từ phía ngân hàng (Mã: " + responseCode + ")"
                });
            }
        } else {
            return res.status(400).send("Dữ liệu không hợp lệ (Sai chữ ký bảo mật)");
        }
    } catch (error) {
        console.error("Lỗi hệ thống chiều về:", error);
        return res.status(500).send("Lỗi hệ thống: " + error.message);
    }
});
router.get('/lichsuve',kiemTraDangNhap, async (req, res) => {
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
router.get('/thongtinnguoidung',kiemTraDangNhap, async (req, res) => {
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
router.post('/thongtinnguoidung', kiemTraDangNhap,async (req, res) => {
    try {
        const maND = req.session.MaNguoiDung;
        const { HoVaTen, Email, TenDangNhap, MatKhau, XacNhanMatKhau } = req.body;
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
        var salt = bcrypt.genSaltSync(10);
        taikhoan.HoVaTen = HoVaTen;
        taikhoan.TenDangNhap = TenDangNhap; // Cập nhật lại tên đăng nhập
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
router.get('/vecuatoi', kiemTraDangNhap, async (req, res) => {
    try {
        const maND = req.session.MaNguoiDung;
        const homNay = new Date().toISOString().split('T')[0]; // Định dạng YYYY-MM-DD

        // Tìm vé: Đã thanh toán + Thuộc người dùng + Su suất chiếu có ngày >= hôm nay
        const danhSachVe = await Ve.find({ 
            Taikhoan: maND, 
            TrangThai: 1 
        })
        .populate({
            path: 'SuatChieu',
            populate: [
                { path: 'Phim' },
                { path: 'PhongChieu' }
            ]
        })
        .sort({ 'SuatChieu.NgayChieu': 1 }); // Sắp xếp theo ngày chiếu gần nhất trước
        if(danhSachVe.length > 0) {
            console.log("Ngày mẫu từ DB:", danhSachVe[0].SuatChieu.NgayChieu);
            console.log("Giờ mẫu từ DB:", danhSachVe[0].SuatChieu.start);
        }
        const bayGio = moment();
        // Lọc lại ở phía Server để đảm bảo logic "Chưa tới ngày xem"
const veSapToi = danhSachVe.filter(item => {
    if (!item.SuatChieu || !item.SuatChieu.NgayChieu) return false;

    // 1. Lấy ngày (định dạng YYYY-MM-DD)
    const ngayStr = moment(item.SuatChieu.NgayChieu).format('YYYY-MM-DD');
    
    // 2. Lấy giờ chiếu - Đảm bảo lấy đúng trường GioChieu
    // Thêm .trim() để xóa khoảng trắng thừa nếu có
    const gioStr = item.SuatChieu.start ? item.SuatChieu.start.trim() : "00:00"; 

    // 3. Gộp lại và ép kiểu
    const thoiDiemChieu = moment(`${ngayStr} ${gioStr}`, "YYYY-MM-DD HH:mm");
    const bayGio = moment();

    return thoiDiemChieu.isAfter(bayGio);
});
        res.render('vecuatoi', {
            title: 'Vé Của Tôi',
            ve: veSapToi,
            taikhoan: await TaiKhoan.findById(maND),
            session: req.session
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi máy chủ");
    }
});

// Route xem chi tiết 1 vé cụ thể
router.get('/chitietve/:idVe', kiemTraDangNhap, async (req, res) => {
    try {
        const ve = await Ve.findById(req.params.idVe).populate({
            path: 'SuatChieu',
            populate: [{ path: 'Phim' }, { path: 'PhongChieu' }]
        });

        if (!ve) return res.send("Không tìm thấy vé.");

        res.render('ve', { // Dùng lại template 've' bạn đã có cho trang thành công
            title: 'Chi tiết vé',
            ve: ve,
            phim: ve.SuatChieu.Phim,
            suatChieu: ve.SuatChieu,
            session: req.session
        });
    } catch (error) {
        res.status(500).send("Lỗi: " + error.message);
    }
});
// Route: Kiểm tra tính toàn vẹn của hệ thống Blockchain Loyalty
router.get('/verify-blockchain',kiemTraDangNhap, async (req, res) => {
    try {
        // Lấy toàn bộ sổ cái sắp xếp theo thời gian cũ đến mới
        const ledger = await LoyaltyLedger.find().sort({ Timestamp: 1 });
        let report = [];
        let isValid = true;

        for (let i = 0; i < ledger.length; i++) {
            const currentBlock = ledger[i];
            const previousHash = i === 0 ? "0".repeat(64) : ledger[i - 1].Hash;

            // Tính toán lại mã Hash dựa trên dữ liệu đang có trong DB
            // Lưu ý: Chuỗi update phải khớp tuyệt đối với lúc bạn tạo Block
            const calculatedHash = crypto.createHash('sha256')
                .update(previousHash + currentBlock.TaiKhoan + currentBlock.SoDiem + currentBlock.HanhDong + currentBlock.Timestamp.getTime())
                .digest('hex');

            // So sánh Hash tính toán được với Hash đang lưu trong DB
            const isBlockValid = (calculatedHash === currentBlock.Hash);
            const isChainValid = (currentBlock.PreviousHash === previousHash);

            if (!isBlockValid || !isChainValid) {
                isValid = false;
            }

            report.push({
                index: i,
                id: currentBlock._id,
                action: currentBlock.HanhDong,
                status: (isBlockValid && isChainValid) ? "Hợp lệ ✅" : "Bị can thiệp ❌"
            });
        }

        res.render('verify_blockchain', {
            title: 'Kiểm định Sổ cái Blockchain',
            report: report,
            overallStatus: isValid ? "Hệ thống An toàn" : "Cảnh báo: Dữ liệu đã bị sửa đổi!"
        });

    } catch (error) {
        res.status(500).send("Lỗi kiểm định: " + error.message);
    }
});
module.exports = router;