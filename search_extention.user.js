// ==UserScript==
// @name           Search Extention
// @description    検索サイトにブックマークを表示する。
// @namespace      http://jutememo.blogspot.com
// @include        http://www.google.*/search* 
// ==/UserScript==
(function(){
    // 検索結果を表示する領域オブジェクト
    var searchResultArea = function(spec){
        // ラベル(タグ)を表示する領域の色
        const TAG_BACKGROUND_COLOR = "#ffffbb";
        // 検索結果を表示する領域
        var _area = document.createElement("div");
        // 上記領域へのはじめて書き込みか？
        var _isFirstAdd = true;
        // 強調したい文字列の配列
        var _stringsToBeEmphasized;
        
        // 検索サイト
        var _searchSite = spec.searchSite;
        // ブックマーク サービス
        var _bookmarkService = spec.bookmarkService;
        
        // public -------------------------------------------------------------
        
        var that = {
            // ブックマーク サービス をロード
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
                    // XML から DOM Element を生成
                    getDom: function(xml){
                        return new DOMParser().parseFromString(xml.responseText, "application/xml");
                    }
                });
            }
        }
        
        // private ------------------------------------------------------------
        
        // ブックマーク オブジェクトの配列の設定
        var setBookmarks = function(bookmarks){
            var div, i;
            // 強調したい文字列を取得
            _stringsToBeEmphasized = _searchSite.getStringToBeEmphasized();
            for (i = 0; i < bookmarks.length; i++) {
                div = document.createElement("div");
                // ブックマークを追加
                div.appendChild(createAnchor({
                    title: bookmarks[i].title,
                    url: bookmarks[i].url
                }));
                // ラベル(タグ)を追加
                div.appendChild(createLabels(bookmarks[i].labels));
                add(div);
            }
        }
        
        // DOM Element を表示領域に追加
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
        }
        
        // 検索結果が既に存在するか？
        // 目的: ブラウザの「戻る」対策
        var exists = function(){
            return document.getElementById("searchResultArea") ? true : false;
        }
        
        // タイトルと URL から アンカー要素を作成する
        var createAnchor = function(anchor){
            var a = document.createElement('a');
            var span = document.createElement('span');
            a.setAttribute('href', anchor.url);
            span.innerHTML = anchor.title;
            span.innerHTML = boldSearchWords(_stringsToBeEmphasized, anchor.title);
            a.appendChild(span);
            return a;
        }
        
        // 文字列  str 中の検索ワード word を太文字にする
        var boldSearchWord = function(word, str){
            var r = new RegExp(word, 'gi');
            var tag = function(t, s){
                return "<" + t + ">" + s + "</" + t + ">";
            }
            return str.replace(r, tag("b", "$&"));
        }
        // 文字列 str 中の検索ワード (words) を太文字にする。 
        var boldSearchWords = function(words, str){
            var i, ret = str;
            for (i = 0; i < words.length; i++) {
                ret = boldSearchWord(words[i], ret);
            }
            return ret;
        }
        
        // ラベル(タグ)を生成
        var createLabels = function(labels){
            var div = document.createElement('div');
            var span, a, i;
            with (div.style) {
                paddingTop = "4px";
                fontSize = "90%";
                cssFloat = "right";
            }
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
        }
        
        // 検索サイト で検索した単語から、ブックマーク を検索するための URL を生成
        var searchBmUrl = function(){
            return _bookmarkService.getSearchUrl() + _searchSite.getQuery();
        }
        
        return that;
    }
    
    //-------------------------------------------------------------------------
    
    // 検索サイトに対応した オブジェクト
    // このオブジェクトを拡張する
    var searchSite = function(spec, my){
        // このオブジェクトを継承したオブジェクトからのみアクセス可能なオブジェクト
        my = my ||
        {};
        // 検索文字列に対応したパラメータの値
        var _query = spec.query;
        // 検索するための URL 。ただし、検索文字列に対応したパラメータの値を除く。
        var _searchUrl = spec.searchUrl;
        
        // public -------------------------------------------------------------
        
        var that = {
            getQuery: function(){
                return _query;
            },
            // 文字列 q を 検索するための URL を取得
            getSearchUrl: function(q){
                var query = q !== "" ? encodeURIComponent(q) : "";
                return _searchUrl + query;
            },
            // @Override
            // 検索結果を表示する領域 area を初期化
            initArea: function(area){
                GM_log("searchSite.initArea()がオーバーライドされていません。");
            },
            // @Override
            // 検索文字列の配列を返す。ただし、結果の表示において強調したい文字列のみ。
            getStringToBeEmphasized: function(){
                GM_log("searchSite.getStringToBeEmphasized()がオーバーライドされていません。");
            }
        };
        
        // protected ----------------------------------------------------------
        
        // デフォルトの検索結果の設定
        var defaultInitArea = function(area, areaId, targetId, removeId){
            var initArea = function(){
                area.setAttribute("id", areaId)
                area.style.cssFloat = "right";
                area.style.width = "35%";
                area.style.padding = "10px";
            }();
            var removeAd = function(){
                var div = document.getElementById(removeId)
                if (div) {
                    div.parentNode.removeChild(div);
                }
            }();
            div = document.getElementById(targetId);
            div.parentNode.insertBefore(area, div);
        }
        my.defaultInitArea = defaultInitArea;
        
        return that;
    }
    
    //-------------------------------------------------------------------------
    
    // ブックマーク サービスを表わすオブジェクト
    // このオブジェクトを拡張する
    var bookmarkService = function(spec){
        // このブックマークサービスを検索するための URL 。ただし、結果が XML で返されること。
        var _searchUrl = spec.url;
        
        return {
            // public ---------------------------------------------------------
            
            getSearchUrl: function(){
                return _searchUrl;
            },
            // @Override
            // ブックマークの配列を返す
            get: function(xml){
                GM_log("bookmarkService.get()がオーバーライドされていません。");
            }
        }
    }
    
    //-------------------------------------------------------------------------
    
    // bookmark オブジェクト
    // このオブジェクトを拡張する。
    var bookmark = function(spec){
        // ラベル (タグ) の配列
        var _labels = [];
        
        return {
            // public ---------------------------------------------------------
            
            // タイトル
            title: spec.title,
            // URL
            url: spec.url,
            // ラベルの配列
            labels: _labels,
            // @Override
            // DOM Element からラベル(タグ)の配列を設定する。
            setLabels: function(xml){
                GM_log("bookmark.setLabels(xml)がオーバーライドされていません。")
            }
        }
    }
    
    //-------------------------------------------------------------------------
    
    // Google 検索オブジェクト
    // searchSite を継承
    var googleSearchSite = function(){
        my = {};
        // searchSite を継承したオブジェクトを生成
        var that = searchSite({
            // Google 検索時点のクエリ文字列
            query: location.search.match(/q=(.*?)(?:&|$)/)[1],
            // Google 検索をするための URL
            searchUrl: "http://" + location.hostname + "/search?q="
        }, my);
        
        // public -------------------------------------------------------------
        
        // @Override
        // 検索結果の表示領域を設定
        var initArea = function(area){
            // TODO area の設定をカスタマイズできるようにする
            my.defaultInitArea(area, "searchResultArea", "res", "mbEnd");
        }
        that.initArea = initArea;
        
        // @Override
        // Google 検索文字列の配列を返す。ただし、結果の表示において強調したい文字列のみ。
        var getStringToBeEmphasized = function(){
            return strSpliter(decodeURIComponent(that.getQuery())).split("+");
        }
        that.getStringToBeEmphasized = getStringToBeEmphasized;
        
        // private ------------------------------------------------------------
        
        // Google 検索において、検索文字列を分割し、強調して表示したい文字列を抽出。
        //
        // - 以下の検索文字列中の文字列は捨てる。
        //   * AND, OR, |, "
        //   * 接頭辞が `-' の文字列
        // - フレーズ検索は、フレーズのまま取り出す。
        //
        // TODO Google オプションの一部しか対応していないので要改善。
        strSpliter = function(str){
            // 分割対象の文字列
            var _s = str;
            // 引用符を指し示すための 2 つの値。文字列 _s のインデックスを表わす。
            var _p = [0, 0];
            
            return {
                //  str を次の位置へ進める
                findNext: function(str, p, i){
                    var idx = _s.indexOf(str, function(index){
                        if (index === 1) 
                            return p[0] + 1;
                        else 
                            return p[1];
                    }(i));
                    if (idx !== -1) {
                        return _p[i] = idx;
                    }
                    else {
                        return null;
                    }
                },
                // 文字列 _s のインデックス _p[0], _p[1] の間に、文字 str が存在するか?
                exists: function(str){
                    if (_s.substring(_p[0], _p[1]).indexOf(str) != -1) {
                        return true;
                    }
                    else {
                        return false;
                    }
                },
                // 文字列 _s のインデックス _p[0], _p[1] の間にある文字が、全て文字 str であるか？
                all: function(str){
                    var target = _s.substring(_p[0] + 1, _p[1]);
                    var i;
                    for (i = 0; i < target.length; i++) {
                        if (target[i] !== str) {
                            return false;
                        }
                    }
                    return true;
                },
                // フレーズ検索における引用符 "XXXXX+YYYYY" の中にある`+' を空白に置き換える。
                // ただし、検索時に単語と単語を区切るための空白と置き換わっている`+' はそのままにしておく。
                replace: function(){
                    if (this.findNext('"', _p, 0) !== null && this.findNext('"', _p, 1) !== null) {
                        if (this.exists("+") && !this.all("+")) {
                            _s = _s.substring(0, _p[0]) +
                            _s.substring(_p[0], _p[1]).replace(/\+/g, " ") +
                            _s.substring(_p[1], _s.length);
                        }
                    }
                    else {
                        return this;
                    }
                    this.replace();
                },
                del: function(words){
                    var ret = [], i;
                    for (i = 0; i < words.length; i++) {
                        // 「空文字, | , 先頭が - ではじめる文字列, AND, OR」を取り除く
                        if (/^$|\||^-|AND|OR/g.test(words[i])) 
                            continue;
                        ret.push(words[i]);
                    }
                    return ret;
                },
                // 分割する
                split: function(str){
                    // "XXXXX+YYYYY" の + を空白に置き換える
                    this.replace();
                    // 文字列から引用符を取り除き、文字列 str で分割
                    return this.del(_s.replace(/"/g, "").split(str));
                }
            }
        }
        
        return that;
    }
    
    //-------------------------------------------------------------------------
    
    // Google Bookmarks オブジェクト
    // bookmarkService オブジェクトを継承
    var googleBookmarkService = function(spec){
        // bookmarkService を継承したオブジェクトを生成
        var that = bookmarkService({
            // Google Bookmarks を検索するための URL (xml で出力 )
            url: "http://www.google.com/bookmarks/find?output=xml&q="
        });
        
        // public -------------------------------------------------------------
        
        // @Override
        // Dom Element からブックマーク オブジェクトの配列を返す
        that.get = function(dom){
            var bookmarks = dom.getElementsByTagName("bookmark");
            var ret = [];
            var bm;
            for (var i = 0; i < bookmarks.length; i++) {
                // ブックマーク オブジェクトを生成
                bm = googleBookmark({
                    title: bookmarks[i].getElementsByTagName('title')[0].textContent,
                    url: bookmarks[i].getElementsByTagName('url')[0].textContent
                });
                // ラベル(タグ)を生成
                bm.setLabels(bookmarks[i]);
                ret.push(bm);
            }
            return ret;
        }
        return that;
    }
    
    //-------------------------------------------------------------------------
    
    // Google ブックマーク オブジェクト
    // bookmark オブジェクトを継承
    var googleBookmark = function(spec){
        // bookmark を継承したオブジェクトを生成
        var that = bookmark(spec);
        
        // public -------------------------------------------------------------
        
        // @Override
        // DOM Element からラベル(タグ)を生成
        that.setLabels = function(dom){
            var labels = dom.getElementsByTagName('label');
            for (var i = 0; i < labels.length; i++) {
                that.labels.push(labels[i].textContent);
            }
        }
        return that;
    }
    
    //-------------------------------------------------------------------------
    
    searchResultArea({
        searchSite: googleSearchSite(),
        bookmarkService: googleBookmarkService()
    }).load();
})()