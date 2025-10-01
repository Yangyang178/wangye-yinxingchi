document.addEventListener('DOMContentLoaded', function() {
    const enablePluginCheckbox = document.getElementById('enablePlugin');
    const enableMeasureCheckbox = document.getElementById('enableMeasure');
    const refreshButton = document.getElementById('refreshPage');
    const toggleGuideButton = document.getElementById('toggleGuide');
    const guideSection = document.getElementById('guideSection');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = statusIndicator.querySelector('.status-text');

    // 检查是否在扩展环境中运行
    if (typeof chrome !== 'undefined' && chrome.storage) {
        // 加载保存的设置
        chrome.storage.sync.get(['pluginEnabled', 'measureEnabled'], function(result) {
            enablePluginCheckbox.checked = result.pluginEnabled || false;
            enableMeasureCheckbox.checked = result.measureEnabled || false;
            updateStatus();
        });
    } else {
        // 在预览环境中，使用默认值
        console.log('Running in preview mode, using default values');
        enablePluginCheckbox.checked = false;
        enableMeasureCheckbox.checked = false;
        updateStatus();
    }

    // 监听插件开关变化
    enablePluginCheckbox.addEventListener('change', function() {
        const isEnabled = this.checked;
        
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({pluginEnabled: isEnabled});
            
            // 发送消息到content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'togglePlugin',
                        enabled: isEnabled
                    }).catch((error) => {
                        console.log('Message sending failed:', error);
                        // 忽略错误，可能是页面还没准备好接收消息
                    });
                }
            });
        } else {
            console.log('Plugin toggle in preview mode:', isEnabled);
        }
        
        updateStatus();
    });

    // 监听测量开关变化
    enableMeasureCheckbox.addEventListener('change', function() {
        const isEnabled = this.checked;
        
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({measureEnabled: isEnabled});
            
            // 发送消息到content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleMeasure',
                        enabled: isEnabled
                    }).catch((error) => {
                        console.log('Message sending failed:', error);
                        // 忽略错误，可能是页面还没准备好接收消息
                    });
                }
            });
        } else {
            console.log('Measure toggle in preview mode:', isEnabled);
        }
        
        updateStatus();
    });

    // 刷新页面按钮
    refreshButton.addEventListener('click', function() {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        } else {
            console.log('Refresh button clicked in preview mode');
            // 在预览模式下，可以刷新当前页面
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        }
    });

    // 切换使用指南显示
    toggleGuideButton.addEventListener('click', function() {
        const isExpanded = guideSection.classList.contains('expanded');
        if (isExpanded) {
            guideSection.classList.remove('expanded');
            toggleGuideButton.querySelector('.btn-text').textContent = '使用指南';
            toggleGuideButton.querySelector('.btn-icon').textContent = '📖';
        } else {
            guideSection.classList.add('expanded');
            toggleGuideButton.querySelector('.btn-text').textContent = '收起指南';
            toggleGuideButton.querySelector('.btn-icon').textContent = '📚';
        }
    });

    // 更新状态显示
    function updateStatus() {
        const pluginEnabled = enablePluginCheckbox.checked;
        const measureEnabled = enableMeasureCheckbox.checked;
        
        if (pluginEnabled && measureEnabled) {
            statusText.textContent = '全功能启用';
            statusIndicator.querySelector('.status-dot').style.background = '#28a745';
        } else if (pluginEnabled) {
            statusText.textContent = '基础功能启用';
            statusIndicator.querySelector('.status-dot').style.background = '#ffc107';
        } else {
            statusText.textContent = '功能已关闭';
            statusIndicator.querySelector('.status-dot').style.background = '#dc3545';
        }
    }

    // 添加一些交互动画效果
    const controlCards = document.querySelectorAll('.control-card');
    controlCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // 初始化状态
    updateStatus();
});