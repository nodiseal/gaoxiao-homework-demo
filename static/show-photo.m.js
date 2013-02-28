var model = (function () {

    var _currentIndex = 0; //当前选中项
    var _firstIndex = 0;
    var _lastIndex = 0;
    var _totalNum = 0;
    var _dataList = [];
    var _isFetching = false;    //正在获取数据
    var DEFAULT_PREV_MORE = 20;
    var DEFAULT_NEXT_MORE = 20;
    var PAGE_SIZE = 20;
    var that = null;
    var _urlPrefix = '/';


    return {
//        info:function(){
//              //console.log({total: _totalNum, current: _currentIndex,  first: _firstIndex, last: _lastIndex, data: _dataList});
//        },

        /**
         * 初始化数据： 定位信息（第几张）
         * @param callback
         * @param conf
         */
        init: function (conf, callback) {
            //console.info('Model: init');
            that = this;
            _currentIndex = conf.currentPn;
            _urlPrefix = conf.urlPrefix;
            //PAGE_SIZE = conf.size;

            //初始化时，请求第一批数据
            that._getData(_currentIndex, 1, callback);
        },
        _getStateData: function(pn, list){

            var canMovePrev = false;
            var canMoveNext = false;
            if(pn > 0){
                canMovePrev = true;
            }
            if(pn+list.length < _totalNum){
                canMoveNext = true;
            }
            var canSwitchPrev = false;
            var canSwitchNext = false;
            if(_currentIndex > 0){
                canSwitchPrev = true;
            }
            if(_currentIndex < _totalNum-1){
                canSwitchNext = true;
            }
            return {
                totalNum: _totalNum,
                startIndex: pn,
                endIndex: pn+list.length-1,
                currentPn: _currentIndex,
                canMovePrev: canMovePrev,
                canMoveNext: canMoveNext,
                canSwitchPrev: canSwitchPrev,
                canSwitchNext: canSwitchNext,

                currentItem: _dataList[_currentIndex-_firstIndex],
                list: list
            }
        },
        /**
         *
         * 这个函数负责，根据当前的数据缓存状态，获取更多数据。
         * 【前提：UI层的数据获取(pn,limit)，不会超过这里的优化值或者固定SIZE窗口值(pn-pre, SIZE)】，为了方理处理，这里固定每次请求的分页量 SIZE。
         * 这个在保证数据能返回的基础上，以提升网络交互为目标，而不是以被请求量为主要目标，所以一般会多请求一定的量。
         * 1. 对于初始化的获取，为了数据利用更高效，方便用户简单前翻，pn会向后偏 DEFAULT_PREV_MORE 的量。这里默认一次请求不会超过SIZE的窗口量，所以暂不修正rn
         * 2. 对于后续的获取过程，则根据向前取还是向后取来判断，按(firstIndex-SIZE,SIZE)或者(lastIndex+1, SIZE)来返回，保证数据完整。
         */
        _getData: function(pn, rn, callback){
            //note: 这里忽略rn，是基于设计的前提，rn不会接近SIZE的值。预留rn， 是考虑到，后续有可能rn > SIZE要分批的请求。。处理就比较复杂了
            var that = this;
            //第一次请求时，要向后多请求DEFAULT_PREV_MORE的量
            var reqStartIndex = pn;
            var reqPageSize = PAGE_SIZE;   //这个固定的
            if(_dataList.length > 0 && (pn >= _firstIndex) && ((pn+rn-1 <= _lastIndex) || _lastIndex+1 == _totalNum)){ //数据足够返回
                if((_lastIndex+1 == _totalNum) && (pn+rn > _totalNum)){
                    rn = Math.max(0, _totalNum-pn); //不够的话，就少取点了
                }
                var retData = that._getStateData(pn, _dataList.slice(pn-_firstIndex, pn+rn-_firstIndex));

                //数据足够返回，也得提前考虑库存数据不足的问题了哦
                if(!_isFetching){
                    //fetch data
                    if(_firstIndex > 0 && (pn-_firstIndex) <= DEFAULT_PREV_MORE){ //前置不足
                        //getPrevMore
                        //console.info('AUTO pre fecthing! PREV MORE!');
                        _isFetching = true;
                        that._requestPrevData();
                    } else if(((_lastIndex<_totalNum-1) && (_lastIndex-(pn+rn-1)) <= DEFAULT_NEXT_MORE)) {   //后置不足
                        //getNextMore
                        _isFetching = true;
                        that._requestNextData();
                        //console.info('AUTO pre fecthing! NEXT MORE!');
                    }
                } else {
                    //console.warn('_isFetching = true;');
                }
                //下面可以正常返回的
                if(callback != null){
                    callback(retData);
                } else {    //同步请求
                    return retData;
                }
            } else { //不够返回
                if(_isFetching){
                    //console.warn('_isFetching=TRUE');
                    return false;
                }
                //fetch data
                _isFetching = true;

                if(callback){
                    var onsuccess = function(retData){
                        callback(that._getStateData(pn, _dataList.slice(pn-_firstIndex, pn+rn-_firstIndex)));
                    };
                } else {
                    var onsuccess = null;
                }
                if(_dataList.length == 0){   //初始化请求
                    reqStartIndex = Math.max(reqStartIndex-DEFAULT_PREV_MORE, 0);   //case 1
                    return that._requestMore(reqStartIndex, reqPageSize, onsuccess);
                } else if(pn < _firstIndex){   //如果需要前面的数据(前翻）
                    return that._requestPrevData(onsuccess);
                } else if(pn+rn-1 > _lastIndex) { //如果需要后面的更多数据（后翻）
                    return that._requestNextData(onsuccess);
                }
            }
        },
        //已经处理好参数了，无需修正
        _requestMore: function(reqStartIndex, reqPageSize, callback){
            if(callback != null){
                that._getNetDataList(reqStartIndex, reqPageSize,function(retData){
                    that._updateData(reqStartIndex, retData);
                    callback();
                    //callback(_dataList.slice(startIndex-_firstIndex, startIndex+limit-_firstIndex));
                    _isFetching = false;
                });
            } else {
                //没有就先请求了再说，但是，就不会返回给callback了
                that._getNetDataList(reqStartIndex, reqPageSize,function(retData){
                    that._updateData(reqStartIndex, retData);
                    _isFetching = false;
                });
                return false;   //没有数据可以返回呀亲！
            }
        },
        _requestPrevData: function(callback){
            var reqStartIndex = Math.max(_firstIndex - PAGE_SIZE, 0);   //_firstIndex < PAGE_SIZE,就可能成负的了。。
            var reqPageSize =  Math.min(_firstIndex, PAGE_SIZE);    //修正下，避免重复请求已有数据：当_firstIndex < PAGE_SIZE时，则前面刚好了只剩下 _firstIndex个数据了！
            return that._requestMore(reqStartIndex, reqPageSize, callback);
        },
        _requestNextData: function(callback){
            var reqStartIndex = _lastIndex+1;   //下一页
            var reqPageSize = Math.min(_totalNum-_lastIndex, PAGE_SIZE);    //如果只不足SIZE了，可以请求“严谨点”，不超
            return that._requestMore(reqStartIndex, reqPageSize, callback);
        },
        _updateData: function(start, retData){
            //console.info('Model:_updateData');
            var data = retData.data;

            if(_dataList.length == 0){  //初始update
                _dataList = data;
                _firstIndex = start;
                _lastIndex = start+data.length-1;
            } else {
                if(start < _firstIndex){
                    _dataList = data.slice(0, _firstIndex-start).concat(_dataList); //反过来加
                    _firstIndex = start;
                }
                if(start+data.length > _lastIndex){
                    _dataList = _dataList.concat(data.slice(1+_lastIndex-start, data.length));
                    _lastIndex = start+data.length-1;
                }
            }

            _totalNum = parseInt(retData.total_number, 10);
        },
        getListFull: function(pn, rn, callback){
            var pn = this._getFixedPageSizePn(pn, rn);
            //console.info('Model:getListFull pn:'+pn+' rn:'+rn);
            if(pn < 0 || pn >= _totalNum){
                //console.warn('invalide index');
                return false;
            } else {
                //fire event
                return this._getData(pn,rn, callback);
            }
        },
        getListSync: function(index, limit){
            var me = this;
            return me._getData(index, limit);
        },
        /**
         * 向前下一页，但是固定为pageSize，除非total也不足
         * @param pn
         * @param pageSize
         * @param callback
         */
        moveNextPageFull: function(pn, pageSize, callback){
            var index = pn + pageSize;
            index = this._getFixedPageSizePn(index, pageSize);
            return this._getData(index, pageSize, callback);
        },
        /**
         * 返回上一页，但是固定为pageSize，除非total也不足
         * @param pn
         * @param pageSize
         * @param callback
         */
        movePrevPageFull: function(pn, pageSize, callback){
            var index = pn - pageSize;
            index = this._getFixedPageSizePn(index, pageSize);
            return this._getData(index, pageSize, callback);
        },
        _getFixedPageSizePn: function(pn, pageSize){
            if(pn < 0){
                pn = 0;
            } else {    //pn>0 后面数据不够一屏，就往再退点呗（尽量保证有一页）
                if(pn+pageSize > _totalNum){
                    pn = Math.max(0, _totalNum-pageSize);
                }
            }
            return pn;
        },
        /**
         * 针对给定的pn值，返回向后移动的一个单元，不影响current的值
         */
        movePrev:function (pn, callback) {
            //console.info('Model:movePrev');
            var index = pn-1;
            if(index < 0){
                //console.warn('invalide index');
                return false;
            } else {
                //fire event
                return this._getData(index,1, callback);
            }
        },
        /**
         * 针对给定的pn值，返回向前移动一个单元，不影响current值
         */
        moveNext:function (pn, callback) {
            //console.info('Model:moveNext');
            var index = pn+1;
            if(index >= _totalNum){
                //console.warn('invalide index');
                return false;
            } else {
                //fire event
                return this._getData(index, 1, callback);
            }
        },
        /**
         * 将整体重置到特定的单元位置，会修正下标
         *  返回一个当前数据； 如果数据不足，要向下层请求
         */
        switchTo:function (index, callback) {
            //console.info('Model:switchItem');
            if(index < 0 || index > _totalNum){
                index = 0;
                //console.warn('invalide index');
            }
            //fire event
            _currentIndex = index;
            return this._getData(index, 1, callback);
        },

        /**
         * 针对current，向后移动一个单元;同时更新offset
         */
        switchPrev:function (callback) {
            //console.info('Model:switchPrev');
            var index = _currentIndex-1;
            if(index < 0){
                //console.warn('invalide index');
                return false;
            } else {
                //fire event
                _currentIndex = index;
                return this._getData(index, 1, callback);
            }
        },
        /**
         * 针对current,向前移动一个单元，同时更新offset
         */
        switchNext:function (callback) {
            //console.info('Model:switchNext');
            var index = _currentIndex+1;
            if(index < 0 || index >= _totalNum){
                //console.warn('invalide index');
                return false;
            } else {
                //fire event
                _currentIndex = index;
                return this._getData(index, 1, callback);
            }
        },
        /**
         * 将current对应的单元，返回
         * @return {*}
         */
        getCurrent:function () {
            //console.info('Model:getCurrent');
            //console.log(_dataList[_currentIndex-_firstIndex]);

            return _dataList[_currentIndex-_firstIndex];
        },
        getCurrentIndex: function(){
            return _currentIndex;
        },
        getTotalCount: function(){
            return _totalNum;
        },
        _getNetDataList: function(offset, limit, callback){
            //console.log('Model: getList');
            //console.log('offset:'+offset+' limit:'+limit);
            var rUrl;
            var urlPrefix = _urlPrefix;
            rUrl = urlPrefix + "&start=" + offset + "&rn=" + limit;
            window.callbackShowPhoto = function (datas) {
                //console.log('model:_getNetDataList');
                //console.log(datas);
                callback(datas);
            };
            baidu.sio(rUrl).callByServer('callbackShowPhoto');

        }
    };
})();
