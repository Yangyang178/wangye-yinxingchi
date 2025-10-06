document.addEventListener('DOMContentLoaded', function() {
    // 本地化支持：优先使用 chrome.i18n，其次使用 navigator.language 的内置字典
    const uiLang = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage)
        ? chrome.i18n.getUILanguage().toLowerCase()
        : (navigator.language || 'en').toLowerCase();
    const isZh = uiLang.startsWith('zh');

    // 预览环境的回退字典（仅覆盖本文件/页面用到的键）
    const dictZh = {
        title_main: '网页隐形尺',
        subtitle: 'Web Ruler Extension',
        section_controls: '功能控制',
        enable_plugin_label: '启用插件',
        enable_plugin_desc: '显示元素信息',
        enable_measure_label: '距离测量',
        enable_measure_desc: '测量两点距离',
        quick_actions_title: '快速操作',
        refresh_page_btn: '刷新页面',
        guide_expand: '使用指南',
        guide_collapse: '收起指南',
        guide_quick_start_title: '快速开始',
        guide_step1: '开启"启用插件"开关',
        guide_step2: '鼠标悬停查看元素信息',
        guide_step3: '开启"距离测量"进行测量',
        guide_measure_title: '距离测量',
        measure_step1: '点击第一个点开始测量',
        measure_step2: '点击第二个点完成测量',
        measure_step3: '退出测量模式',
        feature_title: '功能特点',
        feature_precise: '精确测量',
        feature_visual: '可视化标记',
        feature_quick: '快速操作',
        feature_auto: '自动退出',
        status_ready: '就绪',
        status_full_enabled: '全功能启用',
        status_base_enabled: '基础功能启用',
        status_disabled: '功能已关闭'
    };
    const dictEn = {
        title_main: 'Web Ruler',
        subtitle: 'Web Ruler Extension',
        section_controls: 'Controls',
        enable_plugin_label: 'Enable',
        enable_plugin_desc: 'Show element info',
        enable_measure_label: 'Distance Measure',
        enable_measure_desc: 'Measure between two points',
        quick_actions_title: 'Quick Actions',
        refresh_page_btn: 'Refresh Page',
        guide_expand: 'Guide',
        guide_collapse: 'Hide Guide',
        guide_quick_start_title: 'Quick Start',
        guide_step1: 'Turn on "Enable" switch',
        guide_step2: 'Hover to see element info',
        guide_step3: 'Turn on "Distance Measure"',
        guide_measure_title: 'Measuring',
        measure_step1: 'Click the first point to start',
        measure_step2: 'Click the second point to finish',
        measure_step3: 'Exit measuring mode',
        feature_title: 'Features',
        feature_precise: 'Precise',
        feature_visual: 'Visual markers',
        feature_quick: 'Quick ops',
        feature_auto: 'Auto exit',
        status_ready: 'Ready',
        status_full_enabled: 'All features enabled',
        status_base_enabled: 'Basic features enabled',
        status_disabled: 'Disabled'
    };

    function t(key, fallback) {
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
            const msg = chrome.i18n.getMessage(key);
            if (msg) return msg;
        }
        const fallbackDict = isZh ? dictZh : dictEn;
        return fallbackDict[key] || fallback || key;
    }

    function localizeDOM() {
        document.querySelectorAll('[data-i18n]')
            .forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = t(key, el.textContent);
            });
        document.title = t('title_main', document.title);
        document.documentElement.lang = isZh ? 'zh-CN' : 'en';
    }
    const enablePluginCheckbox = document.getElementById('enablePlugin');
    const enableMeasureCheckbox = document.getElementById('enableMeasure');
    const refreshButton = document.getElementById('refreshPage');
    const toggleGuideButton = document.getElementById('toggleGuide');
    const guideSection = document.getElementById('guideSection');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = statusIndicator.querySelector('.status-text');
    const guideBtnText = document.getElementById('guideBtnText');

    // 首次本地化
    localizeDOM();
    if (guideBtnText) guideBtnText.textContent = t('guide_expand');

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
            toggleGuideButton.querySelector('.btn-text').textContent = t('guide_expand');
            toggleGuideButton.querySelector('.btn-icon').textContent = '📖';
        } else {
            guideSection.classList.add('expanded');
            toggleGuideButton.querySelector('.btn-text').textContent = t('guide_collapse');
            toggleGuideButton.querySelector('.btn-icon').textContent = '📚';
        }
    });

    // 更新状态显示
    function updateStatus() {
        const pluginEnabled = enablePluginCheckbox.checked;
        const measureEnabled = enableMeasureCheckbox.checked;
        
        if (pluginEnabled && measureEnabled) {
            statusText.textContent = t('status_full_enabled');
            statusIndicator.querySelector('.status-dot').style.background = '#28a745';
        } else if (pluginEnabled) {
            statusText.textContent = t('status_base_enabled');
            statusIndicator.querySelector('.status-dot').style.background = '#ffc107';
        } else {
            statusText.textContent = t('status_disabled');
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