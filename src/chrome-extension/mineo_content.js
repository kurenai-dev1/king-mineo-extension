//
// マイネ王掲示板用スクリプト(Chrome用)
//
// "https://king.mineo.jp/reports" で呼び出される
// 一覧画面・詳細画面 共通処理
//

{ // 変数スコープ(重複注入時のエラー回避)

// ▼ 共通変数と初期化

const MAX_ARTICLES =  500; // mapArticles の最大数
const MAX_COMMENTS =   50; // 非表示にするコメント数の下限
const NARROW_COMMENTS = 9999; // 棒表示件数(フラグの代わり)
const NARROW_HEIGHT = '10px'; // 棒の高さ
const IS_USE_MOBILE = false;

// 一覧画面・詳細画面判定
let isDetail = false; // true:詳細画面
{
  const url = window.location.href;
  if( url.indexOf("https://king.mineo.jp/reports/") > -1 ) isDetail = true;
}
// 一覧画面の情報保持(一覧画面から詳細へ遷移した時に使用する)
let listArticles = JSON.parse(localStorage.getItem("list_articles")); 
if( !listArticles ) listArticles = {};

// 詳細閲覧情報の保持用 MAP (循環バッファ)
let mapArticles = new Map();
{
  // 既存データの読み込み
  const strJson = localStorage.getItem('map_articles');
  if( strJson ) {
    setJsonToMapArticles( strJson );
  }
}
// ▲ 共通変数と初期化

// ▼ 関数
function getIdFromArticle( article ) {
  let id = 0;
  const link = article.querySelector('.stretched-link');
  if( link ) id = getIdFromUrl( link.href );
  return id;
}
// URL pathパラメータからID取得(関数) ex. "https://.../reports/12345"
function getIdFromUrl( url ) {
  let id = 0;
  const parts = url.split('/');
  if( parts.length > 0 ) {
    id = parseInt(parts[parts.length-1]);
  }
  return id;
}
function setJsonToMapArticles( strJson ) {
  try {
    // const map = new Map(Object.entries(JSON.parse(strJson)));
    const map = new Map(JSON.parse(strJson));
    if( map ) {
      mapArticles = map;
    }
  } catch {}
  syncMapArticlesToStorage();
}
function syncMapArticlesToStorage() {
  // const strJson = JSON.stringify(Object.fromEntries(mapArticles));  // 順序が変わる
  const strJson = JSON.stringify(Array.from(mapArticles));
  localStorage.setItem('map_articles', strJson);
  chrome.storage.local.set({map_articles: strJson });
}
// MAP に追加する処理(関数)
function addToMapArticles(key, value) {
  // すでに存在する場合は一度消して最後尾にする
  if (mapArticles.has(key)) {
    if( value > mapArticles.get(key) ) { // 大きい場合だけ
      mapArticles.delete(key);
    }
  }
  mapArticles.set(key, value); // 追加・更新
  // サイズ超過時に最も古いものを削除
  if (mapArticles.size > MAX_ARTICLES) {
    const oldestKey = mapArticles.keys().next().value;
    mapArticles.delete(oldestKey);
  }
  syncMapArticlesToStorage();
}
function delFromMapArticles( key ) {
  mapArticles.delete( key );
  syncMapArticlesToStorage();
}
// <article> 内のコメント数の取得
function getCommentCount( article ) {
  let n = 0;
  const uls = article.querySelectorAll('ul');
  if( uls.length > 1 ) {
    const lis = uls[1].querySelectorAll('li');
    if( lis.length > 3 ) {
      const span = lis[2].querySelector('span');
      if( span ) n = parseInt(span.textContent);
    }
  }  
  return n;
}
// <article> を棒状に表示
function setNarrow(article) {
        article.style.height = NARROW_HEIGHT;
        article.style.backgroundColor = '#c0c0c0';
        const link = article.querySelector('.stretched-link');
        if( link ) article.title = link.textContent; // ツールチップ
        var div = article.querySelector("div");
        if( div ) div.style.display = 'none';
}
function clearNarrow(article) {
        article.style.height = null;
        article.style.backgroundColor = null;
        var div = article.querySelector("div");
        if( div ) div.style = ""; // .display = null だと再レンダリングはされない
}
function downloadText(text, filename) {
    // TXTをダウンロードする
    let blob = new Blob([text], {type: "text/plain"});
    let link = document.createElement("a"); // aタグのエレメントを作成
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
function restoreMapArticles() {
    // 1. input type="file" 要素を動的に作成
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json'; // JSONファイルのみを受け入れるように指定
    input.style.display = 'none'; // 画面に表示しない
    document.body.appendChild(input); // DOMに追加

    // 2. ファイルが選択されたときの処理を設定
    // ★非同期処理なので注意
    input.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && file.type === 'application/json') {
            const reader = new FileReader(); // FileReader APIを使用

            // 読み込み成功時の処理
            reader.onload = function(e) {
                const content = e.target.result;
                // document.getElementById('output').textContent = content; // 結果を表示
                if( content ) {
                   setJsonToMapArticles( content );
                   alert('既読管理がリストアされました。');
                }
                // 処理が完了したら要素をDOMから削除
                document.body.removeChild(input);
            };

            // エラー発生時の処理
            reader.onerror = function(e) {
                console.error("ファイルの読み込み中にエラーが発生しました:", e.target.error);
                // document.getElementById('output').textContent = "ファイルの読み込みに失敗しました。";
                document.body.removeChild(input);
            };

            // テキストファイルとして読み込む (UTF-8などを想定)
            reader.readAsText(file, 'UTF-8');
        } else {
            alert('JOSNファイルを選択してください。');
            document.body.removeChild(input); // 選択が無効なら要素を削除
        }
    });

    // 3. プログラム的に要素をクリックしてファイル選択ダイアログを開く
    input.click();
}
// ▲ 関数

