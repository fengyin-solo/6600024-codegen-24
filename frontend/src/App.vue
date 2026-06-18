<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-left">
        <el-icon :size="24" class="text-cyan-400"><Monitor /></el-icon>
        <h1 class="app-title">OPC-UA 工业节点浏览与数据采集</h1>
      </div>
      <div class="header-right">
        <el-badge :value="store.activeAlarmsCount" :max="99" class="alarm-badge">
          <el-icon :size="20" class="text-yellow-400"><Bell /></el-icon>
        </el-badge>
        <el-tag type="success" v-if="store.isConnected" class="status-tag">
          <el-icon><CircleCheck /></el-icon>
          在线
        </el-tag>
        <el-tag type="danger" v-else class="status-tag">
          <el-icon><CircleClose /></el-icon>
          离线
        </el-tag>
        <el-button
          :type="store.isConnected ? 'danger' : 'success'"
          size="small"
          @click="toggleConnection"
        >
          {{ store.isConnected ? '断开' : '连接' }}
        </el-button>
      </div>
    </header>

    <!-- 主内容区域 -->
    <div class="app-main">
      <!-- 左侧面板: 节点树 -->
      <aside class="left-panel">
        <NodeTree />
      </aside>

      <!-- 中央区域: 仪表盘 -->
      <main class="center-panel">
        <DataDashboard />
      </main>

      <!-- 右侧面板: 报警列表 -->
      <aside class="right-panel">
        <div class="alarm-panel">
          <div class="alarm-header">
            <h3 class="text-lg font-bold text-yellow-400">报警事件</h3>
            <el-button type="danger" size="small" text @click="store.clearAlarms()" v-if="store.alarms.length > 0">
              清空
            </el-button>
          </div>

          <div class="alarm-stats">
            <el-tag type="danger" size="small">严重: {{ criticalCount }}</el-tag>
            <el-tag type="warning" size="small">活跃: {{ store.activeAlarmsCount }}</el-tag>
            <el-tag type="info" size="small">总计: {{ store.alarms.length }}</el-tag>
          </div>

          <div class="alarm-list">
            <div
              v-for="alarm in store.alarms"
              :key="alarm.id"
              class="alarm-item"
              :class="{
                'alarm-critical': alarm.severity === 'Critical',
                'alarm-high': alarm.severity === 'High',
                'alarm-medium': alarm.severity === 'Medium',
                'alarm-acknowledged': alarm.acknowledged
              }"
            >
              <div class="alarm-item-header">
                <el-tag
                  :type="getSeverityType(alarm.severity)"
                  size="small"
                  effect="dark"
                >
                  {{ getSeverityLabel(alarm.severity) }}
                </el-tag>
                <span class="alarm-time">{{ formatTime(alarm.timestamp) }}</span>
              </div>
              <div class="alarm-item-body">
                <span class="alarm-node">{{ alarm.nodeName }}</span>
                <p class="alarm-message">{{ alarm.message }}</p>
              </div>
              <el-button
                v-if="!alarm.acknowledged"
                type="primary"
                size="small"
                text
                @click="store.acknowledgeAlarm(alarm.id)"
              >
                确认
              </el-button>
            </div>

            <div v-if="store.alarms.length === 0" class="no-alarms">
              <el-empty description="暂无报警" :image-size="60" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Monitor, Bell, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useOpcuaStore } from './store/opcua'
import NodeTree from './components/NodeTree.vue'
import DataDashboard from './components/DataDashboard.vue'
import type { AlarmEvent } from './types'

const store = useOpcuaStore()
const updateTimer = ref<number | null>(null)

const criticalCount = computed(() =>
  store.alarms.filter(a => a.severity === 'Critical' && !a.acknowledged).length
)

function toggleConnection() {
  if (store.isConnected) {
    store.disconnect()
    if (updateTimer.value) {
      clearInterval(updateTimer.value)
      updateTimer.value = null
    }
    ElMessage.warning('已断开 OPC-UA 连接')
  } else {
    store.connect()
    startSimulation()
    ElMessage.success('已连接 OPC-UA 服务器')
  }
}

function startSimulation() {
  updateTimer.value = window.setInterval(() => {
    store.simulateDataUpdate()
  }, 1000)
}

function getSeverityType(severity: AlarmEvent['severity']) {
  switch (severity) {
    case 'Critical': return 'danger'
    case 'High': return 'danger'
    case 'Medium': return 'warning'
    case 'Low': return 'info'
    case 'Info': return 'info'
  }
}

function getSeverityLabel(severity: AlarmEvent['severity']) {
  switch (severity) {
    case 'Critical': return '严重'
    case 'High': return '高'
    case 'Medium': return '中'
    case 'Low': return '低'
    case 'Info': return '信息'
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  store.connect()
  startSimulation()
})

onUnmounted(() => {
  if (updateTimer.value) {
    clearInterval(updateTimer.value)
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(71, 85, 105, 0.5);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-title {
  font-size: 18px;
  font-weight: bold;
  background: linear-gradient(90deg, #06b6d4, #22d3ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  width: 320px;
  background: rgba(30, 41, 59, 0.6);
  border-right: 1px solid rgba(71, 85, 105, 0.5);
  overflow-y: auto;
  flex-shrink: 0;
}

.center-panel {
  flex: 1;
  overflow-y: auto;
  background: #0f172a;
}

.right-panel {
  width: 340px;
  background: rgba(30, 41, 59, 0.6);
  border-left: 1px solid rgba(71, 85, 105, 0.5);
  overflow-y: auto;
  flex-shrink: 0;
}

.alarm-panel {
  padding: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.alarm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.alarm-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.alarm-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alarm-item {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 6px;
  padding: 10px;
  border-left: 3px solid #64748b;
}

.alarm-critical {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.alarm-high {
  border-left-color: #f97316;
  background: rgba(249, 115, 22, 0.05);
}

.alarm-medium {
  border-left-color: #eab308;
  background: rgba(234, 179, 8, 0.05);
}

.alarm-acknowledged {
  opacity: 0.5;
}

.alarm-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.alarm-time {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

.alarm-node {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.alarm-message {
  font-size: 13px;
  color: #cbd5e1;
  margin-top: 4px;
}

.no-alarms {
  display: flex;
  justify-content: center;
  padding-top: 40px;
}

.alarm-badge {
  cursor: pointer;
}
</style>
