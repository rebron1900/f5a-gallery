# 靓企鹅主题商店

fcitx5-android-fx (靓企鹅版) 键盘主题画廊 — 一个在线浏览和预览 [fcitx5-android](https://github.com/fcitx5-android/fcitx5-android) 键盘主题的网站。

🔗 **在线访问**：[https://rebron1900.github.io/f5a-gallery/](https://rebron1900.github.io/f5a-gallery/)

## 功能

- 🎨 浏览内置和社区提交的键盘主题
- ⌨️ 实时键盘模拟器预览主题效果（QWERTY 布局）
- 📋 一键复制或下载主题 JSON
- 🎯 21 种颜色 token 逐一展示色值

## 键盘预览

每个主题详情页都有一个键盘模拟器，展示该主题在 fcitx5-android-fx（靓企鹅版）上的实际效果。模拟器使用 QWERTY 标准布局，包含：

- 字母键（带 alt 符号预览）
- 功能键（Shift / Backspace / Return / 切换键）
- 空格键

特殊键使用 Unicode 符号显示。

## 主题 JSON 格式

每个主题是一个 JSON 文件，使用 fcitx5-android-fx（靓企鹅版）原生格式（signed int32 颜色，平铺结构）：

```json
{
  "name": "主题名称",
  "author": "作者名",
  "isDark": true,
  "builtin": true,
  "backgroundColor": -15592942,
  "barColor": -14803426,
  "keyboardColor": -13882324,
  "keyBackgroundColor": -1,
  "keyTextColor": -16777216,
  "candidateTextColor": -16777216,
  "candidateLabelColor": -8355712,
  "candidateCommentColor": -6710887,
  "altKeyBackgroundColor": -14474461,
  "altKeyTextColor": -3355444,
  "accentKeyBackgroundColor": -14922241,
  "accentKeyTextColor": -1,
  "keyPressHighlightColor": 436207615,
  "keyShadowColor": -16777216,
  "popupBackgroundColor": -1,
  "popupTextColor": -16777216,
  "spaceBarColor": -14803426,
  "dividerColor": -14474461,
  "clipboardEntryColor": -1,
  "genericActiveBackgroundColor": -14922241,
  "genericActiveForegroundColor": -1,
  "version": "2.1"
}
```

> 颜色值为 signed 32-bit ARGB 整数，如 `-16777216`（黑色）、`-1`（白色）。fcitx5-android-fx（靓企鹅版）直接读取此格式，无需转换。

### 21 种颜色 Token 说明

| Token | 说明 |
|---|---|
| `backgroundColor` | 应用背景颜色 |
| `barColor` | 工具栏颜色 |
| `keyboardColor` | 键盘底部背景色 |
| `keyBackgroundColor` | 普通按键背景色 |
| `keyTextColor` | 普通按键文字颜色 |
| `candidateTextColor` | 候选词文字颜色 |
| `candidateLabelColor` | 候选词标签颜色 |
| `candidateCommentColor` | 候选词注释颜色 |
| `altKeyBackgroundColor` | 功能键背景色 |
| `altKeyTextColor` | 功能键文字颜色 |
| `accentKeyBackgroundColor` | 强调键背景色（如回车键） |
| `accentKeyTextColor` | 强调键文字颜色 |
| `keyPressHighlightColor` | 按键按压时高亮颜色 |
| `keyShadowColor` | 按键边框/阴影颜色 |
| `popupBackgroundColor` | 弹出菜单背景色 |
| `popupTextColor` | 弹出菜单文字颜色 |
| `spaceBarColor` | 空格键背景色 |
| `dividerColor` | 分割线颜色 |
| `clipboardEntryColor` | 剪贴板条目背景色 |
| `genericActiveBackgroundColor` | 通用激活态背景色 |
| `genericActiveForegroundColor` | 通用激活态文字颜色 |

## 提交主题

欢迎通过 GitHub Issues 提交你的主题！

1. 前往 [GitHub Issues](https://github.com/rebron1900/f5a-gallery/issues/new)
2. 使用主题提交模板
3. 填写主题名称、作者、颜色 JSON（signed int32 格式）
4. 提交后等待管理员审核
5. 审核通过后自动合并到画廊

## 内置主题

画廊内置了以下主题：

| 主题名 | 亮/暗 |
|---|---|
| AMOLED Black | 暗 |
| Deep Blue | 暗 |
| Material Dark | 暗 |
| Material Light | 亮 |
| Monokai | 暗 |
| Nord Dark | 暗 |
| Nord Light | 亮 |
| Pixel Dark | 暗 |
| Pixel Light | 亮 |

## 开发

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build
```

## 技术栈

- [Astro](https://astro.build/) — 静态站点生成器
- 键盘渲染器移植自 [f5a-see-me](https://github.com/fxliang/f5a-see-me)

## License

MIT
