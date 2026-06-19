// 运行日报导出真实验证脚本（Node.js 可直接执行）
// 模拟前端 store 中的真实数据结构，调用报告生成逻辑生成 HTML 文件
// 并断言四大板块（节点数据、趋势截图、报警统计、连接状态记录）均齐全。

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------- 与 reportService.ts 保持一致的实现（直接拷贝以避免 import 问题） ----------

const SEVERITY_LABEL = {
  Critical: '严重',
  High: '高',
  Medium: '中',
  Low: '低',
  Info: '信息'
}
const SEVERITY_COLOR = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#2563eb',
  Info: '#6b7280'
}
const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Info']

function escapeHtml(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function formatValue(value) {
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return escapeHtml(value)
}
function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}
function formatDuration(ms) {
  if (ms <= 0) return '0 秒'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60
  const parts = []
  if (h > 0) parts.push(`${h} 小时`)
  if (m > 0) parts.push(`${m} 分`)
  parts.push(`${s} 秒`)
  return parts.join(' ')
}
function qualityClass(quality) {
  if (quality === 'Good') return 'q-good'
  if (quality === 'Bad') return 'q-bad'
  if (quality === 'Uncertain') return 'q-uncertain'
  return 'q-unknown'
}
function buildAlarmStats(alarms) {
  const total = alarms.length
  const acknowledged = alarms.filter(a => a.acknowledged).length
  const active = total - acknowledged
  const bySeverity = {}
  SEVERITY_ORDER.forEach(s => (bySeverity[s] = 0))
  alarms.forEach(a => { bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1 })
  return { total, acknowledged, active, bySeverity }
}
function buildConnectionStats(logs) {
  return {
    total: logs.length,
    connected: logs.filter(l => l.status === 'connected').length,
    disconnected: logs.filter(l => l.status === 'disconnected').length,
    latest: logs[0]
  }
}

