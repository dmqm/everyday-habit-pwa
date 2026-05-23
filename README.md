# 小日常 - 极简 iOS 风格习惯打卡 PWA

本项目是一款高颜值、极简设计的 Progressive Web App（PWA）习惯追踪工具，设计灵感来自 iOS 原生“小日常” App。支持完全离线运行、精美五彩纸屑打卡特效、智能连续天数统计以及本地数据备份/恢复。

👉 **分发仓库地址**：[https://github.com/dmqm/everyday-habit-pwa](https://github.com/dmqm/everyday-habit-pwa)  
👉 **在线演示地址**（部署后）：[https://dmqm.github.io/everyday-habit-pwa/](https://dmqm.github.io/everyday-habit-pwa/)

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

## 🛠️ 技术选型

* **结构**：HTML5 语义化标签
* **样式**：Vanilla CSS3（包含 CSS 变量、Grid/Flex 布局、Backdrop Filter 毛玻璃、苹果系统默认字体）
* **逻辑**：原生 JavaScript ES Modules
* **离线机制**：Service Worker API + Cache Storage
* **无声文件依赖**：打卡音效由浏览器声卡原生合成，图标包采用高保真 Emoji + 矢量 SVG。

---

## 🚀 本地运行

在项目根目录下，使用任意静态文件服务器启动：

```bash
# 使用 Python (推荐，Mac 自带)
python3 -m http.server 8000

# 或使用 Node.js 全局服务
npx serve .
```

打开浏览器访问 [http://localhost:8000](http://localhost:8000) 即可运行。

---

## 🌐 部署到 GitHub Pages

由于本项目所有引用均采用**点斜杠相对路径**（例如 `./css/style.css`），因此完美适配 GitHub Pages 的二级目录分发。

### 步骤 1：推送代码到 GitHub 仓库
在您的终端中执行以下命令（已在本地配置好仓库）：

```bash
git init
git remote add origin https://github.com/dmqm/everyday-habit-pwa.git
git branch -M main
git add .
git commit -m "Initial commit of Everyday Habit PWA"
git push -u origin main
```

### 步骤 2：启用 Pages 部署
1. 打开浏览器进入您的 GitHub 仓库页面：`https://github.com/dmqm/everyday-habit-pwa`。
2. 点击右上角的 **Settings** (设置) 按钮。
3. 在左侧边栏导航中，找到 **Code and automation** 分组下的 **Pages**。
4. 在 **Build and deployment** (构建与部署) 的 **Source** 下拉菜单中，选择 **Deploy from a branch**。
5. 在 **Branch** 下选择 `main` 分支，并将旁边的目录设为 `/ (root)`。
6. 点击 **Save** 保存。

等待大约一分钟，GitHub Actions 就会自动为您构建并发布页面。发布成功后，您即可通过 **`https://dmqm.github.io/everyday-habit-pwa/`** 离线安装并使用它！
