// 插件状态
let isPluginEnabled = false;
let isMeasureEnabled = false;
let isHovering = false;
let currentElement = null;
let infoPanel = null;
let measureMode = false;
let measurePoints = [];
let measureLine = null;

// 本地化支持函数：优先 chrome.i18n，其次回退到提供的默认值
function t(key, fallback) {
    try {
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
            const msg = chrome.i18n.getMessage(key);
            if (msg) return msg;
        }
    } catch (e) {}
    return fallback || key;
}

// 初始化插件
function initPlugin() {
    console.log('Initializing Web Ruler Plugin...');
    createInfoPanel();
    bindEvents();
    
    // 获取初始设置
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        console.log('Initial settings received:', response);
        if (chrome.runtime.lastError) {
            console.log('Runtime error:', chrome.runtime.lastError);
            return;
        }
        if (response) {
            isPluginEnabled = response.pluginEnabled || false;
            isMeasureEnabled = response.measureEnabled || false;
            console.log('Plugin state:', { isPluginEnabled, isMeasureEnabled });
            updatePluginState();
        }
    });
}

// 创建信息显示面板
function createInfoPanel() {
    if (infoPanel) return;
    
    infoPanel = document.createElement('div');
    infoPanel.id = 'web-ruler-info-panel';
    infoPanel.className = 'web-ruler-panel';
    infoPanel.style.display = 'none';
    document.body.appendChild(infoPanel);
}

// 绑定事件
function bindEvents() {
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
}

// 鼠标悬停事件
function handleMouseOver(e) {
    if (!isPluginEnabled || measureMode) return;
    
    // 避免悬停在信息面板上
    if (e.target.closest('#web-ruler-info-panel')) return;
    
    currentElement = e.target;
    isHovering = true;
    showElementInfo(e.target, e.clientX, e.clientY);
}

// 鼠标离开事件
function handleMouseOut(e) {
    if (!isPluginEnabled || measureMode) return;
    
    // 检查是否真的离开了元素
    if (!e.relatedTarget || !currentElement.contains(e.relatedTarget)) {
        isHovering = false;
        hideElementInfo();
    }
}

// 鼠标移动事件
function handleMouseMove(e) {
    if (!isPluginEnabled) return;
    
    if (isHovering && !measureMode && infoPanel) {
        updatePanelPosition(e.clientX, e.clientY);
    }
}

// 点击事件（用于测量功能）
function handleClick(e) {
    // 调试信息
    console.log('Click event:', {
        isPluginEnabled,
        isMeasureEnabled,
        measureMode,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey
    });
    
    if (!isPluginEnabled) return;
    
    // Ctrl+点击处理测量功能
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (!isMeasureEnabled) {
            showMeasureTip(t('tip_enable_measure_first','请先在插件面板中开启距离测量功能'), 2000);
            return;
        }
        
        // 如果不在测量模式，进入测量模式并添加第一个点
        if (!measureMode) {
            enterMeasureMode();
            addMeasurePoint(e.clientX, e.clientY);
        } else {
            // 如果已在测量模式，添加测量点或退出
            if (measurePoints.length === 0) {
                addMeasurePoint(e.clientX, e.clientY);
            } else if (measurePoints.length === 1) {
                addMeasurePoint(e.clientX, e.clientY);
                // 测量完成后自动退出测量模式
                setTimeout(() => {
                    exitMeasureMode();
                }, 2000);
            } else {
                // 重新开始测量
                measurePoints = [];
                addMeasurePoint(e.clientX, e.clientY);
            }
        }
        return;
    }
    
    // 测量模式下的普通点击也可以添加测量点
    if (measureMode && isMeasureEnabled) {
        e.preventDefault();
        addMeasurePoint(e.clientX, e.clientY);
        if (measurePoints.length >= 2) {
            // 测量完成后自动退出测量模式
            setTimeout(() => {
                exitMeasureMode();
            }, 2000);
        }
    }
}

