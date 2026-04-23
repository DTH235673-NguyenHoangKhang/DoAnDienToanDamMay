var express = require('express');
var app = express();
const port = 5000;
const http = require('http'); // 1. Thêm thư viện http
const server = http.createServer(app); // 2. Tạo server từ app

const dbUri = 'mongodb://DoAnDienToanDamMay:admin123@ac-kyxrmyd-shard-00-01.wwvy5d3.mongodb.net:27017/trangtin?ssl=true&authSource=admin';
const axios = require('axios');
const CryptoJS = require('crypto-js');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

// 3. Khởi tạo Socket.io thông qua server (không phải app)
const io = require('socket.io')(server); 

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
    name: 'KCinema',
    secret: 'kính chào quý khách',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    var err = req.session.error;
    var msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.locals.message = '<span class="text-danger">' + err + '</span>';
    if (msg) res.locals.message = '<span class="text-success">' + msg + '</span>';
    next();
});

// LOGIC SOCKET.IO
io.on('connection', (socket) => {
    console.log('Có người dùng kết nối:', socket.id);

    socket.on('join-cinema-room', (suatChieuId) => {
        socket.join(suatChieuId);
    });

    socket.on('client-hold-seat', (data) => {
        socket.to(data.suatChieuId).emit('seat-is-being-held', data.maGhe);
    });

    socket.on('client-release-seat', (data) => {
        socket.to(data.suatChieuId).emit('seat-is-released', data.maGhe);
    });

    socket.on('disconnect', () => {
        console.log('Người dùng ngắt kết nối');
    });
});

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/phim', phimRouter);
app.use('/theloai', theloaiRouter);
app.use('/dinhdang', dinhdangRouter);
app.use('/phongchieu', phongchieuRouter);
app.use('/suatchieu', suatchieuRouter);
app.use('/taikhoan', taikhoanRouter);

// 4. SỬA app.listen THÀNH server.listen
server.listen(port, () => {
    console.log(`Server đang chạy ở port ${port}`);
});