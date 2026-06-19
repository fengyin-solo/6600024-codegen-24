import type { AlarmEvent, ConnectionLog } from '../types'

export interface NodeReportItem {
  id: string
  name: string
  nodeId: string
  dataType?: string
  value: unknown
  unit?: string
  quality?: string
  description?: string
}

export interface TrendReportItem {
  title: string
  nodeId: string
  dataUrl: string
}

export interface ReportData {
  generatedAt: number
  serverUrl: string
  isConnected: boolean
  sessionStartTime: number | null
  nodes: NodeReportItem[]
  trends: TrendReportItem[]
  alarms: AlarmEvent[]
  connectionLogs: ConnectionLog[]
}

type SeverityKey = AlarmEvent['severity']

const SEVERITY_LABEL: Record<SeverityKey, string> = {
  Critical: '严重',
  High: '高',
  Medium: '中',
  Low: '低',
  Info: '信息'
}

const SEVERITY_COLOR: Record<SeverityKey, string> = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#2563eb',
  Info: '#6b7280'
}

const SEVERITY_ORDER: SeverityKey[] = ['Critical', 'High', 'Medium', 'Low', 'Info']

function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return escapeHtml(value)
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}

function formatDateForFile(timestamp: number): string {
  const d = new Date(timestamp)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0 秒'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} 小时`)
  if (m > 0) parts.push(`${m} 分`)
  parts.push(`${s} 秒`)
  return parts.join(' ')
}

function qualityClass(quality?: string): string {
  if (quality === 'Good') return 'q-good'
  if (quality === 'Bad') return 'q-bad'
  if (quality === 'Uncertain') return 'q-uncertain'
  return 'q-unknown'
}

function buildAlarmStats(alarms: AlarmEvent[]) {
  const total = alarms.length
  const acknowledged = alarms.filter(a => a.acknowledged).length
  const active = total - acknowledged
  const bySeverity: Record<string, number> = {}
  SEVERITY_ORDER.forEach(s => (bySeverity[s] = 0))
  alarms.forEach(a => {
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1
  })
  return { total, acknowledged, active, bySeverity }
}

function buildConnectionStats(logs: ConnectionLog[]) {
  const total = logs.length
  const connected = logs.filter(l => l.status === 'connected').length
  const disconnected = logs.filter(l => l.status === 'disconnected').length
  const latest = logs[0]
  return { total, connected, disconnected, latest }
}

