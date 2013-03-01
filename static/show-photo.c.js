/* image detail */

/**
 * 初始化Tab的交互
 */
function initTab(dataName){
    //Tab切换事件
    getEle('nav-photo-tab').addEventListener('click',function(e){
        var ele = e.srcElement; //W3C only
        if(ele && ele.tagName.toLowerCase() == 'li'){ //如果Tab点击切换
            //mark select item
            var dataName = ele.getAttribute('data-dataName');
            location.href = 'our-photo.html?dataName='+dataName;
        }
    });
    switchTab(dataName);
}


Gl.controller = (function(){
    var slide;
    var imgPlayer;

    //用于slide持续连动
    var _scrollingPn = 0;
    var _scrollingPageSize = 0;
    var _scrollingTimer = null;

    return {
        init: function(conf){
            var that = this;
            var currentPn;
            var query = Gl.tool.getQuery();
            currentPn = query.pn ? query.pn : 0;
            currentPn = parseInt(currentPn, 10) || 0;
            var config = {
                offset: window.conf.album.slideOffset,
                pageSize: window.conf.album.slideLength
            };
            //不能越界；由model保证一下吧~
            if(currentPn < 0 ){
                currentPn = 0;
            }
            //初始化导航
            var dataName = query['dataname'];
            initTab(dataName);
            var path = (dataName || 'animals') + '.js?';

            //初始化数据model层

            var urlPrefix = conf.urlPrefix+path;
            //初始化时，先返回数据情况，再发起新的请求吧
            model.init({currentPn: currentPn, urlPrefix: urlPrefix}, function(data){
                //初始化大图导航
                imgPlayer = new ImagePlayer();
                imgPlayer.init(data);
                imgPlayer.switchTo(data);
                that._bindImgPlayerAction();

                //初始化幻灯片导航
                slide = new ImageSlide();
                slide.init(baidu.extend(config, data));
                //slide的更新要复杂一点
                var pn = data.currentPn - config.offset;
                model.getListFull(pn, config.pageSize, function(data){
                    slide.switchTo(data);
                });
                that._bindSlideAction();
            });
            that._bindUserEvent();
        },

        _actionSwitchNext: function(){
            //console.error('_actionSwitchNext');
            model.switchNext(function(data){
                //console.log(data);
                imgPlayer.switchNext(data);
                //slide.switchNext(data);
                //slide的更新要复杂一点
                var config = slide.getConfig();
                var pn = data.currentPn - config.offset;
                model.getListFull(pn, config.pageSize, function(data){
                    slide.switchNext(data);
                });
            });
        },
        _actionSwitchPrev: function(){
            model.switchPrev(function(data){
                //console.log(data);
                imgPlayer.switchPrev(data);
                //slide的更新要复杂一点
                var config = slide.getConfig();
                var pn = data.currentPn - config.offset;
                model.getListFull(pn, config.pageSize, function(data){
                    slide.switchPrev(data);
                });
            });
        },
        _actionSwitchTo: function(currentPn){
            var that = this;
            model.switchTo(currentPn, function(data){
                //console.log(data);
                //大图更新简单
                imgPlayer.switchTo(data);
                //slide的更新要复杂一点
                var config = slide.getConfig();
                var pn = data.currentPn - config.offset;
                model.getListFull(pn, config.pageSize, function(data){
                    slide.switchTo(data);
                });
            });
        },
        /**
         * 绑定大图播放器的响应行为
         * @private
         */
        _bindImgPlayerAction: function(){
            var that = this;
            baidu(document).on('e_switch_prev.player',function(e){	 var params=e.triggerData;
                //console.log('e_switch_prev');
                //console.log(params);
                that._actionSwitchPrev();
            });
            baidu(document).on('e_switch_next.player',function(e){	 var params=e.triggerData;
                //console.log('e_switch_next');
                that._actionSwitchNext();
            });
            baidu(document).on('e_image_loaded.player',function(e){	 var params=e.triggerData;
                //console.log('model.getCurrentIndex()'+model.getCurrentIndex()+ ' ' + params.pn);
                //如果还在当前图片，且可以前翻（绝大部分用户都是向前翻，不处理向后翻了）
                if(model.getCurrentIndex() == params.pn) {
                    model.moveNext(params.pn, function(data){
                        //console.warn('go');
                        imgPlayer.preLoadImage(data.list[0]);
                    });
                }
            });
        },
        /**
         * 绑定小图播放器的响应行为
         * @private
         */
        _bindSlideAction: function(){
            var that = this;

            baidu(document).on('e_prev_item.slide',function(e){	 var params=e.triggerData;
                //console.log('action: move-prev-item');
                //console.log(params);
                model.movePrev(params.firstPn, function(data){
                    //console.log(data);
                    slide.movePrev(data);
                });
            });
            baidu(document).on('e_next_item.slide',function(e){	 var params=e.triggerData;
                //console.log('action: move-next-item');
                model.moveNext(params.lastPn, function(data){
                    //console.log(data);
                    slide.moveNext(data);

                });
            });
            baidu(document).on('e_start_scroll_prev_page.slide',function(e){	 var params=e.triggerData;
                //console.log('onAction: event_start_scroll_prev_page');
                //console.log(params);
                //console.assert(_scrollingTimer == null,'_scrollingTimer==null');
                if(_scrollingTimer != null){    //交互事件出现了问题; 鼠标粘住了
                    clearInterval(_scrollingTimer);
                }
                _scrollingPn = params.firstPn;
                _scrollingPageSize = params.pageSize;
                that._scrollingSlidePrevPage(); //先走一个！
                _scrollingTimer = setInterval(that._scrollingSlidePrevPage, 500);   //后面继续
            });
            baidu(document).on('e_end_scroll_prev_page.slide',function(e){	 var params=e.triggerData;
                //console.log('onAction: event_end_scroll_prev_page');
                clearInterval(_scrollingTimer);
                _scrollingTimer = null;
                //console.warn('mouse is UP; stop scrolling timer!');
            });
            baidu(document).on('e_start_scroll_next_page.slide',function(e){	 var params=e.triggerData;
                //console.log('onAction: event_start_scroll_next_page');
                //console.log(params);
                if(_scrollingTimer != null){    //交互事件出现了问题; 鼠标粘住了
                    clearInterval(_scrollingTimer);
                }
                _scrollingPn = params.firstPn;
                _scrollingPageSize = params.pageSize;
                //console.assert(_scrollingTimer == null,'_scrollingTimer==null');
                that._scrollingSlideNextPage(); //先走一个！
                _scrollingTimer = setInterval(that._scrollingSlideNextPage, 500);   //后面继续
            });
            baidu(document).on('e_end_scroll_next_page.slide',function(e){	 var params=e.triggerData;
                //console.log('onAction: event_end_scroll_next_page');
                clearInterval(_scrollingTimer);
                _scrollingTimer = null;
                //console.warn('mouse is UP; stop scrolling timer!');
            });
            baidu(document).on('e_click_item.slide', function(e){	 var params=e.triggerData;
                //console.log('action: switch to page; currentPn:'+params.currentPn);
                that._actionSwitchTo(params.currentPn);
            });
        },
        _bindUserEvent: function(){
            var that = this;
            var keyActioning = false;  //用于稀释事件; 为动画过程争取时间(that.conf.scrollSpeed)

            baidu(document).on("keydown", function (e) {
                if(keyActioning){
                    //console.warn('keyActioning: locking...');
                    return;
                }
                if (e.keyCode === 38) {
                    //console.log('keydown: goPrev');
                    keyActioning = true;
                    //后退
                    that._actionSwitchPrev();
                    setTimeout(function(){
                        keyActioning = false;
                    }, window.conf.scrollSpeed+10);
                    e.preventDefault();
                } else if (e.keyCode === 40) {
                    //console.log('keydown: goNext');
                    keyActioning = true;
                    //向前
                    that._actionSwitchNext();
                    setTimeout(function(){
                        keyActioning = false;
                    }, window.conf.scrollSpeed+10);
                    e.preventDefault();
                }
            });
        },
        _scrollingSlidePrevPage: function(){
            model.movePrevPageFull(_scrollingPn, _scrollingPageSize, function(data){
                //console.log('go prev page!');
                slide.movePrevPage(data);
                if(!data.canMovePrev){
                    clearInterval(_scrollingTimer);
                    //console.warn('slide canMovePrev is FALSE; stop scrolling timer!');
                } else {
                    _scrollingPn = data.startIndex;
                }
            });
        },
        _scrollingSlideNextPage: function(){
            model.moveNextPageFull(_scrollingPn, _scrollingPageSize, function(data){
                //console.log('go next page!');
                slide.moveNextPage(data);
                if(!data.canMoveNext){
                    clearInterval(_scrollingTimer);
                    //console.warn('slide canMoveNext is FALSE; stop scrolling timer!');
                } else {
                    _scrollingPn = data.startIndex;
                }
            });
        },
        //同步更新聚焦的Item
        updateFocus: function (currentPn){
            //避免统计冲突，单独调用
            var that = this;
            currentPn = parseInt(currentPn,10);
            model.switchTo(currentPn, function(data){
                //console.log(data);
                //大图更新简单
                imgPlayer.switchTo(data);
                //slide的更新要复杂一点
                var config = slide.getConfig();
                var pn = data.currentPn - config.offset;
                model.getListFull(pn, config.pageSize, function(data){
                    slide.switchTo(data);
                });
            });
        }
    };

})();