// 键盘事件
function handleKeyDown(e) {
    if (!isPluginEnabled) return;
    
    // ESC键退出测量模式
    if (e.key === 'Escape' && measureMode) {
        exitMeasureMode();
    }
}

// 显示元素信息
function showElementInfo(element, x, y) {
    if (!infoPanel) return;
    
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // 获取元素信息
    const info = {
        tagName: element.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left + window.scrollX),
        top: Math.round(rect.top + window.scrollY),
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
        fontWeight: computedStyle.fontWeight,
        margin: {
            top: computedStyle.marginTop,
            right: computedStyle.marginRight,
            bottom: computedStyle.marginBottom,
            left: computedStyle.marginLeft
        },
        padding: {
            top: computedStyle.paddingTop,
            right: computedStyle.paddingRight,
            bottom: computedStyle.paddingBottom,
            left: computedStyle.paddingLeft
        },
        border: {
            width: computedStyle.borderWidth,
            style: computedStyle.borderStyle,
            color: computedStyle.borderColor
        }
    };
    
    // 更新面板内容
    updateInfoPanel(info);
    
    // 显示面板
    infoPanel.style.display = 'block';
    updatePanelPosition(x, y);
    
    // 高亮当前元素
    highlightElement(element);
}

// 更新信息面板内容
function updateInfoPanel(info) {
    const formatColor = (color) => {
        if (color.startsWith('rgb')) {
            return color;
        }
        return color;
    };
    
    infoPanel.innerHTML = `
        <div class="web-ruler-panel-header">
            <span class="web-ruler-tag">&lt;${info.tagName}&gt;</span>
        </div>
        <div class="web-ruler-panel-content">
            <div class="web-ruler-section">
                <div class="web-ruler-section-title">${t('size_title','尺寸')}</div>
                <div class="web-ruler-info-row">
                    <span>${t('width_label','宽度')}: ${info.width}px</span>
                    <span>${t('height_label','高度')}: ${info.height}px</span>
                </div>
                <div class="web-ruler-info-row">
                    <span>${t('position_label','位置')}: ${info.left}, ${info.top}</span>
                </div>
            </div>
            
            <div class="web-ruler-section">
                <div class="web-ruler-section-title">${t('colors_title','颜色')}</div>
                <div class="web-ruler-info-row">
                    <span>${t('background_label','背景')}: <span class="web-ruler-color-sample" style="background-color: ${info.backgroundColor}"></span> ${formatColor(info.backgroundColor)}</span>
                </div>
                <div class="web-ruler-info-row">
                    <span>${t('text_color_label','文字')}: <span class="web-ruler-color-sample" style="background-color: ${info.color}"></span> ${formatColor(info.color)}</span>
                </div>
            </div>
            
            <div class="web-ruler-section">
                <div class="web-ruler-section-title">${t('font_title','字体')}</div>
                <div class="web-ruler-info-row">
                    <span>${t('font_size_label','大小')}: ${info.fontSize}</span>
                    <span>${t('font_weight_label','粗细')}: ${info.fontWeight}</span>
                </div>
                <div class="web-ruler-info-row">
                    <span>${t('font_family_label','字体')}: ${info.fontFamily.split(',')[0].replace(/['\"]/g, '')}</span>
                </div>
            </div>
            
            <div class="web-ruler-section">
                <div class="web-ruler-section-title">${t('spacing_title','间距')}</div>
                <div class="web-ruler-info-row">
                    <span>${t('margin_label','外边距')}: ${info.margin.top} ${info.margin.right} ${info.margin.bottom} ${info.margin.left}</span>
                </div>
                <div class="web-ruler-info-row">
                    <span>${t('padding_label','内边距')}: ${info.padding.top} ${info.padding.right} ${info.padding.bottom} ${info.padding.left}</span>
                </div>
            </div>
        </div>
        ${isMeasureEnabled ? '<div class="web-ruler-measure-tip">' + t('panel_measure_hint','Ctrl+点击开启测量模式') + '</div>' : ''}
    `;
}

