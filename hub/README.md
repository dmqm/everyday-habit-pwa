# PWA 应用中心（Hub）

聚合本仓库及其他 PWA 子应用的一站式入口，iOS 风格毛玻璃界面，支持深浅色主题与离线缓存。

## 在线访问

部署后访问：

**https://dmqm.github.io/everyday-habit-pwa/hub/**

## 聚合的应用

| 应用 | 路径 |
|------|------|
| 小日常（本仓库） | `../` |
| 小日常打卡 | `../../habit-tracker-pwa/` |
| 我的物品 | `../../my-things-pwa/` |
| ImageHub | `../../image-hub-pwa/` |

> 以上相对路径适用于 `dmqm.github.io` 下的 GitHub Pages 多仓库部署。若单独托管，请修改 `js/config.js` 中的 `url` 字段。

## 本地预览

```bash
cd everyday-habit-pwa
python3 -m http.server 8000
# 打开 http://localhost:8000/hub/
```

## 安装为 PWA

1. 通过 HTTPS 访问门户地址
2. iOS：Safari → 分享 → 添加到主屏幕
3. Android / 桌面：浏览器「安装应用」

## 独立仓库（可选）

若希望门户部署在 `https://dmqm.github.io/pwa-hub/`，可将 `hub/` 目录复制到新仓库 `pwa-hub`，并将 `js/config.js` 中的路径改为：

```js
url: '../everyday-habit-pwa/'
// 其余应用同理
```

## 文件结构

```text
hub/
├── index.html
├── manifest.json
├── sw.js
├── css/style.css
├── js/
│   ├── app.js
│   └── config.js
└── icons/icon.svg
```
