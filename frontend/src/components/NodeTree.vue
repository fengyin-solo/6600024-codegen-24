<template>
  <div class="node-tree-container">
    <div class="tree-header">
      <h3 class="text-lg font-bold text-cyan-400">OPC-UA 节点树</h3>
      <el-tag :type="store.isConnected ? 'success' : 'danger'" size="small">
        {{ store.isConnected ? '已连接' : '未连接' }}
      </el-tag>
    </div>

    <el-tree
      :data="store.nodeTree"
      :props="treeProps"
      node-key="id"
      highlight-current
      default-expand-all
      @node-click="handleNodeClick"
      class="dark-tree"
    >
      <template #default="{ node, data }">
        <span class="custom-tree-node">
          <el-icon v-if="data.type === 'Object'" class="text-yellow-400">
            <Folder />
          </el-icon>
          <el-icon v-else-if="data.type === 'Variable'" class="text-green-400">
            <DataLine />
          </el-icon>
          <span class="node-label">{{ data.name }}</span>
          <el-tag
            v-if="data.type === 'Variable' && data.quality"
            :type="data.quality === 'Good' ? 'success' : data.quality === 'Bad' ? 'danger' : 'warning'"
            size="small"
            class="ml-2"
          >
            {{ data.quality }}
          </el-tag>
          <span v-if="data.type === 'Variable' && data.value !== undefined" class="node-value">
            {{ data.value }}{{ data.unit ? ' ' + data.unit : '' }}
          </span>
        </span>
      </template>
    </el-tree>

    <!-- 节点详情面板 -->
    <div v-if="store.selectedNode" class="node-detail-panel">
      <el-divider />
      <h4 class="text-sm font-bold text-cyan-300 mb-2">节点详情</h4>
      <el-descriptions :column="1" size="small" border class="dark-descriptions">
        <el-descriptions-item label="名称">{{ store.selectedNode.name }}</el-descriptions-item>
        <el-descriptions-item label="Node ID">{{ store.selectedNode.nodeId }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag size="small">{{ store.selectedNode.type }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="store.selectedNode.dataType" label="数据类型">
          {{ store.selectedNode.dataType }}
        </el-descriptions-item>
        <el-descriptions-item v-if="store.selectedNode.value !== undefined" label="当前值">
          <span class="text-green-400 font-mono">
            {{ store.selectedNode.value }}{{ store.selectedNode.unit ? ' ' + store.selectedNode.unit : '' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item v-if="store.selectedNode.quality" label="质量码">
          <el-tag
            :type="store.selectedNode.quality === 'Good' ? 'success' : 'danger'"
            size="small"
          >
            {{ store.selectedNode.quality }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="store.selectedNode.description" label="描述">
          {{ store.selectedNode.description }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="mt-3 flex gap-2">
        <el-button
          v-if="store.selectedNode.type === 'Variable'"
          type="primary"
          size="small"
          @click="handleSubscribe"
        >
          {{ isSubscribed ? '取消订阅' : '订阅' }}
        </el-button>
        <el-button
          v-if="store.selectedNode.type === 'Variable'"
          type="info"
          size="small"
          @click="handleReadValue"
        >
          读取
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Folder, DataLine } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useOpcuaStore } from '../store/opcua'
import type { OPCUANode } from '../types'

const store = useOpcuaStore()

const treeProps = {
  children: 'children',
  label: 'name'
}

const isSubscribed = computed(() => {
  if (!store.selectedNode) return false
  return store.subscriptions.has(store.selectedNode.id)
})

function handleNodeClick(data: OPCUANode) {
  store.selectNode(data)
}

function handleSubscribe() {
  if (!store.selectedNode) return
  if (isSubscribed.value) {
    store.removeSubscription(store.selectedNode.id)
    ElMessage.success(`已取消订阅: ${store.selectedNode.name}`)
  } else {
    store.addSubscription(store.selectedNode.id)
    ElMessage.success(`已订阅: ${store.selectedNode.name}`)
  }
}

function handleReadValue() {
  if (!store.selectedNode) return
  ElMessage.success(`${store.selectedNode.name} = ${store.selectedNode.value} ${store.selectedNode.unit || ''}`)
}
</script>

<style scoped>
.node-tree-container {
  height: 100%;
  overflow-y: auto;
  padding: 12px;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
}

.node-label {
  white-space: nowrap;
}

.node-value {
  margin-left: auto;
  font-family: monospace;
  font-size: 12px;
  color: #67c23a;
  padding-left: 8px;
}

.node-detail-panel {
  padding: 8px 0;
}

:deep(.el-tree) {
  background: transparent !important;
  color: #e0e0e0 !important;
}

:deep(.el-tree-node__content:hover) {
  background: rgba(6, 182, 212, 0.1) !important;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(6, 182, 212, 0.2) !important;
}

:deep(.el-descriptions) {
  --el-descriptions-item-bordered-label-background: #1f2937;
}
</style>
