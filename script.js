// 全局变量
let cameraInterval = null;
let enhancedCameraInterval = null;
let autoPatrolInterval = null;
let patrolStartTime = Date.now();
let totalDetections = 0;
let alertsHandled = 0;
let patrolDistance = 0;
let robotPosition = { x: 50, y: 50 };
let landmarks = [];
let currentDetections = [];
let frameCount = 0;
let lastFrameTime = Date.now();

// 视图切换
function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
    document.getElementById(viewName + 'View').style.display = 'block';
}

// 模拟数据生成
function generateSensorData() {
    const baseTemp = 25 + Math.sin(Date.now() / 60000) * 5;
    const baseHumidity = 60 + Math.cos(Date.now() / 45000) * 10;
    
    return {
        temperature: (baseTemp + (Math.random() - 0.5) * 2).toFixed(1),
        humidity: Math.max(20, Math.min(90, baseHumidity + (Math.random() - 0.5) * 5)).toFixed(1),
        air_quality: (45 + Math.random() * 30).toFixed(1),
        wind_speed: (1.5 + Math.random() * 4).toFixed(1)
    };
}

// 模拟检测数据
function generateDetections() {
    const detectionTypes = [
        { class: 'deer', type: 'animal', confidence: 0.68, risk: 'low', color: '#22c55e' },
        { class: 'bird', type: 'animal', confidence: 0.61, risk: 'low', color: '#22c55e' },
        { class: 'person', type: 'person', confidence: 0.91, risk: 'medium', color: '#3b82f6' },
        { class: 'smoke', type: 'smoke', confidence: 0.72, risk: 'high', color: '#6b7280' },
        { class: 'fire', type: 'fire', confidence: 0.85, risk: 'critical', color: '#ef4444' }
    ];

    const detections = [];
    const count = Math.floor(Math.random() * 3);
    
    for (let i = 0; i < count; i++) {
        if (Math.random() < 0.3) {
            const type = detectionTypes[Math.floor(Math.random() * detectionTypes.length)];
            detections.push({
                ...type,
                bbox: [
                    Math.random() * 400 + 50,
                    Math.random() * 300 + 50,
                    Math.random() * 100 + 450,
                    Math.random() * 100 + 350
                ]
            });
        }
    }
    
    return detections;
}

// 更新传感器显示
function updateSensorDisplay() {
    const sensorData = generateSensorData();
    
    document.getElementById('temperature').textContent = sensorData.temperature + '°C';
    document.getElementById('humidity').textContent = sensorData.humidity + '%';
    document.getElementById('windSpeed').textContent = sensorData.wind_speed + ' m/s';
    
    const aq = parseFloat(sensorData.air_quality);
    document.getElementById('airQuality').textContent = aq < 50 ? '优良' : aq < 100 ? '中等' : '较差';
    document.getElementById('airQuality').className = aq < 50 ? 'status-value success' : 
                                                     aq < 100 ? 'status-value warning' : 'status-value critical';
}

// 摄像头功能
function startCamera() {
    if (cameraInterval) clearInterval(cameraInterval);
    
    const cameraFeed = document.getElementById('cameraFeed');
    cameraFeed.innerHTML = `
        <div class="camera-overlay" id="cameraOverlay"></div>
        <div style="color: #22c55e; font-size: 18px;">🌲 森林巡逻进行中...</div>
    `;
    
    cameraInterval = setInterval(() => {
        updateCameraOverlay('cameraOverlay');
    }, 1000);
    
    addLog('巡逻相机已启动', 'success');
}

function stopCamera() {
    if (cameraInterval) {
        clearInterval(cameraInterval);
        cameraInterval = null;
    }
    document.getElementById('cameraFeed').innerHTML = '<div>巡逻监控已停止</div>';
    addLog('巡逻监控已停止', 'warning');
}

function updateCameraOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    const detections = generateDetections();
    
    overlay.innerHTML = '';
    detections.forEach((detection, index) => {
        const [x1, y1, x2, y2] = detection.bbox;
        
        // 检测框
        const box = document.createElement('div');
        box.className = 'detection-box';
        box.style.left = x1 + 'px';
        box.style.top = y1 + 'px';
        box.style.width = (x2 - x1) + 'px';
        box.style.height = (y2 - y1) + 'px';
        box.style.borderColor = detection.color;
        
        // 标签
        const label = document.createElement('div');
        label.className = 'detection-label';
        label.style.left = x1 + 'px';
        label.style.top = y1 + 'px';
        label.textContent = `${detection.class} ${(detection.confidence * 100).toFixed(1)}%`;
        label.style.background = detection.color;
        
        overlay.appendChild(box);
        overlay.appendChild(label);
    });
}

// 增强摄像头功能
function startEnhancedCamera() {
    if (enhancedCameraInterval) clearInterval(enhancedCameraInterval);
    
    enhancedCameraInterval = setInterval(() => {
        frameCount++;
        const now = Date.now();
        const fps = Math.round(frameCount / ((now - lastFrameTime) / 1000));
        document.getElementById('frameRate').textContent = fps;
        
        const detections = generateDetections();
        currentDetections = detections;
        updateCameraOverlay('enhancedOverlay');
        updateObjectList(detections);
        updateDetectionStats(detections);
    }, 500);
    
    addLog('增强检测模式已启动', 'success');
}

function stopEnhancedCamera() {
    if (enhancedCameraInterval) {
        clearInterval(enhancedCameraInterval);
        enhancedCameraInterval = null;
    }
    document.getElementById('enhancedOverlay').innerHTML = '';
    document.getElementById('objectList').innerHTML = 
        '<div style="text-align:center;color:#666;padding:40px;">检测已停止</div>';
    addLog('增强检测已停止', 'warning');
}

