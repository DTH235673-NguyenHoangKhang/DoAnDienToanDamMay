require('dotenv').config(); // Load biến môi trường

var express = require('express');
var app = express();
const port = 5000;
const dbUri ='mongodb://DoAnDienToanDamMay:admin123@ac-kyxrmyd-shard-00-01.wwvy5d3.mongodb.net:27017/trangtin?ssl=true&authSource=admin' ;

var mongoose = require('mongoose');
var session = require('express-session');
var indexRouter = require('./routers/index');
var phimRouter = require('./routers/phim');
var theloaiRouter = require('./routers/theloai');
var dinhdangRouter = require('./routers/dinhdang');
var phongchieuRouter = require('./routers/phongchieu');
var suatchieuRouter = require('./routers/suatchieu');
var taikhoanRouter = require('./routers/taikhoan');
var authRouter = require('./routers/auth');

mongoose.connect(dbUri)
    .then(() => console.log('Đã kết nối thành công tới MongoDB.'))
    .catch(err => console.log(err));
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    name: 'KCinema', // Tên session (tự chọn)
    secret: 'kính chào quý khách', // Khóa bảo vệ (tự chọn)
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // Hết hạn sau 30 ngày
    }
}));
app.use((req, res, next) => {
    // Chuyển biến session thành biến cục bộ
    res.locals.session = req.session;

    // Lấy thông báo (lỗi, thành công) của trang trước đó (nếu có)
    var err = req.session.error;
    var msg = req.session.success;

    // Xóa session sau khi đã truyền qua biến trung gian
    delete req.session.error;
    delete req.session.success;

    // Gán thông báo (lỗi, thành công) vào biến cục bộ
    res.locals.message = '';
    if (err) res.locals.message = '<span class="text-danger">' + err + '</span>';
    if (msg) res.locals.message = '<span class="text-success">' + msg + '</span>';

    next();
});

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/phim', phimRouter);
app.use('/theloai', theloaiRouter);
app.use('/dinhdang', dinhdangRouter);
app.use('/phongchieu', phongchieuRouter);
app.use('/suatchieu', suatchieuRouter);
app.use('/taikhoan', taikhoanRouter);
app.use(express.static('public'));
console.log("Database URI đang dùng là:", dbUri);
app.listen(port, () => {
    console.log(`Server đang chạy ở port ${port}`);
});