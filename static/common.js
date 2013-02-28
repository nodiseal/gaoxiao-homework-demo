/**
 * 工具函数，根据ID获取元素
 * @param id
 * @return {HTMLElement}
 */
function getEle(id){
    return document.getElementById(id);
}


window.Gl || (window.Gl = {});
Gl.tool = {
    // get url's query params
    getQuery: function (url) {
        url = url ? url : window.location.search;   //url?query#hash will cause error!
        if (url.indexOf("?") < 0) return {};
        var queryParam =  url.substring(url.indexOf("?") + 1, url.length).split("&"),
            queryObj = {};
        for (var i = 0,j; j = queryParam[i]; i++){
            queryObj[j.substring(0, j.indexOf("=")).toLowerCase()] = decodeURIComponent(j.substring(j.indexOf("=") + 1, j.length));
        }
        return queryObj;
    }
};

/**
 * 获取当前浏览器的类型信息
 * @return {String}
 */
function getBrowserInfo(){
    var userAgent = navigator.userAgent.toLowerCase();
    var browserType = '';
    if(/chrome/.test( userAgent )){
        browserType = 'Chrome';
    } else if (/webkit/.test( userAgent )){
        browserType = 'Safari';
    } else if(/msie/.test(userAgent)) {
        browserType = 'IE';
    } else {
        browserType = 'unknown';
    }
    return browserType;
}

function updateBrowerInfo(){
    //显示日期：xxxx年yy月zz日
    var d = new Date();
    var strTimeTip = d.getFullYear()+'年'+ (d.getMonth()+1)+'月'+ d.getDate()+'日';
    getEle('show-date-tip').innerHTML = strTimeTip;

    //显示浏览器信息
    getEle('show-browser').innerHTML = getBrowserInfo()+'浏览器';

}

function switchTab(newDataName){
    var parentEle = getEle('nav-photo-tab'); //ul
    //reset all tab item
    for(var i= 0,len=parentEle.childNodes.length; i<len; i++){
        var li = parentEle.childNodes[i];
        if(li.nodeType == 1){
            var dataName = li.getAttribute('data-dataName');
            if(dataName != newDataName && li.className.indexOf('current') > -1){
                li.className = li.className.replace('current','');
            } else if(dataName == newDataName){
                li.className = li.className+' current';
                //loadData(dataName);
            }
        }
    }
}

function initPicAction(){
}
/**
 * 做搜索表单的提交前简单验证工作，如填写不合法，则不提交
 */
function initSearchForm(){
    getEle('search-form').addEventListener('submit',function(e){
        //判断用户是否填了内容
        var word = getEle('search-filed-word').value;
        if(word.length == 0){
            alert('no query word input,please check!');
            e.preventDefault();
            return false;
        }
    });
}

