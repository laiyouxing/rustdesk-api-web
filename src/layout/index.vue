<template>
  <el-config-provider :locale="appStore.setting.locale.value">
    <el-container :style="{'--sideBarWidth': sideBarWidth}">
      <!-- 移动端侧边栏浮层 -->
      <template v-if="isMobile">
        <transition name="el-fade-in-linear">
          <div v-if="!appStore.setting.sideIsCollapse" class="mobile-overlay" @click="appStore.sideCollapse()"></div>
        </transition>
        <transition name="slide-left">
          <el-aside v-if="!appStore.setting.sideIsCollapse" class="app-left app-left--overlay">
            <g-aside></g-aside>
          </el-aside>
        </transition>
      </template>
      <!-- 桌面端正常侧边栏 -->
      <el-aside v-else :width="leftWidth" class="app-left">
        <g-aside></g-aside>
      </el-aside>
      <el-container class="app-container">
        <el-header class="app-header">
          <g-header></g-header>
        </el-header>
        <div class="header-tags">
          <tags></tags>
        </div>
        <el-main class="app-main">
          <router-view v-slot="{ Component }">
            <transition mode="out-in" name="el-fade-in-linear">
              <keep-alive :include="cachedTags">
                <component :is="Component"/>
              </keep-alive>
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
</template>

<script setup>
  import { useAppStore } from '@/store/app'
  import { useTagsStore } from '@/store/tags'
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import Tags from '@/layout/components/tags/index.vue'
  import GAside from '@/layout/components/aside.vue'
  import GHeader from '@/layout/components/header.vue'

  const appStore = useAppStore()
  const tagStore = useTagsStore()
  const isMobile = ref(window.innerWidth < 768)
  const sideBarWidth = computed(() => appStore.setting.locale.sideBarWidth)
  const leftWidth = computed(() => {
    if (isMobile.value) return '0px'
    return appStore.setting.sideIsCollapse ? '64px' : 'var(--sideBarWidth)'
  })

  const cachedTags = ref([])
  cachedTags.value = tagStore.cached

  let resizeHandler
  onMounted(() => {
    resizeHandler = () => {
      isMobile.value = window.innerWidth < 768
    }
    window.addEventListener('resize', resizeHandler)
    // 首次加载时如果是手机，自动收起侧边栏
    if (window.innerWidth < 768) {
      appStore.setting.sideIsCollapse = true
    }
  })
  onUnmounted(() => {
    window.removeEventListener('resize', resizeHandler)
  })
</script>

<style lang="scss" scoped>
.app-header {
  background-color: rgba(245, 245, 247, 0.6);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  color: var(--el-text-color-primary);
  display: flex;
  height: 50px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

html.dark .app-header {
  background-color: rgba(28, 28, 30, 0.6);
}

.header-tags {
  height: auto;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: rgba(245, 245, 247, 0.45);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  display: flex;
  padding: 0;
}

html.dark .header-tags {
  background-color: rgba(28, 28, 30, 0.45);
}

.app-left {
  transition: width 0.5s;
  border-right: 1px solid var(--el-border-color-lighter);
}

.app-container {
  min-height: 100vh;
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.app-left--overlay {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 1001;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  width: var(--sideBarWidth) !important;
  overflow-y: auto;
}

// 侧边栏滑入动画
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>

<style lang="scss">
// ===== 移动端响应式（非 scoped，影响全局子元素）=====
@media (max-width: 768px) {
  // 主内容区撑满 + 减少内边距
  .app-main {
    padding: 8px !important;
    overflow-x: hidden;
  }

  // Element Plus 表格在小屏幕自动横向滚动 + 字体缩小
  .el-table {
    font-size: 13px;
    .el-table__cell {
      padding: 8px 5px;
    }
  }

  // 搜索表单竖排
  .el-form .el-form-item {
    display: block;
    margin-bottom: 10px;
    .el-select,
    .el-input {
      width: 100% !important;
    }
  }

  // 按钮触屏化
  .el-button {
    min-height: 42px;
    padding-left: 14px;
    padding-right: 14px;
    font-size: 14px;
    &--small {
      min-height: 34px;
      padding-left: 12px;
      padding-right: 12px;
      font-size: 13px;
    }
  }

  // 对话框全宽
  .el-dialog {
    width: 92vw !important;
    margin: 20px auto !important;
    .el-dialog__body {
      padding: 12px 10px;
    }
  }

  // 分页换行居中
  .el-pagination {
    flex-wrap: wrap;
    justify-content: center;
  }

  // 卡片内边距
  .el-card__body {
    padding: 10px 8px;
  }

  // 统计行间距
  .el-row .el-col {
    margin-bottom: 8px;
  }
}
</style>


