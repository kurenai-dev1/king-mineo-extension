//
// マイネ王掲示板用スクリプト
//
// "https://king.mineo.jp/reports" で呼び出される
// 一覧画面・詳細画面 共通処理
//

{ // 変数スコープ(重複注入時のエラー回避)

// ▼ 共通変数と初期化

const MAX_ARTICLES =  500; // mapArticles の最大数
const MAX_COMMENTS =   50; // 非表示にするコメント数の下限
const NARROW_COMMENTS = 9999; // 棒表示件数(フラグの代わり)

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
let mapArticles;
{
  const strJson = localStorage.getItem('map_articles');
  if( strJson ) {
    // Object.entries() は key が文字列になるので注意(MAP自体に制限は無い)
    mapArticles = new Map(Object.entries(JSON.parse(strJson)));
  } else {
    mapArticles = new Map();
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
  const strJson = JSON.stringify(Object.fromEntries(mapArticles));
  localStorage.setItem('map_articles', strJson); // 保管
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
        article.style.height = '10px';
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
                   const map = new Map(Object.entries(JSON.parse(content)));
                   if( map ) {
                     mapArticles = map;
                     localStorage.setItem('map_articles', content ); 
                     alert('既読管理がリストアされました。');
                   }
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
// var observer = new MutationObserver(function(mutations) { // 無名関数使用の場合
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
            const id = getIdFromArticle( article )
            if (id > 0 ) {
              if(  event.code === 'KeyR' ) {
                if( mapArticles.has(String(id))) {
                  if( mapArticles.get(String(id)) === NARROW_COMMENTS ) clearNarrow(article);
                  mapArticles.delete(String(id));
                  const strJson = JSON.stringify(Object.fromEntries(mapArticles));
                  localStorage.setItem('map_articles', strJson); // 保管
                  if( article ) article.style.backgroundColor = null;
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
              } // 'KeyD'
            } // id > 0
          }  // if article
        }
      } // if keyR | KeyD
      if(  event.code === 'KeyS' ) {
        if( mapArticles ) {
          const strJson = localStorage.getItem('map_articles');
          downloadText(strJson, "mineo_articles.json");
        }
      } // 'KeyS'
      if(  event.code === 'KeyL' ) {
        restoreMapArticles();
      } // 'KeyS'
    });
  }
} // if

} // 変数スコープ