function nodeRows(nodes: NodeReportItem[]): string {
  if (nodes.length === 0) {
    return `<tr><td colspan="6" class="empty">暂无节点数据</td></tr>`
  }
  return nodes
    .map(
      (n, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(n.name)}${n.description ? `<div class="muted">${escapeHtml(n.description)}</div>` : ''}</td>
        <td class="mono">${escapeHtml(n.nodeId)}</td>
        <td>${escapeHtml(n.dataType || '-')}</td>
        <td class="mono">${formatValue(n.value)}${n.unit ? ` <span class="unit">${escapeHtml(n.unit)}</span>` : ''}</td>
        <td><span class="badge ${qualityClass(n.quality)}">${escapeHtml(n.quality || 'Unknown')}</span></td>
      </tr>`
    )
    .join('')
}

function trendSection(trends: TrendReportItem[]): string {
  if (trends.length === 0) {
    return `<p class="empty">暂无趋势数据</p>`
  }
  return trends
    .map(t => {
      const image = t.dataUrl
        ? `<img src="${escapeHtml(t.dataUrl)}" alt="${escapeHtml(t.title)}" />`
        : `<div class="img-placeholder">趋势截图获取失败</div>`
      return `
      <div class="trend-card">
        <div class="trend-title">${escapeHtml(t.title)} <span class="muted mono">${escapeHtml(t.nodeId)}</span></div>
        ${image}
      </div>`
    })
    .join('')
}

function alarmStatsCards(alarms: AlarmEvent[]): string {
  const stats = buildAlarmStats(alarms)
  const severityCards = SEVERITY_ORDER.filter(s => stats.bySeverity[s] > 0)
    .map(
      s => `
      <div class="stat-card" style="border-top-color:${SEVERITY_COLOR[s]}">
        <div class="stat-label">${SEVERITY_LABEL[s]}</div>
        <div class="stat-value">${stats.bySeverity[s]}</div>
      </div>`
    )
    .join('')
  return `
    <div class="stat-grid">
      <div class="stat-card" style="border-top-color:#0ea5e9">
        <div class="stat-label">报警总数</div>
        <div class="stat-value">${stats.total}</div>
      </div>
      <div class="stat-card" style="border-top-color:#dc2626">
        <div class="stat-label">未确认</div>
        <div class="stat-value">${stats.active}</div>
      </div>
      <div class="stat-card" style="border-top-color:#16a34a">
        <div class="stat-label">已确认</div>
        <div class="stat-value">${stats.acknowledged}</div>
      </div>
      ${severityCards}
    </div>`
}

function alarmRows(alarms: AlarmEvent[]): string {
  if (alarms.length === 0) {
    return `<tr><td colspan="5" class="empty">暂无报警记录</td></tr>`
  }
  return alarms
    .map(
      a => `
      <tr${a.acknowledged ? ' class="row-muted"' : ''}>
        <td><span class="badge" style="background:${SEVERITY_COLOR[a.severity]}">${SEVERITY_LABEL[a.severity]}</span></td>
        <td>${escapeHtml(a.nodeName)}<div class="muted mono">${escapeHtml(a.nodeId)}</div></td>
        <td>${escapeHtml(a.message)}</td>
        <td>${a.acknowledged ? '已确认' : '未确认'}</td>
        <td class="mono">${formatDateTime(a.timestamp)}</td>
      </tr>`
    )
    .join('')
}

function connectionRows(logs: ConnectionLog[]): string {
  if (logs.length === 0) {
    return `<tr><td colspan="4" class="empty">暂无连接状态记录</td></tr>`
  }
  return logs
    .map(
      l => `
      <tr>
        <td><span class="badge ${l.status === 'connected' ? 'q-good' : 'q-bad'}">${l.status === 'connected' ? '已连接' : '已断开'}</span></td>
        <td>${escapeHtml(l.message || '-')}</td>
        <td class="mono">${formatDateTime(l.timestamp)}</td>
        <td>${l.status === 'connected' ? '上线' : '离线'}</td>
      </tr>`
    )
    .join('')
}

export function generateDailyReport(data: ReportData): string {
  const alarmStats = buildAlarmStats(data.alarms)
  const connStats = buildConnectionStats(data.connectionLogs)
  const goodNodes = data.nodes.filter(n => n.quality === 'Good').length
  const abnormalNodes = data.nodes.length - goodNodes
  const sessionDuration = data.sessionStartTime ? data.generatedAt - data.sessionStartTime : 0

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>OPC-UA 运行日报 - ${formatDateTime(data.generatedAt)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
    margin: 0; padding: 32px; color: #1f2937; background: #fff;
    line-height: 1.6;
  }
  .report { max-width: 1100px; margin: 0 auto; }
  .report-header {
    border-bottom: 3px solid #06b6d4; padding-bottom: 16px; margin-bottom: 24px;
    display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;
  }
  .report-title { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0; }
  .report-subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
  .meta { font-size: 13px; color: #475569; text-align: right; }
  .meta div { margin-bottom: 2px; }
  .toolbar { margin-bottom: 20px; }
  .btn-print {
    background: #06b6d4; color: #fff; border: none; padding: 8px 18px;
    border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500;
  }
  .btn-print:hover { background: #0891b2; }
  .summary-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px;
  }
  .summary-card {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;
    border-left: 4px solid #06b6d4;
  }
  .summary-card .label { font-size: 12px; color: #64748b; }
  .summary-card .value { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 4px; }
  section { margin-bottom: 32px; }
  .section-title {
    font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 14px 0;
    padding-left: 10px; border-left: 4px solid #06b6d4;
  }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 12px; }
  tr:hover td { background: #f8fafc; }
  .row-muted td { color: #94a3b8; }
  .mono { font-family: "SF Mono", "Courier New", monospace; font-size: 12px; }
  .muted { color: #94a3b8; font-size: 12px; }
  .unit { color: #94a3b8; font-size: 12px; }
  .empty { text-align: center; color: #94a3b8; padding: 20px; }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px;
    color: #fff; background: #6b7280;
  }
  .q-good { background: #16a34a; }
  .q-bad { background: #dc2626; }
  .q-uncertain { background: #d97706; }
  .q-unknown { background: #6b7280; }
  .stat-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px;
  }
  .stat-card {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;
    border-top: 4px solid #06b6d4;
  }
  .stat-card .stat-label { font-size: 12px; color: #64748b; }
  .stat-card .stat-value { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 4px; }
  .trend-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .trend-card {
    background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; text-align: center;
  }
  .trend-title { color: #e2e8f0; font-size: 14px; font-weight: 600; margin-bottom: 8px; text-align: left; }
  .trend-card img { max-width: 100%; height: auto; border-radius: 4px; }
  .img-placeholder { color: #94a3b8; padding: 40px; background: #1e293b; border-radius: 4px; }
  .footer {
    margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;
    font-size: 12px; color: #94a3b8; text-align: center;
  }
  @media print {
    body { padding: 0; }
    .toolbar { display: none; }
    .report-header { border-bottom: 2px solid #06b6d4; }
    section { page-break-inside: avoid; }
    .trend-card { page-break-inside: avoid; }
  }
</style>
</head>
<body>
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
    <div class="summary-card">
      <div class="label">变量节点总数</div>
      <div class="value">${data.nodes.length}</div>
    </div>
    <div class="summary-card" style="border-left-color:#16a34a">
      <div class="label">质量正常 (Good)</div>
      <div class="value">${goodNodes}</div>
    </div>
    <div class="summary-card" style="border-left-color:#d97706">
      <div class="label">异常/不确定</div>
      <div class="value">${abnormalNodes}</div>
    </div>
    <div class="summary-card" style="border-left-color:#dc2626">
      <div class="label">报警事件总数</div>
      <div class="value">${alarmStats.total}</div>
    </div>
  </div>

  <section>
    <h2 class="section-title">一、节点数据汇总</h2>
    <table>
      <thead>
        <tr>
          <th>#</th><th>节点名称</th><th>Node ID</th><th>数据类型</th><th>当前值</th><th>质量</th>
        </tr>
      </thead>
      <tbody>${nodeRows(data.nodes)}</tbody>
    </table>
  </section>

  <section>
    <h2 class="section-title">二、数据趋势截图</h2>
    <div class="trend-grid">${trendSection(data.trends)}</div>
  </section>

  <section>
    <h2 class="section-title">三、报警统计</h2>
    ${alarmStatsCards(data.alarms)}
    <table>
      <thead>
        <tr>
          <th>级别</th><th>节点</th><th>报警信息</th><th>状态</th><th>时间</th>
        </tr>
      </thead>
      <tbody>${alarmRows(data.alarms)}</tbody>
    </table>
  </section>

  <section>
    <h2 class="section-title">四、连接状态记录</h2>
    <div class="summary-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="summary-card"><div class="label">连接事件总数</div><div class="value">${connStats.total}</div></div>
      <div class="summary-card" style="border-left-color:#16a34a"><div class="label">连接次数</div><div class="value">${connStats.connected}</div></div>
      <div class="summary-card" style="border-left-color:#dc2626"><div class="label">断开次数</div><div class="value">${connStats.disconnected}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>状态</th><th>事件描述</th><th>时间</th><th>动作</th>
        </tr>
      </thead>
      <tbody>${connectionRows(data.connectionLogs)}</tbody>
    </table>
  </section>

  <div class="footer">
    本报告由 OPC-UA 工业监控系统自动生成 · 报告内容包含节点数据、趋势截图、报警统计与连接状态记录
  </div>
</div>
</body>
</html>`
}

export function downloadDailyReport(data: ReportData): void {
  const html = generateDailyReport(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `运行日报_${formatDateForFile(data.generatedAt)}.html`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
