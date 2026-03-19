var express = require('express');
var app = express();
require('dotenv').config(); // Load biến môi trường
const port = process.env.PORT || 5000;
const dbUri = process.env.MONGODB_URI;

var mongoose = require('mongoose');
var indexRouter = require('./routers/index');
var phimRouter = require('./routers/phim');
var theloaiRouter = require('./routers/theloai');
var dinhdangRouter = require('./routers/dinhdang');
var phongchieuRouter = require('./routers/phongchieu');
var suatchieuRouter = require('./routers/suatchieu');
var uri = 'mongodb://DoAnDienToanDamMay:admin123@ac-kyxrmyd-shard-00-02.wwvy5d3.mongodb.net:27017?ssl=true&authSource=admin';
mongoose.connect(uri)
    .then(() => console.log('Đã kết nối thành công tới MongoDB.'))
    .catch(err => console.log(err));
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', indexRouter);
app.use('/phim', phimRouter);
app.use('/theloai', theloaiRouter);
app.use('/dinhdang', dinhdangRouter);
app.use('/phongchieu', phongchieuRouter);
app.use('/suatchieu', suatchieuRouter);
console.log("Database URI đang dùng là:", dbUri);
app.listen(port, () => {
    console.log(`Server đang chạy ở port ${port}`);
});