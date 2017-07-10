/*
 * 列表删除方法
*/
$(function(){
	$('.del').click(function(){
		var _this = this;
		var id = $(_this).data('id');
		var poster = $(_this).data('poster');
		var tr = $('.item-hook-' + id);
		// 发送请求
		$.ajax({
			type: 'DELETE',
			url: '/admin/movie/delete?id=' + id + '&poster=' + poster,
		})
		.done(function(res){
			if(res.code === 100){
				if(tr && tr.length>0){
					tr.remove();
				}
			}
		})	
	})
})

