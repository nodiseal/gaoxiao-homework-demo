// Format datas with a template
replaceTpl = function(tpl, data, label) {
    var t = String(tpl),
        s = label || /#\{([^}]*)\}/mg,
        trim = String.trim ||
            function(str) {
                return str.replace(/^\s+|\s+$/g, '')
            };
    return t.replace(s, function(value, name) {
        //从模板获取name,容错处理
        return value = data[trim(name)];
    });
};

/**
 * 大图播放UI控件
 * @constructor
 */
var ImagePlayer = function(){
    var that = this;

    that._$imgShow = null;   //大图
    that._imageLoaded = false;  //标记大图是否载入完成
    that._$showPrev = baidu("#showPrev");
    that._$showNext = baidu("#showNext");
    that._currentPn = -1;
    that._canSwitchPrev = false;    //是否能向后切换
    that._canSwitchNext = false;    //是否能向前切换

    //用于调整大图效果
    that._$container = baidu("#imgContainer");
    that._$outerContainer =  baidu("#imgView");
    that.MAX_WIDTH = that._$container.width();
    that.MIN_HEIGHT = that._$container.height();

    that._$imgList = baidu('<div></div>');
};
ImagePlayer.prototype = {
    init: function(config){
        var that = this;
        that._bindUIEvent();  //主要是UI与用户交互类的事件
        that._bindExtAction(); //内部的一些交互：响应图片切换的更新；更新周边的效果，相当于给插件提供响应处理
    },
    _bindUIEvent: function(){
        var that = this;

        //向上、向下剪头
        that._$showPrev.on({
            'click': function(){
                if(that._canSwitchPrev){
                    baidu(document).trigger('e_switch_prev.player', {currentPn: that._currentPn});
                }
            },
            mouseenter: function () {
                if(that._canSwitchPrev){
                    baidu(this).addClass("hover");
                }
            },
            mouseleave: function () {
                baidu(this).removeClass("hover");
            }
        });

        that._$showNext.on({
            click: function () {
                if(that._canSwitchNext){
                    baidu(document).trigger('e_switch_next.player', {currentPn: that._currentPn});
                }
            },
            mouseenter: function () {
                if(that._canSwitchNext){
                    baidu(this).addClass("hover");
                }
            },
            mouseleave: function () {
                baidu(this).removeClass("hover");
            }
        });
    },
    _bindExtAction: function(){
        var that = this;
        //周边的小按扭们。
        // 为了避免与图片切换逻辑交杂在一起, 响应图片更新事件时再更新图片信息
        // 类似要更新的按扭比较多：分享、下载、信息等，这里统一为响应事件好了~
        baidu(document).on('e_update.player',function(e){	 var params=e.triggerData;
            //console.log('on event_update');
            that._updateInfoView(params);
        });
    },
    _updateInfoView: function(data){
        var imgObj = data.currentItem;
        // /console.log(imgObj);
        var that = this;
    },
    _updateState: function(data){
        this._canSwitchPrev = data.canSwitchPrev;
        this._canSwitchNext = data.canSwitchNext;

        this._currentPn = data.currentPn;
        baidu(document).trigger('e_update.player', baidu.extend(data, {imgObj:data.list[0]})); //将数据插出来，方便使用
    },
    //提前缓存大图
    preLoadImage: function(imgData){
        //console.log('preLoadImage');
        var that = this;
        //如果图片不存在才有必要载一次
        if(that._$imgList.children('[name='+imgData.pn+']').length == 0){
            //console.warn('图片没命中缓存，需要预加载！');
            that._$imgList.append(
                baidu("<img />").attr({
                    "id": "img_" + imgData.id,
                    "src": imgData.image_url,
                    "name": imgData.pn
                }));
            //console.log(that._$imgList);
        }
        //console.log(that._$imgList);
        //不准备缓存太多图片了
        if(that._$imgList.children().length > 5){
            //console.warn('图片超过栈空间，移除旧的那个！');
            //console.log(that._$imgList.children());
            that._$imgList.children().first().remove(); //丢掉一个
        }
    },
    /**
     * 根据图片的信息，展现图片
     * @param imgData
     * @private
     */
    _showImage: function(imgData){
        var that = this;
        //TODO 要优化图片的载入效果
        if(that._$imgShow){
            that._$imgShow.appendTo(that._$imgList);    //预防未载完，存起来，慢慢loaded
        }

        that._$imgShow = that._$imgList.children('[name='+imgData.pn+']');
        var pn = parseInt(imgData.pn,10);
        if(that._$imgShow.length == 0){
            //console.warn('图片没在缓存区，要重新创建它');
            that._$imgShow = baidu('<img />');
            if(Gl.tool.isIE6){
                that._$imgShow.hide();
                that._$imgShow.on("load", function () {
                    baidu(this).show();
                    baidu(document).trigger('e_image_loaded.player',{pn: pn});  //这个事件，可以让controller预加载些图片
                });
            } else {
                that._$imgShow.on("load", function () {
                    baidu(document).trigger('e_image_loaded.player',{pn: pn});  //这个事件，可以让controller预加载些图片
                });
            }
            that._$imgShow.attr({
                "id": "img_" + imgData.id,
                "src": imgData.image_url,
                "name": imgData.pn
            });
        } else {
            //console.warn('图片就在缓存区，直接拉取出来');
            baidu(document).trigger('e_image_loaded.player',{pn: pn});  //这个事件，可以让controller预加载些图片
        }
        that._resizeImg(imgData);
        that._$container.prepend(that._$imgShow);
    },
    switchTo: function(data){
        //没变化就不动了
        if(data.currentPn == this._currentPn){
            return false;
        }
        this._showImage(data.currentItem);
        this._updateState(data);
    },
    /**
     * 切换为上一张图片
     * @param data
     */
    switchPrev: function(data){
        this._showImage(data.list[0]);
        this._updateState(data);
    },
    /**
     * 切换为下一张图片
     * @param data
     */
    switchNext: function(data){
        this._showImage(data.list[0]);
        this._updateState(data);
    },
    // resize the image view; 图片定宽，超高，则调整容器高度
    // by NE: update, for Pic has Max-Width only!
    _resizeImg: function (imgObj, newWidth, newHeight) {
        var that = this,
            maxWidth = that.MAX_WIDTH,
            minHeight = that.MIN_HEIGHT,
            imgWidth = parseInt(imgObj.image_width,10),
            imgHeight = parseInt(imgObj.image_height,10),
            width = imgWidth,
            height = imgHeight,
            $imgShow = this._$imgShow;
        if(imgWidth > maxWidth) {
            width = Math.round(maxWidth);
            height = Math.round(maxWidth * imgHeight / imgWidth);
            $imgShow.width(width).height(height);
            $imgShow.css({"right": 0});
        } else {
            $imgShow.width("auto").height("auto");
            $imgShow.css({ "right": (maxWidth - width) / 2 });
        }
        var containerHeight = 0;
        if(height > minHeight){
            containerHeight = height;
            $imgShow.css({"top": 0});
        } else {
            containerHeight = minHeight;
            $imgShow.css({"top": (containerHeight - height) / 2});
        }
        that._$container.css({
            "height": containerHeight
        });
        that._$outerContainer.css(
            {
                "height": 13+containerHeight
            }
        );
        that._$showPrev.css({'height':containerHeight/2});
        that._$showNext.css({'height':containerHeight/2});

    }
};

