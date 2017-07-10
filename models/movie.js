/*
 * 编译模型
*/

var mongoose = require('mongoose');
var MovieSchema = require('./../schemas/movie');

// 编译模块,此模块可直接调用MovieSchema.statics定义的静态方法
var Movie = mongoose.model('Movie', MovieSchema);

// 导出模块
module.exports = Movie;