// 更新面板位置
function updatePanelPosition(x, y) {
    if (!infoPanel) return;
    
    const panelRect = infoPanel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x + 15;
    let top = y + 15;
    
    // 防止面板超出视窗
    if (left + panelRect.width > viewportWidth) {
        left = x - panelRect.width - 15;
    }
    
    if (top + panelRect.height > viewportHeight) {
        top = y - panelRect.height - 15;
    }
    
    infoPanel.style.left = left + 'px';
    infoPanel.style.top = top + 'px';
}

// 隐藏元素信息
function hideElementInfo() {
    if (infoPanel) {
        infoPanel.style.display = 'none';
    }
    removeHighlight();
}

// 高亮元素
function highlightElement(element) {
    removeHighlight();
    element.classList.add('web-ruler-highlight');
}

// 移除高亮
function removeHighlight() {
    const highlighted = document.querySelectorAll('.web-ruler-highlight');
    highlighted.forEach(el => el.classList.remove('web-ruler-highlight'));
}

// 切换测量模式
function toggleMeasureMode() {
    measureMode = !measureMode;
    
    if (measureMode) {
        enterMeasureMode();
    } else {
        exitMeasureMode();
    }
}

// 进入测量模式
function enterMeasureMode() {
    console.log('Entering measure mode');
    measureMode = true;  // 设置测量模式状态
    document.body.style.cursor = 'crosshair';
    document.body.classList.add('web-ruler-measure-mode');
    hideElementInfo();
    
    // 显示测量提示
    showMeasureTip(t('tip_enter_measure_mode','点击两个点进行测量，ESC退出'));
}

// 退出测量模式
function exitMeasureMode() {
    console.log('Exiting measure mode');
    measureMode = false;
    document.body.style.cursor = '';
    document.body.classList.remove('web-ruler-measure-mode');
    
    // 清理测量点标记
    if (measurePoints.pointElements) {
        measurePoints.pointElements.forEach(point => {
            if (point.parentNode) {
                point.parentNode.removeChild(point);
            }
        });
    }
    
    measurePoints = [];
    removeMeasureLine();
    hideMeasureTip();
}

// 添加测量点
function addMeasurePoint(x, y) {
    console.log('Adding measure point:', { x, y, pointCount: measurePoints.length });
    
    // 确保在测量模式下才能添加点
    if (!measureMode || !isMeasureEnabled) {
        console.log('Cannot add point: not in measure mode or measure disabled');
        return;
    }
    
    measurePoints.push({ x, y });
    
    if (measurePoints.length === 1) {
        showMeasureTip(t('tip_second_point','点击第二个点完成测量'), 0);
        // 在第一个点显示一个小圆点
        createMeasurePoint(x, y, 1);
    } else if (measurePoints.length === 2) {
        // 在第二个点显示一个小圆点
        createMeasurePoint(x, y, 2);
        drawMeasureLine();
        calculateDistance();
        // 不重置测量点，让用户看到结果
    }
}

// 创建测量点标记
function createMeasurePoint(x, y, pointNumber) {
    const point = document.createElement('div');
    point.className = 'web-ruler-measure-point';
    point.style.cssText = `
        position: fixed;
        left: ${x - 6}px;
        top: ${y - 6}px;
        z-index: 2147483646;
        pointer-events: none;
    `;
    
    // 添加点编号
    const pointLabel = document.createElement('div');
    pointLabel.style.cssText = `
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-family: Arial, sans-serif;
        white-space: nowrap;
    `;
    pointLabel.textContent = `${t('point_label_prefix','点')}${pointNumber}`;
    point.appendChild(pointLabel);
    
    document.body.appendChild(point);
    
    // 将点元素添加到测量点数组中，以便后续清理
    if (!measurePoints.pointElements) {
        measurePoints.pointElements = [];
    }
    measurePoints.pointElements.push(point);
}