// ■ 詳細画面の処理

if( isDetail ) {

  // 詳細画面での既読登録処理
  const id = getIdFromUrl( window.location.pathname );
  if( id > 0 ) {
    const el = document.querySelector('#comment_section');
    if( el ) {
      let n = parseInt(el.textContent);
      // 一覧情報があれば件数(ミュート数)を反映
      if( listArticles[id] ) {
        if( listArticles[id] > n ) n = listArticles[id];
      }
      // map 保管
      addToMapArticles( String(id), n );
    }
  }

}

// ■ 投稿一覧の処理

// 不要部分の非表示
if( !isDetail ) {
  var el = document.querySelector("aside");
  if( el ) el.style.display = 'none';

  el = document.querySelector(".jumbotron");
  if( el ) el.style.display = 'none';
} 

var targetNode = document.querySelector('body');

// 監視条件
var config = {
    childList: true,  // 子ノードに対する追加・削除を監視
    attributes: false, // 属性まで監視
    subtree: true  // 子孫ノードまで監視
};

//
// ■ 変更が起こった時の処理
//
var scanSection = (mutations) => {
  var section = document.querySelector("main section");
  if( section ) {
    // 掲示板の非表示判断
    articles =  document.querySelectorAll("section > article");
    if( !isDetail ) listArticles = {};
    console.log(`articles.length: ${articles.length}`);
    for(var i=0; i<articles.length; i++) {
      const article = articles[i];
      const newN = getCommentCount( article ); // コメント数
      const id = getIdFromArticle( article )
      if( id > 0 ) {
        if( mapArticles.has(String(id)) ) {
          var oldN = mapArticles.get(String(id));
          // 棒状で隠す
          if( oldN == NARROW_COMMENTS ) setNarrow(article);
          else if( oldN === newN ) article.style.backgroundColor = "#e0e0e0";
          else article.style.backgroundColor = "#e0ffff";
          listArticles[id] = newN;
        } else {
          // コメントの上限を超えたら非表示
          if( newN > MAX_COMMENTS ) article.style.display = 'none';
        }
      } // id > 0
    }  // for    
    // 一覧情報を保管
    if( !isDetail ) localStorage.setItem("list_articles", JSON.stringify(listArticles)); //JSON形式へ変換
  } else {
    console.log(`no section!`);
  }
}

// 対象ノードの監視を開始
var observer = new MutationObserver(scanSection);
observer.observe(targetNode, config);
scanSection([]); // 初回強制実行

