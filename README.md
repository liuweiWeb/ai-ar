# uni-app 微信小程序 AR 路线识别（Vue2 + 选项式 API）

## 技术栈
- uni-app（仅微信小程序端）
- Vue2
- 选项式 API
- OpenCV 模板匹配（`matchTemplate`）

## 目录结构
- `pages/index/index.vue`：相机 + AR 画布 + 识别结果面板 + 识别主流程
- `utils/opencv-mp.js`：OpenCV 在微信小程序中的适配层
- `utils/templates.js`：景点模板库配置（多模板）
- `static/opencv.js`：OpenCV 文件占位（请替换为真实构建）

## 运行步骤（HBuilderX）
1. 将项目导入 HBuilderX。
2. 将真实 OpenCV 构建文件替换 `static/opencv.js`。
3. 发行到微信小程序（或运行到微信开发者工具）。
4. 真机调试时，允许摄像头权限与网络访问。

## 功能说明
1. 页面包含 `camera`、`canvas`、识别结果面板。
2. 使用 `onCameraFrame` 循环抓帧，逐模板执行 OpenCV `matchTemplate`。
3. 多模板库可在 `utils/templates.js` 中扩展。
4. 匹配阈值默认 `0.65`，达到后暂停识别、显示 AR 框和景点信息并播放语音。