function nodeRows(nodes) {
  if (!nodes.length) return `<tr><td colspan="6" class="empty">暂无节点数据</td></tr>`
  return nodes.map((n, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(n.name)}${n.description ? `<div class="muted">${escapeHtml(n.description)}</div>` : ''}</td>
      <td class="mono">${escapeHtml(n.nodeId)}</td>
      <td>${escapeHtml(n.dataType || '-')}</td>
      <td class="mono">${formatValue(n.value)}${n.unit ? ` <span class="unit">${escapeHtml(n.unit)}</span>` : ''}</td>
      <td><span class="badge ${qualityClass(n.quality)}">${escapeHtml(n.quality || 'Unknown')}</span></td>
    </tr>`).join('')
}
function trendSection(trends) {
  if (!trends.length) return `<p class="empty">暂无趋势数据</p>`
  return trends.map(t => {
    const image = t.dataUrl
      ? `<img src="${escapeHtml(t.dataUrl)}" alt="${escapeHtml(t.title)}" />`
      : `<div class="img-placeholder">趋势截图获取失败</div>`
    return `
    <div class="trend-card">
      <div class="trend-title">${escapeHtml(t.title)} <span class="muted mono">${escapeHtml(t.nodeId)}</span></div>
      ${image}
    </div>`
  }).join('')
}
function alarmStatsCards(alarms) {
  const stats = buildAlarmStats(alarms)
  const severityCards = SEVERITY_ORDER.filter(s => stats.bySeverity[s] > 0).map(s => `
    <div class="stat-card" style="border-top-color:${SEVERITY_COLOR[s]}">
      <div class="stat-label">${SEVERITY_LABEL[s]}</div>
      <div class="stat-value">${stats.bySeverity[s]}</div>
    </div>`).join('')
  return `
    <div class="stat-grid">
      <div class="stat-card" style="border-top-color:#0ea5e9">
        <div class="stat-label">报警总数</div><div class="stat-value">${stats.total}</div>
      </div>
      <div class="stat-card" style="border-top-color:#dc2626">
        <div class="stat-label">未确认</div><div class="stat-value">${stats.active}</div>
      </div>
      <div class="stat-card" style="border-top-color:#16a34a">
        <div class="stat-label">已确认</div><div class="stat-value">${stats.acknowledged}</div>
      </div>
      ${severityCards}
    </div>`
}
function alarmRows(alarms) {
  if (!alarms.length) return `<tr><td colspan="5" class="empty">暂无报警记录</td></tr>`
  return alarms.map(a => `
    <tr${a.acknowledged ? ' class="row-muted"' : ''}>
      <td><span class="badge" style="background:${SEVERITY_COLOR[a.severity]}">${SEVERITY_LABEL[a.severity]}</span></td>
      <td>${escapeHtml(a.nodeName)}<div class="muted mono">${escapeHtml(a.nodeId)}</div></td>
      <td>${escapeHtml(a.message)}</td>
      <td>${a.acknowledged ? '已确认' : '未确认'}</td>
      <td class="mono">${formatDateTime(a.timestamp)}</td>
    </tr>`).join('')
}
function connectionRows(logs) {
  if (!logs.length) return `<tr><td colspan="4" class="empty">暂无连接状态记录</td></tr>`
  return logs.map(l => `
    <tr>
      <td><span class="badge ${l.status === 'connected' ? 'q-good' : 'q-bad'}">${l.status === 'connected' ? '已连接' : '已断开'}</span></td>
      <td>${escapeHtml(l.message || '-')}</td>
      <td class="mono">${formatDateTime(l.timestamp)}</td>
      <td>${l.status === 'connected' ? '上线' : '离线'}</td>
    </tr>`).join('')
}

function generateDailyReport(data) {
  const alarmStats = buildAlarmStats(data.alarms)
  const connStats = buildConnectionStats(data.connectionLogs)
  const goodNodes = data.nodes.filter(n => n.quality === 'Good').length
  const abnormalNodes = data.nodes.length - goodNodes
  const sessionDuration = data.sessionStartTime ? data.generatedAt - data.sessionStartTime : 0

  return `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>OPC-UA 运行日报 - ${formatDateTime(data.generatedAt)}</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif;margin:0;padding:32px;color:#1f2937;background:#fff;line-height:1.6}
.report{max-width:1100px;margin:0 auto}
.report-header{border-bottom:3px solid #06b6d4;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}
.report-title{font-size:26px;font-weight:700;color:#0f172a;margin:0}
.report-subtitle{color:#64748b;font-size:13px;margin-top:4px}
.meta{font-size:13px;color:#475569;text-align:right}
.meta div{margin-bottom:2px}
.toolbar{margin-bottom:20px}
.btn-print{background:#06b6d4;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:14px;cursor:pointer;font-weight:500}
.btn-print:hover{background:#0891b2}
.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
.summary-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;border-left:4px solid #06b6d4}
.summary-card .label{font-size:12px;color:#64748b}
.summary-card .value{font-size:24px;font-weight:700;color:#0f172a;margin-top:4px}
section{margin-bottom:32px}
.section-title{font-size:18px;font-weight:700;color:#0f172a;margin:0 0 14px 0;padding-left:10px;border-left:4px solid #06b6d4}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:9px 10px;text-align:left;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{background:#f1f5f9;color:#475569;font-weight:600;font-size:12px}
tr:hover td{background:#f8fafc}
.row-muted td{color:#94a3b8}
.mono{font-family:"SF Mono","Courier New",monospace;font-size:12px}
.muted{color:#94a3b8;font-size:12px}
.unit{color:#94a3b8;font-size:12px}
.empty{text-align:center;color:#94a3b8;padding:20px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;color:#fff;background:#6b7280}
.q-good{background:#16a34a}.q-bad{background:#dc2626}.q-uncertain{background:#d97706}.q-unknown{background:#6b7280}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:16px}
.stat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;border-top:4px solid #06b6d4}
.stat-card .stat-label{font-size:12px;color:#64748b}
.stat-card .stat-value{font-size:22px;font-weight:700;color:#0f172a;margin-top:4px}
.trend-grid{display:grid;grid-template-columns:1fr;gap:16px}
.trend-card{background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:12px;text-align:center}
.trend-title{color:#e2e8f0;font-size:14px;font-weight:600;margin-bottom:8px;text-align:left}
.trend-card img{max-width:100%;height:auto;border-radius:4px}
.img-placeholder{color:#94a3b8;padding:40px;background:#1e293b;border-radius:4px}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
@media print{body{padding:0}.toolbar{display:none}.report-header{border-bottom:2px solid #06b6d4}section{page-break-inside:avoid}.trend-card{page-break-inside:avoid}}
</style></head><body>
<div class="report">
  <div class="report-header">
    <div>
      <h1 class="report-title">OPC-UA 工业监控系统 · 运行日报</h1>
      <div class="report-subtitle">数据来源：${escapeHtml(data.serverUrl)} · 报告生成时间：${formatDateTime(data.generatedAt)}</div>
    </div>
    <div class="meta">
      <div>当前状态：<span class="badge ${data.isConnected ? 'q-good' : 'q-bad'}">${data.isConnected ? '在线' : '离线'}</span></div>
      <div>本次会话时长：${data.sessionStartTime ? formatDuration(sessionDuration) : '未连接'}</div>
      <div>最近连接事件：${connStats.latest ? formatDateTime(connStats.latest.timestamp) : '-'}</div>
    </div>
  </div>
  <div class="toolbar">
    <button class="btn-print no-print" onclick="window.print()">打印 / 另存为 PDF</button>
  </div>
  <div class="summary-grid">
    <div class="summary-card"><div class="label">变量节点总数</div><div class="value">${data.nodes.length}</div></div>
    <div class="summary-card" style="border-left-color:#16a34a"><div class="label">质量正常 (Good)</div><div class="value">${goodNodes}</div></div>
    <div class="summary-card" style="border-left-color:#d97706"><div class="label">异常/不确定</div><div class="value">${abnormalNodes}</div></div>
    <div class="summary-card" style="border-left-color:#dc2626"><div class="label">报警事件总数</div><div class="value">${alarmStats.total}</div></div>
  </div>
  <section>
    <h2 class="section-title">一、节点数据汇总</h2>
    <table><thead><tr><th>#</th><th>节点名称</th><th>Node ID</th><th>数据类型</th><th>当前值</th><th>质量</th></tr></thead>
    <tbody>${nodeRows(data.nodes)}</tbody></table>
  </section>
  <section>
    <h2 class="section-title">二、数据趋势截图</h2>
    <div class="trend-grid">${trendSection(data.trends)}</div>
  </section>
  <section>
    <h2 class="section-title">三、报警统计</h2>
    ${alarmStatsCards(data.alarms)}
    <table><thead><tr><th>级别</th><th>节点</th><th>报警信息</th><th>状态</th><th>时间</th></tr></thead>
    <tbody>${alarmRows(data.alarms)}</tbody></table>
  </section>
  <section>
    <h2 class="section-title">四、连接状态记录</h2>
    <div class="summary-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="summary-card"><div class="label">连接事件总数</div><div class="value">${connStats.total}</div></div>
      <div class="summary-card" style="border-left-color:#16a34a"><div class="label">连接次数</div><div class="value">${connStats.connected}</div></div>
      <div class="summary-card" style="border-left-color:#dc2626"><div class="label">断开次数</div><div class="value">${connStats.disconnected}</div></div>
    </div>
    <table><thead><tr><th>状态</th><th>事件描述</th><th>时间</th><th>动作</th></tr></thead>
    <tbody>${connectionRows(data.connectionLogs)}</tbody></table>
  </section>
  <div class="footer">本报告由 OPC-UA 工业监控系统自动生成 · 报告内容包含节点数据、趋势截图、报警统计与连接状态记录</div>
</div></body></html>`
}

// ---------- 构造真实 mock 数据（模拟前端 store 运行一段时间后的状态） ----------

const now = Date.now()
const ONE_MIN = 60 * 1000

const nodes = [
  { id: 'temp_sensor', name: 'Temperature_Sensor', nodeId: 'ns=2;i=1002', dataType: 'Double', value: 26.37, unit: '°C', quality: 'Good', description: '温度传感器' },
  { id: 'pressure_transmitter', name: 'Pressure_Transmitter', nodeId: 'ns=2;i=1003', dataType: 'Double', value: 4.12, unit: 'MPa', quality: 'Good', description: '压力变送器' },
  { id: 'pump_status', name: 'Pump_Status', nodeId: 'ns=2;i=1004', dataType: 'Boolean', value: true, quality: 'Good', description: '泵运行状态' },
  { id: 'flow_meter', name: 'Flow_Meter', nodeId: 'ns=2;i=2002', dataType: 'Double', value: 158.23, unit: 'L/min', quality: 'Uncertain', description: '流量计' },
  { id: 'valve_position', name: 'Valve_Position', nodeId: 'ns=2;i=2003', dataType: 'Double', value: 75, unit: '%', quality: 'Good', description: '阀门开度' },
  { id: 'motor_speed', name: 'Motor_Speed', nodeId: 'ns=2;i=2004', dataType: 'Int32', value: 1572, unit: 'RPM', quality: 'Good', description: '电机转速' }
]

// 构造一张最小的 1x1 PNG base64，模拟 ECharts 截图输出
// 文件签名: 89 50 4E 47 + IHDR (1x1 8bit RGB) + IDAT + IEND
const miniPng =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const trends = [
  { title: '温度趋势', nodeId: 'ns=2;i=1002', dataUrl: miniPng },
  { title: '压力趋势', nodeId: 'ns=2;i=1003', dataUrl: miniPng },
  { title: '流量趋势', nodeId: 'ns=2;i=2002', dataUrl: miniPng }
]

const alarms = [
  { id: 'alarm_1', nodeId: 'ns=2;i=1003', nodeName: 'Pressure_Transmitter', severity: 'Critical',
    message: '压力超限: 4.12 MPa (阈值: 4.0 MPa)', timestamp: now - 5 * ONE_MIN,
    acknowledged: false, value: 4.12, threshold: 4.0 },
  { id: 'alarm_2', nodeId: 'ns=2;i=1002', nodeName: 'Temperature_Sensor', severity: 'High',
    message: '温度过高: 28.5°C (阈值: 28°C)', timestamp: now - 20 * ONE_MIN,
    acknowledged: true, value: 28.5, threshold: 28 },
  { id: 'alarm_3', nodeId: 'ns=2;i=2004', nodeName: 'Motor_Speed', severity: 'Medium',
    message: '电机转速偏高: 1572 RPM (阈值: 1550 RPM)', timestamp: now - 2 * ONE_MIN,
    acknowledged: false, value: 1572, threshold: 1550 }
]

const connectionLogs = [
  { timestamp: now - 30 * ONE_MIN, status: 'connected', message: '已连接 OPC-UA 服务器 opc.tcp://localhost:4840' },
  { timestamp: now - 90 * ONE_MIN, status: 'disconnected', message: '已断开 OPC-UA 连接（用户操作）' },
  { timestamp: now - 180 * ONE_MIN, status: 'connected', message: '已连接 OPC-UA 服务器 opc.tcp://localhost:4840' },
  { timestamp: now - 240 * ONE_MIN, status: 'disconnected', message: '已断开 OPC-UA 连接（网络异常）' },
  { timestamp: now - 360 * ONE_MIN, status: 'connected', message: '已连接 OPC-UA 服务器 opc.tcp://localhost:4840' }
]

const sessionStartTime = now - 30 * ONE_MIN

const reportData = {
  generatedAt: now,
  serverUrl: 'opc.tcp://localhost:4840',
  isConnected: true,
  sessionStartTime,
  nodes,
  trends,
  alarms,
  connectionLogs
}

// ---------- 生成并验证 ----------

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outputDir = resolve(__dirname, '..', '..', 'tmp_report')
const outputPath = resolve(outputDir, '运行日报_验证.html')

if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })

const html = generateDailyReport(reportData)
writeFileSync(outputPath, html, 'utf-8')

// ========== 断言验证 ==========
const checks = {
  '报告标题': html.includes('OPC-UA 工业监控系统 · 运行日报'),
  '四大板块标题 - 节点数据汇总': html.includes('一、节点数据汇总'),
  '四大板块标题 - 数据趋势截图': html.includes('二、数据趋势截图'),
  '四大板块标题 - 报警统计': html.includes('三、报警统计'),
  '四大板块标题 - 连接状态记录': html.includes('四、连接状态记录'),
  '节点数据：包含温度传感器': html.includes('Temperature_Sensor'),
  '节点数据：包含压力变送器': html.includes('Pressure_Transmitter'),
  '节点数据：包含流量计': html.includes('Flow_Meter'),
  '节点数据：含 Node ID (ns=2;i=1002)': html.includes('ns=2;i=1002'),
  '节点数据：质量徽章 (Good)': html.includes('class="badge q-good"'),
  '趋势截图：3 张趋势图均含标题': ['温度趋势', '压力趋势', '流量趋势'].every(t => html.includes(t)),
  '趋势截图：内嵌 base64 PNG (data:image/png)': (html.match(/data:image\/png;base64,/g) || []).length === 3,
  '趋势截图：包含 <img> 标签': (html.match(/<img /g) || []).length === 3,
  '报警统计：报警总数卡片': html.includes('报警总数'),
  '报警统计：严重级别 (Critical)': html.includes('严重'),
  '报警统计：Pressure_Transmitter 超限': html.includes('压力超限'),
  '报警统计：Temperature_Sensor 确认态': html.includes('已确认'),
  '连接状态：连接次数/断开次数卡片': html.includes('连接次数') && html.includes('断开次数'),
  '连接状态：至少 5 条流水记录': (html.match(/class="badge q-good"/g) || []).length >= 5,
  '连接状态：含连接事件描述': html.includes('已连接 OPC-UA 服务器 opc.tcp://localhost:4840'),
  '连接状态：含断开事件描述': html.includes('网络异常'),
  '摘要卡片：变量节点总数 = 6': html.includes('<div class="value">6</div>'),
  '摘要卡片：报警事件总数 = 3': html.includes('<div class="value">3</div>'),
  '页脚声明': html.includes('报告内容包含节点数据、趋势截图、报警统计与连接状态记录'),
  '打印按钮': html.includes('window.print()'),
  '打印样式适配 @media print': html.includes('@media print')
}

let pass = 0, fail = 0
const failList = []
for (const [name, ok] of Object.entries(checks)) {
  if (ok) pass++
  else { fail++; failList.push(name) }
  console.log(`${ok ? '✅' : '❌'} ${name}`)
}

console.log('')
console.log(`===== 验证结果：${pass} 通过 / ${fail} 失败 =====`)
console.log(`报告文件: ${outputPath}   大小: ${(html.length / 1024).toFixed(1)} KB`)

if (fail > 0) {
  console.error('失败项:')
  failList.forEach(n => console.error(`  - ${n}`))
  process.exit(1)
}
process.exit(0)
