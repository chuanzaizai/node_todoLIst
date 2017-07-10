var path = require('path');
var express = require('express');
var mongoose = require('mongoose');
var Movie = require('./models/movie');
var bodyParser = require('body-parser');

// 七牛上传、七牛储存空间、图片上传后的七牛图片url前缀
var qiniu = require("qiniu");
var bucket = '******';
var imgBaseUrl = '******************';

// 文件上传中间件,可以获取本地文件路径
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

// 端口
var port = process.env.PORT || 3000;
var app = express();

// 连接本地数据库
mongoose.connect('mongodb://localhost:27017/test');

// 页面jade模板
app.set('views', './views/pages');
app.set('view engine', 'jade');

// 添加本地方法,在页面上能直接使用
app.locals.moment = require('moment');

/*
 * 表单提交
*/
// application/x-www-form-urlencoded格式提交
app.use(bodyParser.urlencoded({ extended: false }));

// 定义__dirname后，才能找到script和link标签引入的文件的路径
// app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, '')));
app.listen(port);
console.log('listen at port' + port);

/*首页*/
app.get('/', function(req, res){
	// 用mongoose实现首页的查询
	Movie.fetch(function(err, movies){
		if(err){
			console.log(err);
		}
		// 渲染首页模板
		res.render('index', {
			title: '川仔仔首页',
			movies: movies
		})
	})
});

/*详情页*/
app.get('/movie/:id', function(req, res){
 	// 获取列表的id
	var id = req.params.id;
	// 用mongoose实现详情页的查询
	Movie.findById(id, function(err, movie){
		if(err){
			console.log(err);
		}
		// 渲染首页模板
		res.render('detail', {
			title: '川仔仔详情页',
			movie: movie
		})
	})
});

/*后台管理列表页*/
app.get('/admin/list', function(req, res){
	// 用mongoose实现首页的查询
	Movie.fetch(function(err, movies){
		if(err){
			console.log(err);
		}
		// 渲染列表页模板
		res.render('list', {
			title: '川仔仔列表页',
			movies: movies
		})
	})
});

/*查询列表详情*/
app.get('/admin/update/:id', function(req, res){
	// 获取列表的id
	var id = req.params.id;
	// 查询模型，渲染表单
	if(id){
		Movie.findById(id, function(err, movie){
			if(err){
				console.log(err);
			}
			// 渲染列表详情模板
			console.log(movie);
			res.render('admin', {
				title: '川仔仔后台修改页',
				movie: movie
			})
		})
	}
})

/*后台管理新增页面*/
app.get('/admin/movie', function(req, res){
	res.render('admin', {
		title: '川仔仔后台新增页',
		movie: {
			title: '',
			doctor: '',
			country: '',
			language: '',
			time: '',
			poster: '',
			flash: '',
			video: '',
			summary: ''
		}
	})
});

/*后台管理添加、修改方法*/
app.post('/admin/movie/add_update', multipartMiddleware, function(req, res){
	var id = req.body._id;
	// 获取图片的key,用于修改图片时删除原有图片
	var posterKey = req.body.posterKey;
	var index = posterKey .lastIndexOf("\/");
	posterKey = posterKey .substring(index + 1, posterKey.length);
	var movieObj = req.body;
	var _movie;
	/*
	 * video、poster暂为固定数据
	*/
	// 获取七牛key和token
	var obj = keyToken();
	var key = obj.key;
	var token =obj.token;
	// 如果数据不存在，则新增
	if(id.length === 9){
		// 向七牛上传获取图片路径
		uploadFile(token, key, req.files.poster.path).then(function(data){
			var poster = imgBaseUrl + data.key;
			// 新添加的实例,写入数据库
			_movie = new Movie({
				title: movieObj.title,
				doctor: movieObj.doctor,
				country: movieObj.country,
				language: movieObj.language,
				summary: movieObj.summary,
				video: 'http://mp4.vjshi.com/2017-05-22/671de209ba30d0741da9d8005d0b5d5e.mp4',
				poster: poster,
				time: movieObj.time
			});
			// 保存数据
			_movie.save(function(err, movie){
				if(err){
					console.log(err);
				}
				/*
				 * @ _id：数据库生成的id
				 * 跳转到详情页
				*/
				res.redirect('/movie/' + movie._id);
			})
		},function(err){
			console.log('上传出错');
		})
	}else{
		// 如果用户修改列表的时候没有重新选择图片，则不调用七牛上传
		if(req.files.poster.size === 0){
			Movie.findById(id, function(err, movie){
				if(err){
					console.log(err);
				}
				_movie = Object.assign(movie, movieObj);
				// 保存数据
				_movie.save(function(err, movie){
					if(err){
						console.log(err);
					}
					// 跳转到详情页
					res.redirect('/movie/' + movie._id);
				})
			})
		}else{
			// 删除原先的旧图片
			deleteFile(bucket, posterKey).then(function(data){
				console.log('删除原有照片成功');
			},function(err){
				console.log('删除原有照片失败');
			})
			// 再重新上传图片
			uploadFile(token, key, req.files.poster.path).then(function(data){
				var poster = imgBaseUrl + data.key;
				movieObj.poster = poster;
				Movie.findById(id, function(err, movie){
					if(err){
						console.log(err);
					}
					_movie = Object.assign(movie, movieObj);
					// 保存数据
					_movie.save(function(err, movie){
						if(err){
							console.log(err);
						}
						// 跳转到详情页
						res.redirect('/movie/' + movie._id);
					})
				})
			})
		}
	}
});


/*删除列表方法,同时要将七牛上的图片也删除*/
app.delete('/admin/movie/delete', function(req, res){
	// ajax提交通过req.query取值
	var id = req.query.id,
		poster = req.query.poster;
	var index = poster .lastIndexOf("\/");
	poster = poster.substring(index + 1, poster.length);
	// 删除七牛上的图片
	deleteFile(bucket, poster).then(function(data){
		console.log('删除七牛照片成功');
		// 删除mongodb上的数据
		if(id){
			Movie.remove({_id: id}, function(err, movie){
				if(err){
					console.log(err);
				}else{
					res.json({code: 100});
				}
			})
		}
	},function(err){
		console.log('删除七牛照片失败');
	})
});


/*
 * 用于生产图片的随机数名称和token
*/
function keyToken(){
	// 七牛的ACCESS_KEY和SECRET_KEY
	qiniu.conf.ACCESS_KEY = '*******************************';
	qiniu.conf.SECRET_KEY = '*******************************';
	var obj = {};
	obj.key = Date.now() + 'test.png';
	obj.token = new qiniu.rs.PutPolicy(bucket+":" + obj.key).token();
	return obj;
}

/*
 *上传图片方法
 */
function uploadFile(uptoken, key, localFile) {
    return new Promise(function(resolve, reject){
	    var extra = new qiniu.io.PutExtra();
	    qiniu.io.putFile(uptoken, key, localFile, extra, function(err, res) {
	        console.log(res.hash, res.key, res.persistentId);
            if(!err){
                resolve(res);
            }else{
                reject(err);
            }
	  	});
    });
}

/*
 * 删除图片方法
*/
function deleteFile(bucket, key) {
	//构建bucketmanager对象
	var client = new qiniu.rs.Client();
	qiniu.conf.ACCESS_KEY = '*******************************';
	qiniu.conf.SECRET_KEY = '*******************************';
    return new Promise(function(resolve, reject){
    	client.remove(bucket, key, function(err, res) {
			if (!err) {
	    		resolve(res);
			} else {
		    	reject(err);
		  	}
		});
    });
}


                                                                                          