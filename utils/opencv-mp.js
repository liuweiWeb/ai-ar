/*
 * OpenCV 微信小程序适配层
 * 说明：将官方构建的 opencv.js 放到 /static/opencv.js。
 */

let cvInstance = null
let loadPromise = null

function waitForGlobalCv(resolve, reject, retry = 0) {
  if (typeof cv !== 'undefined' && cv && cv.Mat) {
    cvInstance = cv
    resolve(cvInstance)
    return
  }

  if (retry > 80) {
    reject(new Error('OpenCV 初始化超时，请确认 static/opencv.js 可用'))
    return
  }

  setTimeout(() => waitForGlobalCv(resolve, reject, retry + 1), 100)
}

export function loadOpenCv() {
  if (cvInstance) return Promise.resolve(cvInstance)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    try {
      // eslint-disable-next-line no-undef
      require('@/static/opencv.js')
      waitForGlobalCv(resolve, reject)
    } catch (error) {
      reject(error)
    }
    // #endif
  })

  return loadPromise
}

export function matFromImageData(imageData) {
  if (!cvInstance) throw new Error('OpenCV 未初始化')
  return cvInstance.matFromImageData(imageData)
}

export function frameToMat(frame) {
  const { width, height, data } = frame
  return matFromImageData({
    width,
    height,
    data: new Uint8ClampedArray(data)
  })
}

export function toGray(srcMat) {
  if (!cvInstance) throw new Error('OpenCV 未初始化')
  const gray = new cvInstance.Mat()
  cvInstance.cvtColor(srcMat, gray, cvInstance.COLOR_RGBA2GRAY)
  return gray
}

export function matchTemplate(frameGrayMat, templateGrayMat) {
  if (!cvInstance) throw new Error('OpenCV 未初始化')

  const result = new cvInstance.Mat()
  cvInstance.matchTemplate(frameGrayMat, templateGrayMat, result, cvInstance.TM_CCOEFF_NORMED)
  const minMax = cvInstance.minMaxLoc(result)
  result.delete()

  return {
    score: minMax.maxVal,
    point: minMax.maxLoc
  }
}

export function drawArOverlay(ctx, frameSize, result, label) {
  const boxWidth = 220
  const boxHeight = 100
  const x = Math.max(12, Math.min(result.point.x, frameSize.width - boxWidth - 12))
  const y = Math.max(36, Math.min(result.point.y, frameSize.height - boxHeight - 12))

  ctx.clearRect(0, 0, frameSize.width, frameSize.height)
  ctx.setStrokeStyle('#22d3ee')
  ctx.setLineWidth(3)
  ctx.strokeRect(x, y, boxWidth, boxHeight)

  ctx.setFillStyle('rgba(2, 6, 23, 0.72)')
  ctx.fillRect(x, y - 28, boxWidth, 24)

  ctx.setFillStyle('#e2e8f0')
  ctx.setFontSize(13)
  ctx.fillText(`${label} ${(result.score * 100).toFixed(1)}%`, x + 8, y - 11)
  ctx.draw()
}
