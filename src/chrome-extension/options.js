//
// オプション画面
//   呼び出し方法が解り難い
//   POPUP画面と違い、全画面表示(新規タブ)が可能
//   画面は自動では閉じないので、ファイルの入出力も可能
//   コンテンツとやり取りするには、chrome.storage を使う必要がある
//   モバイルを考えると、コンテンツ上のキーイベントは使えないので、この画面を使うのが現実的   
//
//   欠点：コンテンツとメッセージ送受信が出来ない場合がある
//   

// ファイルへの書き出し
function downloadText(text, filename) {
    let blob = new Blob([text], {type: "text/plain"});
    let link = document.createElement("a"); // aタグのエレメントを作成
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
// ファイル選択ダイアログからファイルを読み込む(非同期)
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

// 保存ボタンクリック時
document.querySelector("#saveButton").addEventListener("click", async () => {
  try {
    const obj = await chrome.storage.local.get('map_articles');
    downloadText(obj.map_articles, "mineo_articles.json");    
  } catch {};

/*
  // 対象のタブを特定して、コンテンツに送信---うまくコンテンツ側にイベントが起きない
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {cmd:'save'}, (responseFromContent) => {
      downloadText(responseFromContent, "mineo_articles.json");    
  //    window.close();
    });
  });
*/
});

// 復元ボタンクリック時
document.querySelector("#restoreButton").addEventListener("click", async () => {
  try {
    const str = await pickFileAsString();
    if( str ) {
      chrome.storage.local.set({ restore_articles: str });
    }

/*  コンテンツに送信---うまくコンテンツ側にイベントが起きない
    // const [tabs] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [tabs] = await chrome.tabs.query({ url: ["*://king.mineo.jp/reports/*"] });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {cmd:'restore',data:str});
    });
*/
  } catch {}
});

// 復元ボタンクリック時
document.querySelector("#closeButton").addEventListener("click", async () => {
   window.close();
});