function updateObjectList(detections) {
    const objectList = document.getElementById('objectList');
    objectList.innerHTML = '';
    
    if (detections.length === 0) {
        objectList.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">未检测到目标</div>';
        return;
    }
    
    detections.forEach(detection => {
        const item = document.createElement('div');
        item.className = `object-item ${detection.type}`;
        item.style.cssText = 'background: rgba(255,255,255,0.05); padding:15px; margin-bottom:10px; border-radius:8px; border-left:4px solid ' + detection.color;
        
        const confidencePercent = (detection.confidence * 100).toFixed(1);
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>${detection.class}</strong>
                <span style="color: #22c55e; font-weight: bold;">${confidencePercent}%</span>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.2); border-radius:3px; margin:5px 0; overflow:hidden;">
                <div style="height:100%; background:#22c55e; border-radius:3px; width: ${confidencePercent}%"></div>
            </div>
            <div style="font-size: 0.8em; color: #a0aec0;">
                类型: ${detection.type} | 风险: ${detection.risk}
            </div>
        `;
        
        objectList.appendChild(item);
    });
}

function updateDetectionStats(detections) {
    document.getElementById('totalObjects').textContent = detections.length;
    
    const highRiskCount = detections.filter(d => 
        d.risk === 'high' || d.risk === 'critical'
    ).length;
    document.getElementById('highRiskCount').textContent = highRiskCount;
    
    const avgConfidence = detections.length > 0 ? 
        detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length : 0;
    document.getElementById('avgConfidence').textContent = (avgConfidence * 100).toFixed(1) + '%';
}

// 机器人控制功能
function moveRobot(direction) {
    const step = 2;
    switch(direction) {
        case 'forward':
            robotPosition.y = Math.max(5, robotPosition.y - step);
            break;
        case 'backward':
            robotPosition.y = Math.min(95, robotPosition.y + step);
            break;
        case 'left':
            robotPosition.x = Math.max(5, robotPosition.x - step);
            break;
        case 'right':
            robotPosition.x = Math.min(95, robotPosition.x + step);
            break;
    }
    patrolDistance += 0.1;
    updateMap();
    addLog(`机器人向${getDirectionText(direction)}移动`, 'info');
}

function getDirectionText(direction) {
    const map = {
        'forward': '前',
        'backward': '后', 
        'left': '左',
        'right': '右'
    };
    return map[direction] || direction;
}

function stopRobot() {
    if (autoPatrolInterval) {
        clearInterval(autoPatrolInterval);
    }
    addLog('紧急停止已激活', 'warning');
}

function startPatrol() {
    addLog('开始自动巡逻模式', 'success');
    if (autoPatrolInterval) clearInterval(autoPatrolInterval);
    
    autoPatrolInterval = setInterval(() => {
        if (Math.random() < 0.3) {
            const directions = ['forward', 'backward', 'left', 'right'];
            moveRobot(directions[Math.floor(Math.random() * directions.length)]);
        }
    }, 2000);
}

function pausePatrol() {
    if (autoPatrolInterval) {
        clearInterval(autoPatrolInterval);
        addLog('自动巡逻已暂停', 'warning');
    }
}

function returnToBase() {
    robotPosition = { x: 50, y: 50 };
    updateMap();
    addLog('返回基地命令已执行', 'success');
}

function updateMap() {
    const robotMarker = document.getElementById('robotMarker');
    robotMarker.style.left = robotPosition.x + '%';
    robotMarker.style.top = robotPosition.y + '%';
    
    // 随机生成地标
    if (Math.random() < 0.2 && landmarks.length < 20) {
        const map = document.getElementById('slamMap');
        const landmark = document.createElement('div');
        landmark.className = Math.random() < 0.1 ? 'landmark alert-landmark' : 'landmark';
        landmark.style.left = Math.random() * 90 + 5 + '%';
        landmark.style.top = Math.random() * 90 + 5 + '%';
        map.appendChild(landmark);
        landmarks.push(landmark);
    }
}

// 系统功能
function testAlert(alertType) {
    const alertMap = {
        'fire': { level: 'critical', message: '检测到火源！需要立即处理', color: '#ef4444' },
        'smoke': { level: 'high', message: '检测到烟雾，可能存在火灾风险', color: '#f59e0b' },
        'animal': { level: 'low', message: '检测到野生动物活动', color: '#22c55e' },
        'person': { level: 'medium', message: '检测到人员活动', color: '#3b82f6' }
    };
    
    const alert = alertMap[alertType];
    if (alert) {
        addLog(`${alertType}警报测试: 已触发`, 'success');
        
        const resultsDiv = document.getElementById('detectionResults');
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-item ${alert.level}`;
        alertDiv.innerHTML = `
            <strong>${alertType.toUpperCase()} 警报</strong><br>
            ${alert.message}<br>
            <small>时间: ${new Date().toLocaleTimeString()}</small>
        `;
        resultsDiv.appendChild(alertDiv);
        
        // 更新风险等级
        updateRiskIndicator(alert.level);
    }
}

function updateRiskIndicator(riskLevel) {
    const riskElement = document.getElementById('riskLevel');
    riskElement.innerHTML = `<span class="risk-indicator risk-${riskLevel}"></span>${getRiskText(riskLevel)}`;
}

function getRiskText(riskLevel) {
    const riskMap = {
        'low': '低风险',
        'medium': '中等风险', 
        'high': '高风险',
        'critical': '严重风险'
    };
    return riskMap[riskLevel] || '未知风险';
}

function clearAlerts() {
    document.getElementById('detectionResults').innerHTML = 
        '<div style="text-align:center;color:#666;padding:20px;">无活跃警报</div>';
    updateRiskIndicator('low');
    addLog('所有警报已清除', 'info');
}

