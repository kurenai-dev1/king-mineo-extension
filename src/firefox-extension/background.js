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
    }
  } catch(err) {
    console.warn("script injection failure:", err);
  }

});
