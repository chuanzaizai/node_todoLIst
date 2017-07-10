/*
 * 定义字段类型
*/

var mongoose = require('mongoose');

// 定义模式
var MovieSchema = new mongoose.Schema({
	title: String,
	doctor: String,
	country: String,
	language: String,
	summary: String,
	video: String,
	poster: String,
	time: Number,
	meta: {
		createdTime: {
			type: Date,
			default: Date.now()
		},
		updateTime: {
			type: Date,
			default: Date.now()
		}
	}
})



// 为模式添加保存方法，需要实例化时调用，查app.js的166行
MovieSchema.pre('save', function(next){
	if(this.isNew){
		this.meta.createdTime = this.meta.updateTime = Date.now();
	}else{
		this.meta.updateTime = Date.now();
	}
	next();
})


// 添加MovieSchema的静态方法,静态方法在Model层就能使用,查看app.js的42行
MovieSchema.statics = {
	fetch: function(cb){
		// 返回数据库所有数据
		return this
			.find({})
			// 按更新时间排序
			.sort('meta.updateTime')
			.exec(cb)
	},
	findById: function(id, cb){
		// 返回单条数据
		return this
			.findOne({_id: id})
			// 按更新时间排序
			.sort('meta.updateTime')
			.exec(cb)
	}
}

// 添加MovieSchema的实例方法，通过methods创建的方法需要在new方法后调用，查app.js的166行
// MovieSchema.methods = {}


// 导出模块
module.exports = MovieSchema;
