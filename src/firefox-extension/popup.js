//
//  POPUP画面
//  拡張機能のアイコンから呼び出せる
//  画面外のクリックで閉じるので簡易な説明と操作しかできない
//  特に、Firefox では、ダイアログを開くだけでも閉じられる(ファイルの読みには向かない)
//
function downloadText(text, filename) {
    // TXTをダウンロードする
    let blob = new Blob([text], {type: "text/plain"});
    let link = document.createElement("a"); // aタグのエレメントを作成
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// File から json 文字列を読み込む(非同期)
function readJsonFileAsString(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // 読み込み成功時の処理
    reader.onload = () => resolve(reader.result);
    // 失敗時の処理
    reader.onerror = () => reject(reader.error);

    // テキストとして読み込み開始
    reader.readAsText(file);
  });
}

function pickFileAsString() {
  return new Promise((resolve, reject) => {
    // JSだけでinput要素を生成（DOMには追加しない）
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // 文字列を返す
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };

    // ダイアログを表示
    input.click();
  });
}

// 使い方
// pickFileAsString().then(str => console.log(str));
// try { const str = await pickFileAsString(); } catch {}

/*
// 保存ボタンクリック時
document.querySelector("#saveButton").addEventListener("click", () => {

  // 対象のタブを特定して、コンテンツに送信
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {cmd:'save'}, (responseFromContent) => {
      downloadText(responseFromContent, "mineo_articles.json");    
      window.close();
    });
  });
});
*/

/*
// 復元ボタンクリック時
document.querySelector("#restoreButton").addEventListener("click", async () => {

  // 対象のタブを特定して、コンテンツに送信
  // pickFileAsString().then(str => {
  try {
    const str = await pickFileAsString();

    if( str ) {
      chrome.storage.local.set({ map_articles: str });
    }
  } catch {}
  // });
});
*/

// OPTION画面の呼び出し
document.querySelector('#gotoOptions').addEventListener('click', function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});

