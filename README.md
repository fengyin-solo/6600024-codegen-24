# OPC-UA 工业节点浏览与数据采集系统

基于 OPC-UA 协议的工业数据监控平台，支持节点树浏览、实时数据采集、趋势图表展示和报警管理。

## 功能特性

- **OPC-UA 节点树浏览** - 层级化展示 OPC-UA 服务器节点结构，支持节点详情查看
- **实时数据仪表盘** - 温度、压力、流量、阀门开度、电机转速、泵状态等工业参数实时展示
- **数据趋势图表** - 基于 ECharts 的实时趋势曲线，支持历史数据回溯
- **报警事件管理** - 自动检测超限报警，支持严重程度分级（严重/高/中/低/信息），报警确认与清除
- **数据订阅管理** - 灵活配置数据采样间隔与发布周期
- **数据质量指示** - Good / Bad / Uncertain 三级质量码标识

## 技术栈

### 前端
- **Vue 3** + TypeScript + Vite
- **Element Plus** - UI 组件库
- **ECharts** + vue-echarts - 数据可视化
- **Pinia** - 状态管理
- **TailwindCSS** - 样式框架

### 后端
- **Java 17** + Spring Boot 3.2.0
- **Eclipse Milo** - OPC-UA SDK 客户端
- **Spring WebSocket** - 实时通信
- **Maven** - 项目构建

## 项目结构

```
solo-6600024/
├── frontend/               # Vue 3 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── NodeTree.vue        # OPC-UA 节点树组件
│   │   │   └── DataDashboard.vue   # 数据仪表盘组件
│   │   ├── store/
│   │   │   └── opcua.ts            # Pinia 状态管理
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript 类型定义
│   │   └── App.vue                 # 主布局
│   ├── package.json
│   └── vite.config.ts
├── backend/                # Spring Boot 后端
│   ├── src/main/java/com/opcua/
│   │   ├── OpcuaApplication.java
│   │   ├── controller/
│   │   │   └── NodeController.java
│   │   ├── service/
│   │   │   └── OpcuaClientService.java
│   │   └── model/
│   │       ├── NodeModel.java
│   │       └── DataValueModel.java
│   └── pom.xml
└── README.md
```

## 工业节点结构

```
Server
└── Objects
    ├── PLC_Area1 (1号生产区域)
    │   ├── Temperature_Sensor    (Double, 25.6°C)
    │   ├── Pressure_Transmitter  (Double, 3.45 MPa)
    │   └── Pump_Status           (Boolean, true)
    └── PLC_Area2 (2号生产区域)
        ├── Flow_Meter            (Double, 156.7 L/min)
        ├── Valve_Position        (Double, 75%)
        └── Motor_Speed           (Int32, 1480 RPM)
```

## 快速启动

### 前端
```bash
cd frontend
npm install
npm run dev
```

### 后端
```bash
cd backend
mvn spring-boot:run
```

## API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/nodes` | 获取所有 OPC-UA 节点 |
| GET | `/api/nodes/{id}/value` | 获取指定节点当前值 |
| POST | `/api/subscribe` | 订阅节点数据变更 |
