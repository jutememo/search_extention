// ==UserScript==
// @name           Search Extention
// @description    検索サイトにブックマークを表示する。
// @namespace      http://jutememo.blogspot.com
// @include        http://www.google.*/search* 
// ==/UserScript==
(function(){
    /**
     * 検索結果を表示する領域オブジェクト
     * @param {Object} spec spec.searchSite, spec.bookmarkService
     * @return {searchResultArea}
     */
    var searchResultArea = function(spec){
        // ラベル(タグ)を表示する領域の色
        const TAG_BACKGROUND_COLOR = "#ffffbb";
        // 検索結果を表示する領域を表わすDOM Element
        var _area = document.createElement("div");
        // 上記領域へのはじめて書き込みか？
        var _isFirstAdd = true;
        // 強調したい文字列の配列
        var _stringsToBeEmphasized;
        
        // 検索サイト オブジェクト (searchSite オブジェクトを継承)
        var _searchSite = spec.searchSite;
        // ブックマーク サービス オブジェクト (bookmarkService オブジェクトを継承)
        var _bookmarkService = spec.bookmarkService;
        
        // public -------------------------------------------------------------
        
        var that = {
            /** 
             * ブックマーク サービス をロードする
             */
            load: function(){
                // 既に検索結果がないことを確認
                if (exists()) 
                    return;
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: searchBmUrl(),
                    onload: function(res){
                        setBookmarks(_bookmarkService.get(this.getDom(res)));
                    },
                    /**
                     * XML から DOM Element を生成する
                     * @param {Object} xml XML である文字列
                     */
                    getDom: function(xml){
                        return new DOMParser().parseFromString(xml.responseText, "application/xml");
                    }
                });
            }
        };
        
        // private ------------------------------------------------------------
        
        /**
         * ブックマーク オブジェクトの配列の設定する
         * @param {Array} bookmarks ブックマークの配列
         */
        var setBookmarks = function(bookmarks){
            var div, i;
            // 強調したい文字列を取得
            _stringsToBeEmphasized = _searchSite.getStringToBeEmphasized();
            for (i = 0; i < bookmarks.length; i++) {
                div = document.createElement("div");
                // ブックマークを追加
                div.appendChild(createAnchor({
                    title: bookmarks[i].getTitle(),
                    url: bookmarks[i].getUrl()
                }));
                // ラベル(タグ)を追加
                div.appendChild(createLabels(bookmarks[i].getLabels()));
                add(div);
            }
        };
        
        /**
         * DOM Element を表示領域に追加する
         * @param {Object} elem DOM Element
         */
        var add = function(elem){
            var div = document.createElement('div');
            if (_isFirstAdd) {
                _searchSite.initArea(_area);
                // 既にいスクロールしていた場合、下にずらして表示
                _area.style.marginTop = scrollY.toString() + "px";
                _isFirstAdd = false;
            }
            div.style.paddingBottom = "1em";
            div.appendChild(elem);
            _area.appendChild(div);
        };
        
        /**
         * 検索結果が既に存在するか？
         * 目的: ブラウザの「戻る」対策
         * @return {boolean}
         */
        var exists = function(){
            return document.getElementById("searchResultArea") ? true : false;
        };
        
        /** 
         * タイトルと URL から アンカー要素を作成する
         * @param {Object} anchor anchor.title, anchor.url
         * @return {Object} DOM Element
         */
        var createAnchor = function(anchor){
            var a = document.createElement('a');
            var span = document.createElement('span');
            a.setAttribute('href', anchor.url);
            span.innerHTML = anchor.title;
            span.innerHTML = boldSearchWords(_stringsToBeEmphasized, anchor.title);
            a.appendChild(span);
            return a;
        };
        
        /** 
         * 文字列 str 中の検索ワード word を太文字にする
         * @param {String} word 太文字にしたい文字列
         * @param {String} str 全体の文字列
         * @return {String}
         */
        var boldSearchWord = function(word, str){
            var r = new RegExp(word, 'gi');
            var tag = function(t, s){
                return "<" + t + ">" + s + "</" + t + ">";
            };
            return str.replace(r, tag("b", "$&"));
        };
        /**
         *  文字列 str 中の検索ワード (words) を太文字にする。
         * @param {Array} words 太文字にしたい文字列の配列
         * @param {Object} str 全体の文字列
         * @return {String}
         */
        var boldSearchWords = function(words, str){
            var i, ret = str;
            for (i = 0; i < words.length; i++) {
                ret = boldSearchWord(words[i], ret);
            }
            return ret;
        };
        
        /**
         *  ラベル(タグ)を生成して返す
         * @param {Array} labels ラベルの配列
         * @return {Object} DOM Element
         */
        var createLabels = function(labels){
            var div = document.createElement('div');
            var span, a, i;
            div.style.paddingTop = "4px";
            div.style.fontSize = "90%";
            div.style.cssFloat = "right";
            for (i = 0; i < labels.length; i++) {
                span = document.createElement('span');
                a = createAnchor({
                    url: _searchSite.getSearchUrl(labels[i]),
                    title: labels[i]
                });
                span.appendChild(a);
                span.innerHTML = " [ <span style='background-color:" +
                TAG_BACKGROUND_COLOR +
                ";'>" +
                span.innerHTML +
                "</span>] ";
                div.appendChild(span);
            }
            return div;
        };
        
        /**
         * 検索サイトで検索した単語から、ブックマーク を検索するための URL を生成
         * @return {String}
         */
        var searchBmUrl = function(){
            return _bookmarkService.getSearchUrl() + _searchSite.getQuery();
        };
        
        return that;
    };
    
    //#########################################################################
    
    var Abstract = {};
    
    /**
     * 検索サイトに対応したオブジェクト。
     * このオブジェクトを拡張して、具体的なサイトに対応したオブジェクトを作成する。
     * @param {Object} spec spec.query, spec.searchUrl
     * @param {Object} my このオブジェクトを継承したオブジェクトからアクセス可能なオブジェクト
     * @return {searchSite}
     * spec.searchUrl : このサイトで検索するための URL 。ただし、検索文字列に対応したパラメータの値を除く。
     */
    Abstract.searchSite = function(spec, my){
        my = my ||
        {};
        
        // public -------------------------------------------------------------
        
        var that = {
            /** 
             *  このサイトで検索したときの、検索文字列に対応したパラメータの値を返す
             *  @return {Stirng}
             */
            getQuery: function(){
                return spec.query;
            },
            /**
             *  文字列 q を このサイトで検索するための URL を返す
             * @param {String} q クエリ
             * @return {String}
             */
            getSearchUrl: function(q){
                var query = q !== "" ? encodeURIComponent(q) : "";
                return spec.searchUrl + query;
            },
            /** 
             * 検索結果を表示する領域 area を初期化する
             * @param {searchResultArea} area
             */
            initArea: function(area){
                GM_log("searchSite.initArea()がオーバーライドされていません。");
            },
            /**
             * 検索文字列の配列を返す。ただし、結果の表示において強調したい文字列のみ。
             * @return {String}
             */
            getStringToBeEmphasized: function(){
                GM_log("searchSite.getStringToBeEmphasized()がオーバーライドされていません。");
            }
        };
        
        // protected ----------------------------------------------------------
        
        /**
         *  ブックマークを表示する領域のデフォルトの設定
         * @param {Object} Dom Element 設定する対象
         * @param {String} areaId 領域のid名
         * @param {String} targetId このidの要素の前に領域を挿入
         * @param {String} removeId 削除する要素のid
         */
        var defaultInitArea = function(area, areaId, targetId, removeId){
            var initArea = function(){
                area.setAttribute("id", areaId);
                area.style.cssFloat = "right";
                area.style.width = "35%";
                area.style.padding = "10px";
            }();
            var removeAd = function(){
                var div = document.getElementById(removeId);
                if (div) {
                    div.parentNode.removeChild(div);
                }
            }();
            div = document.getElementById(targetId);
            div.parentNode.insertBefore(area, div);
        };
        my.defaultInitArea = defaultInitArea;
        
        return that;
    };
    
   
    /**
     *  ブックマーク サービスを表わすオブジェクト。
     *  このオブジェクトを拡張して、具体的なオンラインブックマークに対応したオブジェクトを作成。
     * @param {Object} spec spec.url
     * @return {bookmarkService}
     */
    Abstract.bookmarkService = function(spec){
        return {
            // public ---------------------------------------------------------
            
            /**
             * このブックマークサービスを検索するための URL を返す。ただし、検索結果が XML で返されること。
             * @return {String}
             */
            getSearchUrl: function(){
                return spec.url;
            },
            /** 
             * DOM からブックマークの配列を返す
             * @param {Object} dom DOM Element
             * @return {Array} bookmark を継承したオブジェクトの配列
             */
            get: function(dom){
                GM_log("bookmarkService.get()がオーバーライドされていません。");
            }
        };
    };
    
    /**
     * bookmark オブジェクト
     * このオブジェクトを拡張して具体的なブックマークに対応したオブジェクトを生成する
     * @param {Object} spec spec.title, spec.url
     * @param {Object} my このオブジェクトを継承したオブジェクトからアクセス可能なオブジェクト
     * @return {bookmark}
     */
    Abstract.bookmark = function(spec, my){
        my = my ||
        {};
        // ラベル (タグ) の配列
        var _labels = [];
        
        my.labels = _labels;
        
        return {
            // public ---------------------------------------------------------
            
            /**
             * タイトル
             * @return {String}
             */
            getTitle: function(){
                return spec.title;
            },
            /**
             * URL
             * @return {String}
             */
            getUrl: function(){
                return spec.url;
            },
            /**
             * ラベルの配列
             * @return {Array}
             */
            getLabels: function(){
                return _labels;
            },
            /**
             * DOM Element からラベル(タグ)の配列を設定する。
             * @param {Object} dom DOM Element
             */
            setLabelsFromDom: function(dom){
                GM_log("bookmark.setLabelsFromDom(dom)がオーバーライドされていません。");
            }
        };
    };
    
    //#########################################################################
    
    var Util = {};
    
    /**
     * Google 検索において、検索文字列を分割し、強調して表示したい文字列を抽出。
     *
     * - 以下の検索文字列中の文字列は捨てる。
     *   * AND, OR, |, "
     *   * 接頭辞が `-' の文字列
     * - フレーズ検索は、フレーズのまま取り出す。
     * @param {Object} str
     *
     * TODO 読みにくいし、Google オプションの一部しか対応していないので要改善。
     */
    Util.strExtracter = function(str){
        var that = {};
        // 分割対象の文字列
        var _s = str;
        // 引用符を指し示すための 2 つの値。文字列 _s のインデックスを表わす。
        var _p = [0, 0];
        
        // public -------------------------------------------------------------
        
        // 分割する
        var split = function(str){
            // "XXXXX+YYYYY" の + を空白に置き換える
            replace();
            // 文字列から引用符を取り除き、文字列 str で分割
            return del(_s.replace(/"/g, "").split(str));
        };
        that.split = split;
        
        // private ------------------------------------------------------------
        
        // 次の str の位置に対応した値に  p[i] をする
        var findNext = function(str, p, i){
            var idx = _s.indexOf(str, function(index){
                if (index === 1) 
                    return p[0] + 1;
                else 
                    return p[1];
            }(i));
            if (idx !== -1) {
                return (_p[i] = idx);
            }
            else {
                return null;
            }
        };
        // 文字列 _s のインデックス _p[0], _p[1] の間に、文字 str が存在するか?
        var exists = function(str){
            if (_s.substring(_p[0], _p[1]).indexOf(str) != -1) {
                return true;
            }
            else {
                return false;
            }
        };
        // 文字列 _s のインデックス _p[0], _p[1] の間にある文字が、全て文字 str であるか？
        var all = function(str){
            var target = _s.substring(_p[0] + 1, _p[1]);
            var i;
            for (i = 0; i < target.length; i++) {
                if (target[i] !== str) {
                    return false;
                }
            }
            return true;
        };
        // フレーズ検索における引用符 "XXXXX+YYYYY" の中にある`+' を空白に置き換える。
        // ただし、検索時に単語と単語を区切るための空白と置き換わっている`+' はそのままにしておく。
        var replace = function(){
            if (findNext('"', _p, 0) !== null && findNext('"', _p, 1) !== null) {
                if (exists("+") && !all("+")) {
                    _s = _s.substring(0, _p[0]) +
                    _s.substring(_p[0], _p[1]).replace(/\+/g, " ") +
                    _s.substring(_p[1], _s.length);
                }
            }
            else {
                return this;
            }
            replace();
        };
        var del = function(words){
            var ret = [], i;
            for (i = 0; i < words.length; i++) {
                // 「空文字, | , 先頭が - ではじめる文字列, AND, OR」を取り除く
                if (/^$|\||^-|AND|OR/g.test(words[i])) 
                    continue;
                ret.push(words[i]);
            }
            return ret;
        };
        
        return that;
    };
    
    //#########################################################################
    
    var Google = {};
    
    /**
     *  Google 検索サイトに対応したオブジェクト。
     *  @inherits searchSite
     */
    Google.searchSite = function(){
        var my = {};
        // searchSite を継承したオブジェクトを生成
        var that = Abstract.searchSite({
            // Google 検索時点のクエリ文字列
            query: location.search.match(/q=(.*?)(?:&|$)/)[1],
            // Google 検索をするための URL
            searchUrl: "http://" + location.hostname + "/search?q="
        }, my);
        
        // public -------------------------------------------------------------
        
        /**
         * 検索結果の表示領域を設定
         * @Override
         */
        var initArea = function(area){
            // TODO area の設定をカスタマイズできるようにする
            my.defaultInitArea(area, "searchResultArea", "res", "mbEnd");
        };
        that.initArea = initArea;
        
        /**
         * Google 検索文字列の配列を返す。ただし、結果の表示において強調したい文字列のみ。
         * @Override
         * @return {Array}
         */
        var getStringToBeEmphasized = function(){
            return Util.strExtracter(decodeURIComponent(that.getQuery())).split("+");
        };
        that.getStringToBeEmphasized = getStringToBeEmphasized;
        
        return that;
    };
    
    /** 
     * Google Bookmarks オブジェクト
     * @inherits bookmarkService
     * @return {googleBookmarkService}
     */
    Google.bookmarkService = function(){
        // bookmarkService を継承したオブジェクトを生成
        var that = Abstract.bookmarkService({
            // Google Bookmarks を検索するための URL (xml で出力 )
            url: "http://www.google.com/bookmarks/find?output=xml&q="
        });
        
        // public -------------------------------------------------------------
        
        /**
         * Dom Element からブックマーク オブジェクトの配列を返す
         * @Override
         * @param {Object} dom DOM Element
         * @return {Array}
         */
        get = function(dom){
            var bookmarks = dom.getElementsByTagName("bookmark");
            var bm;
            var ret = [];
            for (var i = 0; i < bookmarks.length; i++) {
                bm = bookmarks[i];
                ret.push(Google.bookmark({
                    title: bm.getElementsByTagName('title')[0].textContent,
                    url: bm.getElementsByTagName('url')[0].textContent
                }).setLabelsFromDom(bm));
            }
            return ret;
        };
        that.get = get;
        
        return that;
    };
    
    /**
     * Google ブックマーク オブジェクト
     * @inherits bookmark
     * @param {Object} spec
     * @return {googleBookmark}
     */
    Google.bookmark = function(spec){
        var my = {};
        // bookmark を継承したオブジェクトを生成
        var that = Abstract.bookmark(spec, my);
        
        // public -------------------------------------------------------------
        
        /**
         * DOM Element からラベル(タグ)を生成
         * @Override
         * @param {Object} dom
         */
        that.setLabelsFromDom = function(dom){
            var labels = dom.getElementsByTagName('label');
            for (var i = 0; i < labels.length; i++) {
                my.labels.push(labels[i].textContent);
            }
            return this;
        };
        return that;
    };
    
    //#########################################################################
    
    searchResultArea({
        searchSite: Google.searchSite(),
        bookmarkService: Google.bookmarkService()
    }).load();
})();
