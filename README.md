# 🍀 小日常 - 极简 iOS 风格 PWA 习惯打卡应用

本项目是一款高颜值、极简设计的 Progressive Web App（PWA）习惯追踪工具，设计灵感来自 iOS 原生「小日常」 App。项目采用纯原生前端技术栈开发，支持 100% 离线运行、精美 Canvas 五彩纸屑打卡特效、智能连续天数统计以及本地数据备份/恢复。

👉 **在线演示地址**：[https://dmqm.github.io/everyday-habit-pwa/](https://dmqm.github.io/everyday-habit-pwa/)  
👉 **分发仓库地址**：[https://github.com/dmqm/everyday-habit-pwa](https://github.com/dmqm/everyday-habit-pwa)

---

## 📖 目录

* [✨ 项目特性](#-项目特性)
* [📂 目录结构与架构](#-目录结构与架构)
* [🛠️ 核心原理解析](#️-核心原理解析)
  * [1. 智能连续打卡算法 (Streaks)](#1-智能连续打卡算法-streaks)
  * [2. Stale-While-Revalidate 离线策略](#2-stale-while-revalidate-离线策略)
  * [3. 零文件依赖的 Web Audio 泡泡音效](#3-零文件依赖的-web-audio-泡泡音效)
  * [4. iOS 风格毛玻璃与主题管理](#4-ios-风格毛玻璃与主题管理)
* [💾 数据存储 Schema](#-数据存储-schema)
* [🚀 本地开发与测试](#-本地开发与测试)
* [🌐 GitHub Pages 部署指南](#-github-pages-部署指南)
* [📱 平台安装 PWA 指南](#-平台安装-pwa-指南)

---

## ✨ 项目特性

* **🍀 清新视觉设计**：渐变青绿底色，iOS 原生卡片布局，支持系统级**深色模式（Deep Dark）**自动切换。
* **🎉 悦耳打卡反馈**：打卡成功伴随 Canvas 渲染的五彩纸屑（Confetti）粒子喷洒动画，配合 Web Audio API 实时合成的清脆“泡泡声”。
* **📆 iOS 滚动周历**：顶部自动定位当前星期，选中带有弹性缩放，操作流畅自然。
* **📊 智能数据分析**：
  * 计算单个习惯的累计次数、当前连签、最长连签及当月打卡热力图。
  * 连续打卡（Streak）算法会自动根据习惯的打卡频次（如仅工作日）过滤，周末断签不扣减连签天数。
  * 六大趣味荣誉徽章解锁体系。
* **💾 本地数据保险箱**：数据全部存储在本地 `localStorage`，支持一键导出为 JSON 备份文件，或导入还原，隐私安全无虞。
* **📶 100% 离线秒开**：基于 Service Worker 的 Stale-While-Revalidate 离线缓存策略，无网状态依然可以完整使用。

---

## 📂 目录结构与架构

项目完全采用 ES Modules 模块化结构组织 JavaScript，保持代码的低耦合和高内聚：

```text
everyday-habit-pwa/
├── .gitignore          # Git 忽略配置
├── README.md           # 项目详细说明文档
├── index.html          # 单页面入口 HTML 结构
├── manifest.json       # PWA 配置文件（包含图标及色彩配置）
├── sw.js               # Service Worker 离线缓存核心脚本
├── css/
│   └── style.css       # 核心样式（CSS 变量、iOS 风格设计系统、动画）
├── js/
│   ├── app.js          # 核心业务逻辑（打卡状态计算、连续天数算法、勋章判断）
│   ├── storage.js      # 本地 LocalStorage 数据持久化层与默认种子数据
│   └── ui.js           # UI 渲染、周历逻辑、弹窗管理与 Canvas 粒子特效
└── icons/
    ├── icon.svg        # 模拟原 App 的高清四叶草 SVG 矢量图标
    ├── icon-192.png    # 192x192 像素 PWA 安装图标
    ├── icon-512.png    # 512x512 像素 PWA 安装图标（iOS 满幅无白边设计）
    └── generate.html   # 浏览器 Canvas PNG 图标生成工具
```

---

## 🛠️ 核心原理解析

### 1. 智能连续打卡算法 (Streaks)

在大多数习惯打卡应用中，只要有一天不打卡，连续天数（Streak）就会归零。但如果用户设置的习惯是“仅在工作日阅读”，那么周六和周日不打卡，周一打卡时连续天数不应该中断。

我们在 `js/app.js` 的 `getHabitStats` 函数中实现了如下智能算法：
* **当前连续打卡（Current Streak）**：从今天（如果今天已打卡）或昨天（如果今天尚未打卡，但昨天打卡了）开始，逐日向前推算。
* **跳过非活跃日**：向前递减日期时，会调用 `isHabitActiveOnDate` 检查习惯在该天是否活跃。如果习惯在当天非活跃（如自定义周二、周四打卡，而当前推算到了周三），算法会**直接跳过该天并继续往前累加**，不会导致连续打卡中断。
* **物理连续 vs. 频次连续**：对于“最长连续打卡（Max Streak）”，我们除了物理连续外，也引入了该逻辑，保证用户自定义频次习惯能得到正确的成就激励。

### 2. Stale-While-Revalidate 离线策略

为了让 PWA 获得“秒开”的原生应用级体验，`sw.js` 拦截了本站的所有静态 GET 请求：
1. 当应用发起网络请求时，Service Worker 首先在 Cache Storage 中检索是否命中缓存。
2. 如果**命中缓存**，立即将缓存中的静态资源返回给页面，实现页面瞬时加载（秒开）。
3. 与此同时，Service Worker 会**在后台静默发起网络请求**获取最新的文件。
4. 网络请求成功后，会自动**更新本地缓存**，以便用户在下一次打开网页时展示最新版本的内容。
5. 即使网络彻底断开，Service Worker 也能平稳降级，仅依赖缓存资源完成离线运行。

### 3. 零文件依赖的 Web Audio 泡泡音效

为了不占用离线缓存空间、降低首屏网络消耗，应用舍弃了加载外部 `.mp3` / `.wav` 音频文件的做法，而是在 `js/ui.js` 中使用 Web Audio API 通过声卡原生合成声音：
```javascript
const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.type = 'sine'; // 正弦波
osc.frequency.setValueAtTime(400, ctx.currentTime);
// 频率在 0.15 秒内呈指数上升，模拟泡泡“啵”的一声
osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
gain.gain.setValueAtTime(0.2, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
```

### 4. iOS 风格毛玻璃与主题管理

应用的外观规范遵循 Apple 人机交互指南：
* **毛玻璃效果**：在 iOS 状态栏与底部 Tab 导航栏中使用了 `backdrop-filter: blur(20px)`，创造半透明磨砂玻璃层叠感。
* **深浅主题自适应**：在 `js/ui.js` 中，通过监听 `(prefers-color-scheme: dark)` 媒体查询变化，实现无缝跟随 iOS 系统的全局夜间/日间模式切换，也可在应用设置中强制锁定某个主题。

---

## 💾 数据存储 Schema

本地数据完全存放在 `localStorage` 中，以下是核心实体的数据结构设计，便于在“设置”中导出和迁移备份：

### 1. 习惯数据列表 (Habits)
键名：`everyday_habits`
```json
[
  {
    "id": "habit_1716498733653",
    "name": "晨间起立",
    "icon": "🌅",
    "color": "#FF8E94",
    "bgColor": "#FFF0F1",
    "slogan": "一日之计在于晨，今天也要元气满满！",
    "frequency": "daily", // 'daily' | 'weekdays' | 'weekends' | ["1", "3", "5"] (周一三五)
    "reminders": ["07:00"],
    "createdAt": 1716498733653
  }
]
```

### 2. 打卡历史记录 (Records)
键名：`everyday_records`
```json
{
  "2026-05-20": ["habit_1716498733653", "habit_default_2"],
  "2026-05-21": ["habit_default_2"],
  "2026-05-23": ["habit_1716498733653"]
}
```

---

## 🚀 本地开发与测试

在本地调试时，为了使 Service Worker 正常注册，建议通过 HTTP 环境运行（Service Worker 在非本地开发时，强制要求 HTTPS 协议，本地 `localhost` 域名除外）。

```bash
# 1. 克隆仓库到本地
git clone https://github.com/dmqm/everyday-habit-pwa.git
cd everyday-habit-pwa

# 2. 启动本地静态服务器 (以下方式任选其一)
python3 -m http.server 8000  # 使用 Mac 自带 Python
# 或
npx serve .                  # 使用 Node.js

# 3. 访问网页
# 打开浏览器访问 http://localhost:8000 即可。
```

---

## 🌐 GitHub Pages 部署指南

由于本项目统一采用相对路径定位，且使用 `./` 作为基础路径，因此不需要复杂的构建工具，直接推送即可完成部署：

1. 进入您的 GitHub Pages 配置页面：
   `https://github.com/dmqm/everyday-habit-pwa/settings/pages`
2. 在 **Build and deployment** 下的 **Source** 中，选择 **Deploy from a branch**。
3. 在 **Branch** 下拉菜单中选择 `main`，目录选择 `/ (root)`。
4. 点击 **Save**。
5. 稍等一分钟左右，即可在 **`https://dmqm.github.io/everyday-habit-pwa/`** 查看在线版本！

---

## 📱 平台安装 PWA 指南

部署到 HTTPS（如 GitHub Pages）后，即可在各类客户端中离线安装此应用：

### iOS 设备 (iPhone / iPad)
1. 使用原生 **Safari 浏览器** 打开 `https://dmqm.github.io/everyday-habit-pwa/`。
2. 点击底部的 **“分享”** 按钮（带向上箭头的方框）。
3. 滚动菜单并选择 **“添加到主屏幕”**。
4. 确认名称并点击右上角的 **“添加”**。
5. 桌面上会出现可爱的四叶草 App 图标，点击启动即可全屏沉浸式运行。

### Android 设备 (安卓手机)
1. 使用 **Chrome 浏览器** 打开在线链接。
2. 浏览器底部会自动弹出“将小日常添加到主屏幕”的提示条，点击确认。
3. 如果没有自动弹出，点击右上角三个点菜单，选择 **“安装应用”** 或 **“添加到主屏幕”**。

### 电脑桌面端 (macOS / Windows / Linux)
1. 使用 **Chrome** 或 **Edge** 浏览器访问在线链接。
2. 地址栏右侧会出现一个类似显示器的**“安装应用”**图标。
3. 点击并确认安装，应用将作为一个独立的 App 窗口开启，并在 Dock 或开始菜单中建立独立快捷方式。