// 绘制测量线
function drawMeasureLine() {
    removeMeasureLine();
    
    const [point1, point2] = measurePoints;
    const line = document.createElement('div');
    line.className = 'web-ruler-measure-line';
    
    const length = Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
    const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
    
    line.style.width = length + 'px';
    line.style.left = point1.x + 'px';
    line.style.top = point1.y + 'px';
    line.style.transform = `rotate(${angle}deg)`;
    line.style.transformOrigin = '0 50%';
    
    document.body.appendChild(line);
    measureLine = line;
    
    // 3秒后自动移除
    setTimeout(() => {
        removeMeasureLine();
    }, 3000);
}

// 移除测量线
function removeMeasureLine() {
    if (measureLine) {
        measureLine.remove();
        measureLine = null;
    }
}

// 计算距离
function calculateDistance() {
    if (measurePoints.length >= 2) {
        const point1 = measurePoints[0];
        const point2 = measurePoints[1];
        const distance = Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
        
        const distanceText = `${t('distance_label','距离')}: ${Math.round(distance)}px`;
        console.log('Distance calculated:', distanceText);
        
        // 在测量线中点显示距离
        const midX = (point1.x + point2.x) / 2;
        const midY = (point1.y + point2.y) / 2;
        showDistanceLabel(distanceText, midX, midY);
        
        // 同时在提示框显示
        showMeasureTip(distanceText, 3000);
    }
}

// 显示距离标签
function showDistanceLabel(text, x, y) {
    // 移除之前的距离标签
    const existingLabel = document.querySelector('.web-ruler-distance-label');
    if (existingLabel) {
        existingLabel.remove();
    }
    
    const label = document.createElement('div');
    label.className = 'web-ruler-distance-label';
    label.style.cssText = `
        position: fixed;
        left: ${x - 30}px;
        top: ${y - 15}px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        z-index: 10002;
        pointer-events: none;
        white-space: nowrap;
    `;
    label.textContent = text;
    
    document.body.appendChild(label);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (label.parentNode) {
            label.parentNode.removeChild(label);
        }
    }, 3000);
}

// 显示测量提示
function showMeasureTip(text, duration = 0) {
    let tip = document.getElementById('web-ruler-measure-tip');
    
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'web-ruler-measure-tip';
        tip.className = 'web-ruler-measure-tip-popup';
        document.body.appendChild(tip);
    }
    
    tip.textContent = text;
    tip.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            hideMeasureTip();
        }, duration);
    }
}

// 隐藏测量提示
function hideMeasureTip() {
    const tip = document.getElementById('web-ruler-measure-tip');
    if (tip) {
        tip.style.display = 'none';
    }
}

// 更新插件状态
function updatePluginState() {
    if (isPluginEnabled) {
        document.body.classList.add('web-ruler-active');
    } else {
        document.body.classList.remove('web-ruler-active');
        hideElementInfo();
        exitMeasureMode();
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    
    try {
        switch (request.action) {
            case 'togglePlugin':
                isPluginEnabled = request.enabled;
                console.log('Plugin toggled:', isPluginEnabled);
                updatePluginState();
                sendResponse({success: true});
                break;
                
            case 'toggleMeasure':
                isMeasureEnabled = request.enabled;
                console.log('Measure toggled:', isMeasureEnabled);
                if (!isMeasureEnabled && measureMode) {
                    exitMeasureMode();
                }
                sendResponse({success: true});
                break;
                
            case 'initSettings':
                isPluginEnabled = request.settings.pluginEnabled || false;
                isMeasureEnabled = request.settings.measureEnabled || false;
                console.log('Settings initialized:', { isPluginEnabled, isMeasureEnabled });
                updatePluginState();
                sendResponse({success: true});
                break;
                
            default:
                sendResponse({success: false, error: 'Unknown action'});
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({success: false, error: error.message});
    }
    
    return true; // 保持消息通道开放
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlugin);
} else {
    initPlugin();
}