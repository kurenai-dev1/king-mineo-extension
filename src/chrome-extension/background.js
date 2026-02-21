//
//  background.js
//
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

  // マイネ王掲示板(TOPページを除く)
  try {
    if (changeInfo.status === "complete" && tab.url.indexOf("https://king.mineo.jp/reports") > -1) {
      console.log(`updated: ${tab.url}`);
      chrome.scripting.executeScript({
        target: {tabId: tabId, allFrames: true },
        files: [
          "./mineo_content.js"
        ]
      });
    //  .then(() => console.log(`executed: ${result}`));
    }
  } catch(err) {
    console.warn("スクリプトの注入に失敗しました (フレームが未準備の可能性があります):", err);
  }

});