function testDetection() {
    const detections = generateDetections();
    totalDetections += detections.length;
    
    addLog(`目标检测完成: 发现 ${detections.length} 个目标`, 'success');
    
    const resultsDiv = document.getElementById('detectionResults');
    resultsDiv.innerHTML = '';
    
    if (detections.length > 0) {
        detections.forEach(detection => {
            const detDiv = document.createElement('div');
            detDiv.className = 'alert-item info';
            detDiv.innerHTML = `
                <strong>${detection.class}</strong><br>
                类型: ${detection.type}<br>
                置信度: ${(detection.confidence * 100).toFixed(1)}%<br>
                风险等级: ${detection.risk}
            `;
            resultsDiv.appendChild(detDiv);
        });
    } else {
        resultsDiv.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">未检测到目标</div>';
    }
}

function runDiagnostics() {
    addLog('开始系统全面诊断...', 'info');
    
    setTimeout(() => {
        document.getElementById('slamDiag').textContent = '正常';
        document.getElementById('visionDiag').textContent = '正常';
        document.getElementById('commDiag').textContent = '正常';
        document.getElementById('powerDiag').textContent = '正常';
        addLog('系统诊断完成: 所有系统正常', 'success');
    }, 2000);
}

function addTask() {
    const tasks = [
        '高优先级区域检查',
        '传感器校准',
        '数据备份',
        '系统软件更新',
        '电池更换提醒'
    ];
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    
    const taskQueue = document.getElementById('taskQueue');
    const taskCount = taskQueue.children.length + 1;
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.textContent = `${taskCount}. ${randomTask}`;
    taskQueue.appendChild(taskItem);
    
    addLog(`新任务已添加: ${randomTask}`, 'info');
}

function captureSnapshot() {
    addLog('快照已保存', 'success');
}

// 指标更新
function updateMetrics() {
    const uptime = Math.floor((Date.now() - patrolStartTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    document.getElementById('uptime').textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
    
    document.getElementById('totalDetections').textContent = totalDetections;
    document.getElementById('alertsHandled').textContent = alertsHandled;
    document.getElementById('patrolDistance').textContent = patrolDistance.toFixed(1);
    
    const battery = Math.max(10, 85 - (uptime / 3600) * 5);
    document.getElementById('batteryLevel').textContent = Math.round(battery) + '%';
    
    const dataUsage = 1.2 + (uptime / 3600) * 0.1;
    document.getElementById('dataUsage').textContent = dataUsage.toFixed(1);
}

function addLog(message, type = 'info') {
    const logContainer = document.getElementById('systemLog');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timestamp = new Date().toLocaleTimeString();
    const color = type === 'error' ? '#ef4444' : 
                 type === 'success' ? '#22c55e' : 
                 type === 'warning' ? '#f59e0b' : '#3b82f6';
    
    logEntry.innerHTML = `<span style="color: ${color}">[${timestamp}] ${message}</span>`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    const entries = logContainer.querySelectorAll('.log-entry');
    if (entries.length > 50) {
        entries[0].remove();
    }
}

// 初始化系统
function initializeSystem() {
    addLog('森林巡逻机器人系统初始化中...', 'info');
    addLog('演示模式已激活 - 使用模拟数据', 'info');
    
    // 启动定期更新
    setInterval(updateSensorDisplay, 3000);
    setInterval(updateMetrics, 1000);
    setInterval(updateMap, 5000);
    
    // 模拟随机事件
    setInterval(() => {
        if (Math.random() < 0.1) {
            totalDetections++;
            addLog(`检测到森林目标 (#${totalDetections})`, 'success');
        }
    }, 8000);
    
    setInterval(() => {
        if (Math.random() < 0.05) {
            alertsHandled++;
            addLog(`警报已处理 (#${alertsHandled})`, 'warning');
        }
    }, 15000);
    
    // 初始地图
    updateMap();
    
    addLog('系统初始化完成，开始森林巡逻演示', 'success');
    startCamera();
}

// 启动系统
document.addEventListener('DOMContentLoaded', initializeSystem);