// Todo! キーで既読の解除
if( !isDetail ) {

  let mouseX = 0;
  let mouseY = 0;

  // マウスが動くたびに座標を更新
  window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  var section = document.querySelector("main section");
  if( section ) {
    // 文字が入力された
    window.addEventListener('keydown', (event) => {
      console.log(`キーが押されました。${event.code}`);
      if( event.code === 'KeyR' || event.code === 'KeyD') {
        const el = document.elementFromPoint(mouseX, mouseY);        
        if( el ) {
          const article = el.closest('article');
          if( article ) {
            const id = getIdFromArticle( article );
            if (id > 0 ) {
              if(  event.code === 'KeyR' ) {
                if( mapArticles.has(String(id))) {
                  if( mapArticles.get(String(id)) === NARROW_COMMENTS ) clearNarrow(article);
                  delFromMapArticles(String(id));
                  article.style.backgroundColor = null;
                } else {
                  const n = getCommentCount(article);
                  addToMapArticles(String(id), n);
                  article.style.backgroundColor = "#e0e0e0";
                }
              } // 'KeyR'
              if(  event.code === 'KeyD' ) {
                if( !mapArticles.has(String(id))) {
                  addToMapArticles(String(id), NARROW_COMMENTS );
                  setNarrow(article);
                }
              }
            } // id > 0
          }  // if article
        }
      } // if keyR | KeyD
      if(  event.code === 'KeyS' ) {
        if( mapArticles ) {
          const strJson = localStorage.getItem('map_articles');
          downloadText(strJson, "mineo_articles.json");
        }
      }
      if(  event.code === 'KeyL' ) {
        restoreMapArticles();
        scanSection([]); // 強制実行
      } 
    }); // keydown
    // Mobile のみの実装
    // スマホ用 長押しタップで 未読 -> 既読 -> 非表示 -> 未読 のサイクル
    if(IS_USE_MOBILE) {
      let timer;
      const events = ['touchstart', 'mousedown']; // mouse はデバッグ用

      events.forEach(eventType => {
        // ドキュメント全体でタッチ開始を監視
        document.addEventListener(eventType, (e) => {
          // e.target が「実際に触れた要素」
          const article = e.target.closest('article');
          // タイトルのエレメントを長押しした際にリストアを行う。(オプション画面で行う事にしたので不要)
          // let isRestore = false;  
          // const media = e.target.closest('.media-body');
          // if( media && media.closest('header')) isRestore = true;
          if( article /* || isRestore */ ) {
            timer = setTimeout(() => {
              if( article ) {
                // 長押し確定時の処理
                const id = getIdFromArticle( article );
                const n  = getCommentCount( article );
                if (id > 0 ) {
                  // 登録があるか？
                  if( mapArticles.has(String(id))) {
                    // 非監視対象 -> 未監視(未読)
                    if( mapArticles.get(String(id)) === NARROW_COMMENTS ) {
                      clearNarrow(article);
                      delFromMapArticles(String(id));
                    // 既読 -> 非監視
                    } else if( n === mapArticles.get(String(id)) ) {
                      addToMapArticles(String(id), NARROW_COMMENTS );
                      setNarrow(article);
                    // 未読 -> 既読
                    } else {
                      addToMapArticles(String(id), n);
                      article.style.backgroundColor = "#e0e0e0";
                    }
                  } else {
                    // 未読 -> 既読
                    addToMapArticles(String(id), n);
                    article.style.backgroundColor = "#e0e0e0";
                  }
                } // if id
              } // article
              // if( isRestore ) {
              //   restoreMapArticles(); 
              // }
            }, 500); // 500ms
          } // if article
        }, { passive: false });
      });
      // 解除側も同様に mouseup / mouseleave を追加
      ['touchend', 'touchmove', 'mouseup', 'mouseleave'].forEach(eventType => {
        document.addEventListener(eventType, () => clearTimeout(timer));
      });
    } // mobile
  } // section

  // ポップアップからのメッセージでファイル操作を行う
/*
  // Firefox では、popup 画面でのファイル操作は出来ないので使わない
  // if (!chrome.runtime.onMessage.hasListeners()) { // 効果なし
  chrome.runtime.onMessage.addListener((request, _ev, sendResponse) => {
    if (window.self !== window.top) { // 多重 inject による多重イベント実行を防ぐ
        return;
    }
    if( request.cmd === 'save') {
      if( mapArticles ) {
        const strJson = localStorage.getItem('map_articles');
        sendResponse(strJson);
       // ポップアップ画面がカレントなのでデータだけをやり取りする
       // downloadText(strJson, "mineo_articles.json");
      }
    }
    if( request.cmd === 'restore') {
      setJsonToMapArticles( request.data );
      alert('既読管理がリストアされました。');
    }
  });
  // }
*/
  // chrome.storage を使った option 画面からのイベント
  chrome.storage.onChanged.addListener( async (changes, areaName) => {
    // local ストレージの変更のみを処理する場合
    if (window.self !== window.top) { // 多重 inject による多重イベント実行を防ぐ
        return;
    }
    if (areaName === "local") {
      const change = changes["restore_articles"]; 
      if( change && change.newValue ) { // remove は処理しない
        const strJson = change.newValue ;
        try {   
          await chrome.storage.local.remove( 'restore_articles' ); // イベントが起きる
        } catch {};
        setJsonToMapArticles( strJson ); 
        if( !IS_USE_MOBILE ) alert('既読管理がリストアされました。'); // mobile ではハングする
        scanSection([]); // 強制実行
      }
    }
  });
  // 長押しのコンテキストメニューを非活性化(mobile) ※効かない
  {
    const elements = document.querySelectorAll('articles');
    elements.forEach(el => {
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
} // isDetail

} // 変数スコープ

