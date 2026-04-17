var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');
// GET: Đăng ký
router.get('/dangky', async (req, res) => {
    res.render('dangky', {
        title: 'Đăng ký',
    });
});
// POST: Đăng ký
router.post('/dangky', async (req, res) => {
    var salt = bcrypt.genSaltSync(10);
    var data = {
        HoVaTen: req.body.HoVaTen,
        Email: req.body.Email,
        TenDangNhap: req.body.TenDangNhap,
        MatKhau: bcrypt.hashSync(req.body.MatKhau, salt)
    }
    await TaiKhoan.create(data);
    req.session.success = "Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.";
    res.redirect('/success');
});
// GET: Đăng nhập
router.get('/dangnhap', async (req, res) => {
    res.render('dangnhap', {
        title: 'Đăng nhập',
    });
});
// POST: Đăng nhập
router.post('/dangnhap', async (req, res) => {
    if(req.session.user) {
        req.session.error = "Bạn đã đăng nhập rồi!";
        return res.redirect('/error');
    }
    else
    {
        var taikhoan = await TaiKhoan.findOne({ TenDangNhap: req.body.TenDangNhap }).exec();
        if (taikhoan) {
            if (bcrypt.compareSync(req.body.MatKhau, taikhoan.MatKhau)) {
                if(taikhoan.KichHoat == 0) {
                    req.session.error = "Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.";
                    return res.redirect('/error');
                }
                else
                {
                    req.session.MaNguoiDung = taikhoan._id;
                    req.session.HoVaTen = taikhoan.HoVaTen;
                    req.session.QuyenHan = taikhoan.QuyenHan;
                    return res.redirect('/');
                }
            }
            else
            {
                req.session.error = "Mật khẩu không đúng!";
                return res.redirect('/error');
            }
        }
        else
        {
            req.session.error = "Tài khoản không tồn tại!";
            return res.redirect('/error');
        }
    }
});
// GET: Đăng xuất
router.get('/dangxuat', async (req, res) => {
    if(req.session.MaNguoiDung)
    {
        delete req.session.MaNguoiDung;
        delete req.session.HoVaTen;
        delete req.session.QuyenHan;
        return res.redirect('/');
    }
    else
    {
        req.session.error = "Bạn chưa đăng nhập!";
        return res.redirect('/error');
    }
});
module.exports = router;