/**
 * 小图播放幻灯片UI控件
 * @param data
 * @constructor
 */
var ImageSlide = function(data){
    this._$prev = baidu('#slidePrev');
    this._$next = baidu('#slideNext');
    this._$container = baidu('#imgList');
    this._$preLoadList = baidu('<div></div>');

    this._pageSize = 0;
    this._offset = 2;
    this._firstPn = -1;
    this._lastPn = -1;

    this._delayWheeling = 0;
    this._canMoveNext = false;
    this._canMovePrev = false;
    this._scrollingButtonOn = false; //用于标识当前触发了持续滚动事件
};
ImageSlide.prototype = {
    /**
     * @scope Slide
     * @type {Object}
     */
    init: function(conf){
        this._pageSize = conf.pageSize;
        this._delayWheeling = window.conf.album.scrollSpeed;
        this._offset = conf.offset;

        this._bindHoverButton();
        this._bindHoverItem();
        this._bindClickItem();
        this._bindMouseDownPrevPage();
        this._bindMouseDownNextPage();
        this._bindItemWheel();
//        baidu(document).trigger('e_init.v');  //note: 如果trigger('init') ==> 会自动执行自己。。this.init()...
    },

    _newImg: function(item){
        var that = this;
        var $img = that._$preLoadList.find('[name='+item.pn+']');
        if($img.length == 0){
            $img = baidu(replaceTpl(window.conf.album.slideImgTpl, item));
        }
        this._resizeThumb($img);
        return $img;
    },
    _renderTo: function(list){
        var that = this;
        var $li = null;
        var $img = null;
        var item = null;
        that._$container.empty();
        for(var i=0,len=list.length; i<len; i++){
            item = list[i];
            $li = baidu('<li></li>');
            $li.attr('id', 'pn_'+item.pn);
            $img = that._newImg(item);
            //that._resizeThumb($img);
            $li.append($img).appendTo(that._$container);
        }
    },
    _insertBefore: function(item){
        var that = this;
        var $img = that._newImg(item);
        var $li = baidu('<li></li>');
        $li.attr('id', 'pn_'+item.pn).append($img);
        that._$container.find('[id^=pn]').first().before($li);
        that._$container.find('[id^=pn]').last().remove();    //TODO：注意边界值
    },
    _insertAfter: function(item){
        var that = this;
        var $img = that._newImg(item);
        var $li = baidu('<li></li>');
        $li.attr('id', 'pn_'+item.pn).append($img);
        this._$container.find('[id^=pn]').last().after($li);
        this._$container.find('[id^=pn]').first().remove();    //TODO：注意边界值
    },
    _bindHoverButton: function(){
        this._$prev.on('mouseover',function(){
            baidu(this).addClass('hover');
        }).on('mouseout',function(){
                baidu(this).removeClass('hover');
            });
        this._$next.on('mouseover',function(){
            baidu(this).addClass('hover');
        }).on('mouseout',function(){
                baidu(this).removeClass('hover');
            });
    },
    _bindHoverItem: function(){
        this._$container.on('mouseenter','[id^=pn]', function(e){
            baidu(this).addClass('hover');

        }).on('mouseleave', '[id^=pn]', function(e){
                baidu(this).removeClass('hover');
            });
    },
    _bindClickItem: function(){
        var that = this;
        this._$container.on('click', '[id^=pn]', function(e){
            var id = parseInt(baidu(this).attr('id').replace('pn_',''),10);
            baidu(document).trigger('e_click_item.slide', baidu.extend(that._getStateData(), {currentPn: id}));
        });
        baidu(document).on('e_click_item.slide',function(e,data){
            //console.log(data);
        });
    },
    _bindMouseDownPrevPage: function(){
        //产生持续的滚动信号
        var that = this;
        this._$prev.mousedown(function(e){
            if(that._canMovePrev){
                that._scrollingButtonOn = true;
                baidu(document).trigger('e_start_scroll_prev_page.slide',that._getStateData());
            }
        }).mouseup(function(e){
                if(that._scrollingButtonOn == true){    //没有触发过，就不处理了
                    that._scrollingButtonOn = false;
                    baidu(document).trigger('e_end_scroll_prev_page.slide');
                }
            });
        baidu(document).on('e_start_scroll_prev_page.slide',function(e,data){
            //console.warn('e_start_scroll_prev_page');
            //console.log(data);
        });
        baidu(document).on('e_end_scroll_prev_page.slide',function(e,data){
            //console.warn('e_end_scroll_prev_page');
        });
    },
    _bindMouseDownNextPage: function(){
        //产生持续的滚动信号
        var that = this;
        this._$next.mousedown(function(e){
            if(that._canMoveNext){
                that._scrollingButtonOn = true;
                baidu(document).trigger('e_start_scroll_next_page.slide',that._getStateData());
            }
        }).mouseup(function(e){
                if(that._scrollingButtonOn == true){    //没有触发过，就不处理了
                    that._scrollingButtonOn = false;
                    baidu(document).trigger('e_end_scroll_next_page.slide');
                }
            });
        baidu(document).on('e_start_scroll_next_page.slide',function(e){	 var data=e.triggerData;
            //console.warn('e_start_scroll_next_page');
            //console.log(data);
        });
        baidu(document).on('e_end_scroll_next_page.slide',function(e){	 var data=e.triggerData;
            //console.warn('e_end_scroll_next_page');
        });
    },
    _bindItemWheel: function(){
        var that = this;
        var mouseWheeling = false;  //用于稀释滚轮事件; 为动画过程争取时间(that.conf.scrollSpeed)
        baidu(that._$container).on("mousewheel", function (e, delta) {
            //TODO 加个mousewheel插件会好用些
            delta = e.originalEvent.wheelDelta;
            delta = delta < 0 ? 1 : -1;
            //console.log('[event] ViewSlide: onmousewheel# delta:'+delta);
            if (mouseWheeling) {
                return false;
            }
            if(delta > 0){
                if(that._canMoveNext){
                    mouseWheeling = true;
                    baidu(document).trigger('e_next_item.slide',that._getStateData());
                } else {
                    return;
                }
            } else {
                if(that._canMovePrev){
                    mouseWheeling = true;
                    baidu(document).trigger('e_prev_item.slide',that._getStateData());
                } else {
                    return;
                }
            }
            //that.scrollSlide(delta);
            setTimeout(function () {
                mouseWheeling = false;
            }, that._delayWheeling + 10);
            return false;
        });
    },
    focus: function(pn){
        this._currentPn = pn;
        //console.log('focus: '+pn);
        this._$container.find('[id^=pn]').removeClass('select');
        baidu('#pn_'+pn).addClass('select');
    },
    _updateState: function(data){
        this._firstPn = data.startIndex;
        this._lastPn = data.endIndex;
        this._canMovePrev = data.canMovePrev;
        this._canMoveNext = data.canMoveNext;

        this._$prev.removeClass('disabled');
        if(!data.canMovePrev){
            this._$prev.addClass('disabled');
        }
        this._$next.removeClass('disabled');
        if(!data.canMoveNext){
            this._$next.addClass('disabled');
        }
        this.focus(data.currentPn);
    },
    switchPrev: function(data){
        //console.log(data);
        var list = data.list;
        this._renderTo(list);
        this._updateState(data);
    },
    switchNext: function(data){
        //console.log('switchTo');
        //console.log(data);
        var list = data.list;
        this._renderTo(list);
        this._updateState(data);
    },
    switchTo: function(data){
        //console.log('switchTo');
        //console.log(data);
        var list = data.list;
        this._renderTo(list);
        this._updateState(data);

    },
    moveNext: function(data){
        //console.log('moveNext');
        this._insertAfter(data.list[0]);
        this._updateState(data);
        //console.log(this._getStateData());
    },
    movePrev: function(data){
        //console.log('movePrev');
        this._insertBefore(data.list[0]);
        this._updateState(data);
        //console.log(this._getStateData());
    },
    movePrevPage: function(data){
        //console.log('movePrevPage');
        //console.log(data);
        var list = data.list;
        this._renderTo(list);
        this._updateState(data);
    },
    moveNextPage: function(data){
        //console.log('moveNextPage');
        //console.log(data);
        var list = data.list;
        this._renderTo(list);
        this._updateState(data);
    },
    //获当UI当前的配置信息
    getConfig: function(){
        return {
            pageSize: this._pageSize,
            offset: this._offset
        }
    },
    _getStateData: function(){
        return {firstPn: this._firstPn, lastPn: this._lastPn, pageSize: this._pageSize, offset: this._offset};
    },
    // resize thumb images in the slide show
    _resizeThumb: function (img) {
        var that = this;
        //,img = baidu("img", obj);
        //console.assert(img, '_resizeThumb: obj is NOT exist');
        if(img.width() > img.height()) {
            img.width(window.conf.album.slideSize);
        } else {
            img.height(window.conf.album.slideSize);
        }
    }
};