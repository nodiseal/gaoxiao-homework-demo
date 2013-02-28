
/**
 * 初始化Tab的交互
 */
function initTab(){
    //Tab切换事件
    getEle('nav-photo-tab').addEventListener('click',function(e){
        var ele = e.srcElement; //W3C only
        if(ele && ele.tagName.toLowerCase() == 'li'){ //如果Tab点击切换
            if(ele.className.indexOf('current') == -1){
                var parentEle = ele.parentNode; //ul
                //reset all tab item
                for(var i= 0,len=parentEle.childNodes.length; i<len; i++){
                    var li = parentEle.childNodes[i];
                    if(li.nodeType == 1 && li.className.indexOf('current') > -1){
                        li.className = li.className.replace('current','');
                        //changeData
                        break;
                    }
                }
                //mark select item
                var dataName = ele.getAttribute('data-dataName');
                loadData(dataName);
                //TODO: show loading..
                ele.className = ele.className+' current';

            }
        }
    });
    //恢复到特定的TAB
    var query = Gl.tool.getQuery();
    var dataName = query['dataname'];
    if(dataName){
        switchTab(dataName);
        loadData(dataName);
    }
}


function callbackShowPhoto(retData){
    var data = retData.data;
    var container = 'pic-wrapper';
    //采用拼接字符的方式，分4列从左到右，逐个图片填入容器中
    var strColumn = [
        ['<ul class="pic-column">'],
        ['<ul class="pic-column">'],
        ['<ul class="pic-column">'],
        ['<ul class="pic-column">']
      ];
    for(var i = 0,len=data.length; i<len; i++){
        var photo = data[i];
        var width = 222;    //fix width
        var height = Math.round(photo.thumbnail_height * (width/photo.thumbnail_width));
        strColumn[i%4].push(
            '<li class="pic-item">',
                '<a class="pic" target="_blank" href="show-photo.html?dataName=',retData.dataName,'&pn=',photo.pn,'" target="_blank">',
                    '<img width="',width,'" height="',height,'" src="',photo.thumbnail_url,'" alt="图片占位" />',
                '</a>',
                '<div class="info">',
                    '<div class="tool"></div>',
                    '<p class="desc">',photo.desc,'</p>',
                '</div>',
            '</li>'
        );
    }
    getEle(container).innerHTML = (strColumn[0].join('') + '</ul>' + strColumn[1].join('')+'</ul>'+strColumn[2].join('')+'</ul>'+strColumn[3].join('')+'</ul>');
}
function loadData(dataName){
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = "./data/"+dataName+'.js'+'?_t'+(new Date).getTime().toString(32);
    document.getElementsByTagName('head')[0].appendChild(s);
}
