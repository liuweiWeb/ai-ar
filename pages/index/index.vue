<template>
  <view class="page">
    <camera
      id="arCamera"
      class="camera"
      device-position="back"
      flash="off"
      frame-size="small"
    />
    <canvas
      canvas-id="arCanvas"
      id="arCanvas"
      class="overlay"
      type="2d"
    />

    <view class="panel">
      <view class="status">识别状态：{{ detecting ? '识别中' : '已暂停' }}</view>
      <view class="status">OpenCV：{{ cvReady ? '就绪' : '加载中' }}</view>
      <view class="status">阈值：{{ threshold }}</view>
      <view v-if="matchedSpot" class="result">
        <view class="title">{{ matchedSpot.name }}</view>
        <view class="desc">{{ matchedSpot.desc }}</view>
      </view>
      <view v-else class="desc">将景点模板置于画面中央后自动识别。</view>
      <button class="btn" type="primary" size="mini" @click="resumeDetect">继续识别</button>
    </view>
  </view>
</template>

<script>
import { scenicTemplates, MATCH_THRESHOLD } from '@/utils/templates'
import { loadOpenCv, frameToMat, toGray, matFromImageData, matchTemplate, drawArOverlay } from '@/utils/opencv-mp'

export default {
  data() {
    return {
      threshold: MATCH_THRESHOLD,
      detecting: true,
      cvReady: false,
      frameListener: null,
      cameraContext: null,
      canvasContext: null,
      matchedSpot: null,
      templateMats: [],
      audioContext: null,
      frameSize: {
        width: 320,
        height: 240
      }
    }
  },
  methods: {
    async init() {
      try {
        await loadOpenCv()
        this.cvReady = true
        await this.loadTemplateLibrary()
        this.initCanvas()
        this.startDetectLoop()
      } catch (error) {
        uni.showToast({ title: `初始化失败: ${error.message}`, icon: 'none', duration: 3500 })
      }
    },
    initCanvas() {
      // #ifdef MP-WEIXIN
      this.canvasContext = uni.createCanvasContext('arCanvas', this)
      // #endif
    },
    async loadTemplateLibrary() {
      const mats = []
      for (let i = 0; i < scenicTemplates.length; i += 1) {
        const spot = scenicTemplates[i]
        // eslint-disable-next-line no-await-in-loop
        const imageInfo = await uni.getImageInfo({ src: spot.image })
        const offscreen = wx.createOffscreenCanvas({ type: '2d', width: imageInfo.width, height: imageInfo.height })
        const ctx = offscreen.getContext('2d')
        const image = offscreen.createImage()

        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve, reject) => {
          image.onload = resolve
          image.onerror = reject
          image.src = imageInfo.path
        })

        ctx.drawImage(image, 0, 0, imageInfo.width, imageInfo.height)
        const imageData = ctx.getImageData(0, 0, imageInfo.width, imageInfo.height)
        const rgbaMat = matFromImageData(imageData)
        const grayMat = toGray(rgbaMat)
        rgbaMat.delete()

        mats.push({
          ...spot,
          mat: grayMat
        })
      }
      this.templateMats = mats
    },
    startDetectLoop() {
      this.cameraContext = uni.createCameraContext()
      this.frameListener = this.cameraContext.onCameraFrame((frame) => {
        if (!this.detecting || !this.cvReady || this.templateMats.length === 0) return
        this.handleFrame(frame)
      })
      this.frameListener.start()
    },
    handleFrame(frame) {
      let frameMat = null
      let frameGray = null
      try {
        frameMat = frameToMat(frame)
        frameGray = toGray(frameMat)

        let best = { score: -1, spot: null, point: { x: 0, y: 0 } }
        this.templateMats.forEach((spot) => {
          const result = matchTemplate(frameGray, spot.mat)
          if (result.score > best.score) {
            best = { ...result, spot }
          }
        })

        if (best.score >= this.threshold && best.spot) {
          this.onMatchSuccess(best)
        }
      } catch (error) {
        console.error('识别错误', error)
      } finally {
        if (frameGray) frameGray.delete()
        if (frameMat) frameMat.delete()
      }
    },
    onMatchSuccess(best) {
      this.detecting = false
      this.matchedSpot = best.spot
      drawArOverlay(this.canvasContext, this.frameSize, best, best.spot.name)
      this.playSpotVoice(best.spot.audioUrl)
    },
    playSpotVoice(url) {
      if (!url) return
      if (!this.audioContext) {
        this.audioContext = uni.createInnerAudioContext()
      }
      this.audioContext.stop()
      this.audioContext.src = url
      this.audioContext.play()
    },
    resumeDetect() {
      this.detecting = true
      this.matchedSpot = null
      if (this.canvasContext) {
        this.canvasContext.clearRect(0, 0, this.frameSize.width, this.frameSize.height)
        this.canvasContext.draw()
      }
    },
    cleanup() {
      if (this.frameListener) {
        this.frameListener.stop()
        this.frameListener = null
      }
      if (this.audioContext) {
        this.audioContext.stop()
        this.audioContext.destroy()
        this.audioContext = null
      }
      this.templateMats.forEach((item) => {
        if (item.mat) item.mat.delete()
      })
      this.templateMats = []
    }
  },
  onReady() {
    this.init()
  },
  onUnload() {
    this.cleanup()
  }
}
</script>

<style>
.page {
  position: relative;
  min-height: 100vh;
  background: #020617;
}

.camera,
.overlay {
  width: 100vw;
  height: 70vh;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.panel {
  padding: 16rpx 24rpx 24rpx;
  background: rgba(15, 23, 42, 0.92);
}

.status {
  color: #93c5fd;
  font-size: 24rpx;
  margin-bottom: 8rpx;
}

.result {
  margin-top: 10rpx;
  padding: 14rpx;
  border: 1px solid rgba(34, 211, 238, 0.45);
  border-radius: 12rpx;
}

.title {
  font-size: 34rpx;
  color: #f8fafc;
  font-weight: 600;
}

.desc {
  margin-top: 8rpx;
  color: #cbd5e1;
  font-size: 26rpx;
  line-height: 1.5;
}

.btn {
  margin-top: 18rpx;
}
</style>
