/**
 * Created by wjc on 2016/7/13.
 * @title 简易路由模块
 * @version 1.0.0
 * @description
 * 已实现功能：页面前进、后退、跳转，状态输出，页面加载一次，可配置入口
 * 兼容性：用到es5、H5的history
 * 放在服务器上才能跑
 *
 * 页面状态回调方法 stateCallback
 * 1 created   页面创建完成 表示dom已加载 但是还没有显示
 * 2 pageIn    进入页面 表示页面处于显示状态
 * 3 pageOut   退出页面 表示页面处于隐藏状态
 *
 * 注释中 - 表示可选参数
 */
(function(window){
    var location = window.location;
    var history = window.history;

    var Router = function(){
        //路由根目录
        this.rootUrl = location.protocol+'//'+location.hostname+':'+location.port;

        //页面的后缀  写了这个链接里可以不写后缀
        this.defaultPrefix = '.html';

        //页面入口地址
        this.entranceUrl = '';;

        this._urlUpdateNo = 1;   //用于控制是否修改浏览器地址
        this._nameConfig = {
            pageTagName: 'page',    //页面标签名 用于识别单页面
            attrOneLoad: 'oneLoad', //只加载一次 可以加在page、a标签上
            attrBack: 'back',   //返回标记 可以加在a标签上
            classCurrentPage: 'currPage',    //标记当前展示的页面
            idPageContent: 'content'    //主体存放内容的区域id
        };
    };

    /**
     * 启动路由
     * @param o {root: 相对根路径, -defaultPrefix: 页面后缀, -entrance: 页面入口, -pageContentId: 内容区域ID, -stateCallback: 页面状态回调}
     */
    Router.prototype.setup = function(o){
        if(this.verifyUrl(o.root)) this.rootUrl += o.root;
        this.defaultPrefix = o.defaultPrefix ? '.'+ o.defaultPrefix : this.defaultPrefix;
        o.pageContentId && (this._nameConfig.idPageContent = o.pageContentId)
        this.stateCallback = o.stateCallback || '';

        //如果页面没有配置入口 必须在启动页写page标签 格式 <page class="currPage"></page>
        this.entranceUrl = o.entrance;
        if(this.entranceUrl){   //如果有入口 首次加载
            this._urlUpdateNo = -1;
            this.startDirect({url: this.entranceUrl});
        }else{
            var current = this.getCurrentPage();
            if(current){
                var vl = this.getUrl(location.href);
                current.id = this.urlToId(vl.url);
                current.link = vl.url;
                typeof this.stateCallback === 'function' && this.stateCallback(1, current.id, current.link);
                typeof this.stateCallback === 'function' && this.stateCallback(2, current.id, current.link);
            }
        }

        window.addEventListener('popstate', this._popstate.bind(this));
        document.addEventListener('click', this._linkHeadOff.bind(this), false);
    };

    /**
     * 拦截A标签默认事件 并且控制跳转
     * @private
     */
    Router.prototype._linkHeadOff = function(){
        if(event.target && "a" == event.target.tagName.toLowerCase()){
            event.preventDefault();
            var a = event.target;
            if(a.hasAttribute(this._nameConfig.attrBack)){
                history.back();
            }else{
                var href = a.pathname;
                href && this.startDirect({url: href, oneLoad: a.hasAttribute(this._nameConfig.attrOneLoad)});
            }
        }
    };

    /**
     * 监听浏览器前进后退事件  切换相应的模块
     * @param e
     * @private
     */
    Router.prototype._popstate = function(e){
        this._urlUpdateNo = 0;
        this.startDirect({url: location.href});
    };

    /**
     * 启动页面
     * url格式： /page/aaa
     * @param url
     * @param -refresh 强制从服务器获取最新的 默认false
     * @param -oneLoad 页面只加载一次 当该页面退出时（前进、后退）,销毁页面
     */
    Router.prototype.startDirect = function(param){
        var vl = this.getUrl(param.url);
        for(var v in vl){ param[v] = vl[v]; }
        this._requestPageModel(param);
    };

    /**
     * 切换显示页面
     * @param pageId 页面id
     * @param url 原路径
     * @param fullUrl 绝对路径url
     * @param -oneLoad 表示只存在一次，当离开页面(前进、后退)时销毁页面
     */
    Router.prototype._switchPage = function(param){
        var newPage = document.getElementById(param.pageId);
        if (newPage) {    //要显示的页面存在 则直接切换
            var pushState = 1;
            newPage.link = param.url;
            var beforePage = this.getCurrentPage();
            if(param.oneLoad){
                newPage.setAttribute(oneLoad, '');
            }
            var currPages = document.getElementsByClassName(this._nameConfig.classCurrentPage);
            for (var p = 0; p < currPages.length; p++) {
                if (param.pageId !== currPages[p].id && currPages[p].hasClass(this._nameConfig.classCurrentPage)) {
                    var className = currPages[p].className;
                    var pId = currPages[p].id,
                        pUrl = currPages[p].link;
                    currPages[p].className = (' '+className+' ').replace(new RegExp(' '+this._nameConfig.classCurrentPage+' ', 'g'), '');
                    typeof this.stateCallback === 'function' && this.stateCallback(3, pId, pUrl);
                }
            }
            if (!newPage.hasClass(this._nameConfig.classCurrentPage)) {
                newPage.className += ' '+this._nameConfig.classCurrentPage;
                typeof this.stateCallback === 'function' && this.stateCallback(2, param.pageId, param.url);
            }
            if(beforePage && beforePage.hasAttribute(this._nameConfig.attrOneLoad)){  //销毁上一个页面
                pushState = 2;
                beforePage.remove();
            }
            this.urlUpdate(param.fullUrl, pushState);
        }
    };

    /**
     * ajax从其他url拉取带有page标记的模块 如果该url存在多个page标记 只取第一个
     * @param fullUrl 全路径
     * @param url 原路径
     * @param -refresh 强制从服务器获取最新的 默认false
     * @param -oneLoad 页面只加载一次 当该页面退出时（前进、后退）,销毁页面 默认false
     */
    Router.prototype._requestPageModel = function (param) {
        var pageId = param.pageId = this.urlToId(param.url);
        var newPage = document.getElementById(pageId);
        if (newPage && !param.refresh) {
            this._switchPage(param);
        } else {
            var xhr = new XMLHttpRequest();
            xhr.open('post', param.fullUrl);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var newDom = document.createElement('div');
                    newDom.style.display = 'none';
                    newDom.innerHTML = xhr.responseText;
                    var doms = newDom.getElementsByTagName(this._nameConfig.pageTagName);
                    if (doms.length > 0) {
                        var content = document.getElementById(this._nameConfig.idPageContent);
                        doms[0].id = pageId;
                        content.appendChild(doms[0]);
                        typeof this.stateCallback === 'function' && this.stateCallback(1, pageId, param.url);
                        this._switchPage(param);
                    }
                    xhr = null;
                }
            }.bind(this);
            xhr.send();
        }
    };

    /**
     * 更新浏览器地址
     * @param fullUrl
     * @param state 1表示新建历史记录 2表示覆盖历史记录
     */
    Router.prototype.urlUpdate = function (fullUrl, state){
        if(this._urlUpdateNo > 0){
            switch(state){
                case 1: history.pushState(null, '', fullUrl); break;
                case 2: history.replaceState(null, '', fullUrl); break;
            }
        }else if(-1 == this._urlUpdateNo){
            history.replaceState(null, '', fullUrl);
        }
        this._urlUpdateNo = 1;
    }

    /**
     * 拿到当前显示的页面
     * @returns Element
     */
    Router.prototype.getCurrentPage = function (){
        var currPages = document.getElementsByClassName('currPage');
        if(currPages.length > 0){
            return currPages[0];
        }
    };

    /**
     * 传入URL进行转换  传入值可以是全路径或者部分路径
     * @returns {{url: string, fullUrl: string}}
     */
    Router.prototype.getUrl = function(u){
        if(u && (u = u.replace(this.rootUrl, '').replace(this.defaultPrefix, '')) && this.verifyUrl(u)){
            return {
                url: u,
                fullUrl: this.rootUrl + u + this.defaultPrefix
            }
        }
        throw 'url format error, should be "/a"'
    };

    /**
     * URL转id
     * @param u
     * @returns {*}
     */
    Router.prototype.urlToId = function(u){
        if(this.verifyUrl(u)){
            return u.replace(/\//g, '_');
        }
        return '';
    };

    if(!Element.prototype.hasClass){
        Element.prototype.hasClass = function(c){
            if(this.className && new RegExp(' '+c+' ').test(' '+this.className+' ')){
                return true;
            }
            return false;
        }
    }

    /**
     * url校验
     * @param u 格式：/page/aaa
     * @returns {boolean}
     */
    Router.prototype.verifyUrl = function(u){
        if(u && /^\/[\w\d_\/]+[^\/]$/.test(u)){
            return true;
        }
        return false;
    };

    window.router = new Router();
})(window);