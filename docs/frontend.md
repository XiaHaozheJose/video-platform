# 视频平台前端开发文档

## 技术栈
- Vue 3
- TypeScript
- Arco Design Vue
- Pinia
- Vue Router
- Axios
- Vite

## 项目结构 
src/
├── api/ # API接口
├── assets/ # 静态资源
├── components/ # 公共组件
├── composables/ # 组合式函数
├── config/ # 配置文件
├── layouts/ # 布局组件
├── router/ # 路由配置
├── stores/ # 状态管理
├── styles/ # 样式文件
├── types/ # 类型定义
├── utils/ # 工具函数
└── views/ # 页面组件
## 页面规划

### 1. 认证相关
- 登录页 `/login`
- 个人中心 `/profile`
- 修改密码 `/change-password`

### 2. 内容管理
- 视频列表 `/content/videos`
  - 列表展示
  - 搜索过滤
  - 批量操作
  - 状态管理
- 视频详情 `/content/videos/:id`
  - 基本信息
  - 剧集管理
  - 分类关联
  - 演员/导演关联
- 分类管理 `/content/categories`
  - 分类列表
  - 添加/编辑分类
- 演员管理 `/content/actors`
  - 演员列表
  - 添加/编辑演员
- 导演管理 `/content/directors`
  - 导演列表
  - 添加/编辑导演

### 3. 采集管理
- 任务列表 `/crawler/tasks`
  - 任务状态
  - 执行进度
  - 操作按钮（执行/暂停/恢复）
- 任务创建 `/crawler/tasks/create`
  - 基本信息配置
  - 分类映射配置
  - 采集规则配置
  - 更新策略配置
- 任务详情 `/crawler/tasks/:id`
  - 任务信息
  - 执行记录
  - 错误日志
- 资源配置 `/crawler/sources`
  - 资源站管理
  - 分类映射

### 4. 系统管理
- 操作日志 `/system/logs`
- 系统设置 `/system/settings`

## API 接口

### 1. 认证接口
typescript
// 用户登录
POST /api/auth/login
Request: {
username: string;
password: string;
}
Response: {
access_token: string;
}
// 获取个人信息
GET /api/auth/profile
Response: {
id: string;
username: string;
email: string;
// ...
}
Apply
Copy
### 2. 内容接口
typescript
// 获取视频列表
GET /api/videos
Params: {
page?: number;
limit?: number;
keyword?: string;
categoryId?: string;
status?: string;
}
// 创建视频
POST /api/videos
Body: {
title: string;
description?: string;
cover?: string;
categoryIds?: string[];
// ...
}
// 更新视频
PUT /api/videos/:id
Body: {
title?: string;
description?: string;
// ...
}
### 3. 采集接口
typescript
// 获取任务列表
GET /api/crawler/tasks
Params: {
page?: number;
limit?: number;
status?: string;
}
// 创建任务
POST /api/crawler/tasks
Body: {
name: string;
url: string;
type: 'full' | 'increment';
cron?: string;
categoryMapping?: Array<{
sourceId: string;
targetId: string;
enabled: boolean;
}>;
matchRules?: {
identifyBy: string[];
updateStrategy: {
cover?: boolean;
description?: boolean;
rating?: boolean;
episodes?: boolean;
};
filters?: {
minRating?: number;
minYear?: number;
excludeAreas?: string[];
};
};
}
// 执行任务
POST /api/crawler/tasks/:id/execute
// 获取任务日志
GET /api/crawler/tasks/:id/logs
Params: {
startTime?: string;
endTime?: string;
}
## 开发规范

### 1. 代码规范
- 使用 ESLint + Prettier
- 使用 TypeScript 类型定义
- 使用 Composition API + `<script setup>`
- 组件命名使用 PascalCase
- 文件命名使用 kebab-case

### 2. 组件开发
vue
<template>
<div class="task-list">
<!-- 使用 Arco Design 组件 -->
<a-table
:columns="columns"
:data="tasks"
:pagination="pagination"
@page-change="handlePageChange"
>
<!-- 自定义列 -->
<template #status="{ record }">
<a-tag :color="getStatusColor(record.status)">
{{ record.status }}
</a-tag>
</template>
</a-table>
</div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useTaskStore } from '@/stores/task';
import type { Task } from '@/types/task';
// 状态管理
const taskStore = useTaskStore();
const tasks = ref<Task[]>([]);
const pagination = ref({
current: 1,
pageSize: 10,
total: 0,
});
// 加载数据
const loadTasks = async () => {
try {
const { items, total } = await taskStore.getTasks({
page: pagination.value.current,
limit: pagination.value.pageSize,
});
tasks.value = items;
pagination.value.total = total;
} catch (error) {
Message.error('加载任务列表失败');
}
};
// 生命周期
onMounted(() => {
loadTasks();
});
</script>
<style scoped lang="less">
.task-list {
padding: 20px;
}
</style>

### 3. 状态管理
typescript
// stores/task.ts
import { defineStore } from 'pinia';
import { getTasks, createTask } from '@/api/task';
import type { Task, CreateTaskDto } from '@/types/task';
export const useTaskStore = defineStore('task', {
state: () => ({
tasks: [] as Task[],
loading: false,
}),
actions: {
async getTasks(params: any) {
this.loading = true;
try {
const data = await getTasks(params);
return data;
} finally {
this.loading = false;
}
},
async createTask(dto: CreateTaskDto) {
return await createTask(dto);
},
},
});
### 4. API 封装
typescript
// api/task.ts
import { http } from '@/utils/http';
import type { Task, CreateTaskDto } from '@/types/task';
export const getTasks = (params: any) => {
return http.get<Task[]>('/crawler/tasks', { params });
};
export const createTask = (data: CreateTaskDto) => {
return http.post<Task>('/crawler/tasks', data);
};

### 5. 类型定义
typescript
// types/task.ts
export interface Task {
id: string;
name: string;
type: 'full' | 'increment';
status: 'pending' | 'running' | 'completed' | 'failed';
config: {
url: string;
categoryMapping: CategoryMapping[];
matchRules?: MatchRules;
};
totalCount: number;
successCount: number;
failCount: number;
lastError?: string;
lastRunTime?: Date;
cron?: string;
createdAt: Date;
updatedAt: Date;
}
export interface CategoryMapping {
sourceId: string;
targetId: string;
enabled: boolean;
}
export interface MatchRules {
identifyBy: string[];
updateStrategy: {
cover?: boolean;
description?: boolean;
rating?: boolean;
episodes?: boolean;
};
filters?: {
minRating?: number;
minYear?: number;
excludeAreas?: string[];
};
}

## 开发流程

1. 环境搭建
   - 安装 Node.js
   - 创建 Vue 3 项目
   - 配置 Arco Design
   - 配置 TypeScript

2. 基础框架搭建
   - 配置路由
   - 配置状态管理
   - 配置 HTTP 请求
   - 配置权限控制

3. 组件开发
   - 开发布局组件
   - 开发公共组件
   - 开发业务组件

4. 功能实现
   - 实现认证功能
   - 实现内容管理
   - 实现采集管理
   - 实现系统管理

5. 测试与优化
   - 单元测试
   - E2E测试
   - 性能优化
   - 代码优化

## 部署说明

1. 构建
bash
安装依赖
npm install
开发环境
npm run dev
生产构建
npm run build

2. 环境变量
env
.env.development
VITE_API_BASE_URL=http://localhost:3000/api
.env.production
VITE_API_BASE_URL=/api

3. Nginx配置
nginx
location /api {
proxy_pass http://backend:3000;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
}