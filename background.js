// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
    // 设置默认配置
    chrome.storage.sync.set({
        pluginEnabled: false,
        measureEnabled: false
    });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSettings') {
        chrome.storage.sync.get(['pluginEnabled', 'measureEnabled'], (result) => {
            sendResponse(result);
        });
        return true; // 保持消息通道开放
    }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // 页面加载完成后，向content script发送当前设置
        chrome.storage.sync.get(['pluginEnabled', 'measureEnabled'], (result) => {
            chrome.tabs.sendMessage(tabId, {
                action: 'initSettings',
                settings: result
            }).catch(() => {
                // 忽略错误，可能是页面还没准备好接收消息
            });
        });
    }
});