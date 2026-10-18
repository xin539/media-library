import { computed, ref } from 'vue'
import { fileMediaType } from '../fileTypes.js'
import { defineStore } from 'pinia'
import { serverFileUrl } from '../api/request.js'
import { confirmPermanentDelete } from '../components/confirmPermanentDelete.js'
import { useLocale } from '../i18n.js'
import {
  getStores,
  createStore as createStoreApi,
  updateStore as updateStoreApi,
  deleteStore as deleteStoreApi,
  restoreStore as restoreStoreApi,
  permanentlyDeleteStore as permanentlyDeleteStoreApi,
  getAssets,
  uploadAssets,
  getTaskFiles,
  uploadTaskFiles,
  deleteTaskFile as deleteTaskFileApi,
  getTasks,
  createTask as createTaskApi,
  claimTask as claimTaskApi,
  updateTaskProgress as updateTaskProgressApi,
  submitTask as submitTaskApi,
  reviewTask as reviewTaskApi,
  permanentlyDeleteAsset as permanentlyDeleteAssetApi,
  moveAssetToTrash as moveAssetToTrashApi,
  restoreAsset as restoreAssetApi
} from '../api/storeApi.js'

// 整个前端共享的素材库状态。
export const useLibraryStore = defineStore('library', () => {
  const { l } = useLocale()
  const stores = ref([])
  const assets = ref([])
  const taskFiles = ref([])
  const tasks = ref([])
  const currentUser = ref(null)
  const ready = ref(false)
  const loading = ref(false)
  const error = ref('')
  // 附件用途不决定媒体类型：图片仍然是图片，文档和压缩包仍然是文件。
  const taskFileMediaType = fileMediaType

  // 未删除的素材。
  const activeAssets = computed(() => {
    const activeStoreIds = new Set(activeStores.value.map((store) => store.id))
    return assets.value.filter((asset) => !asset.deletedAt && activeStoreIds.has(asset.storeId))
  })

  const activeStores = computed(() => stores.value.filter((store) => !store.deletedAt))
  const deletedStores = computed(() => stores.value.filter((store) => store.deletedAt))
  // 文件上传入口中的图片/视频仍按真实媒体类型参与素材展示。
  const taskMediaAssets = computed(() => {
    const activeStoreIds = new Set(activeStores.value.map((store) => store.id))
    return taskFiles.value
      .filter((file) => activeStoreIds.has(file.storeId) && taskFileMediaType(file) !== 'file')
      .map((file) => ({ ...file, type: taskFileMediaType(file), taskFile: true }))
  })
  // 回收站素材。
  const deletedAssets = computed(() => {
    return assets.value.filter((asset) => asset.deletedAt)
  })

  // 最近上传的12个素材。
  const recentAssets = computed(() => {
    return [...activeAssets.value]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12)
  })

  // 图片和视频数量从真实素材计算。
  const imageCount = computed(() => {
    return [...activeAssets.value, ...taskMediaAssets.value].filter(
      (asset) => asset.type === 'image'
    ).length
  })

  const videoCount = computed(() => {
    return [...activeAssets.value, ...taskMediaAssets.value].filter(
      (asset) => asset.type === 'video'
    ).length
  })

  // 查询指定店铺的素材。
  function assetsForStore(storeId) {
    return activeAssets.value.filter(
      (asset) => asset.storeId === storeId
    )
  }

  // 根据唯一ID查询店铺。
  function storeById(id) {
    return stores.value.find(
      (store) => store.id === id
    )
  }

  // 将后端字段转换为当前Vue页面使用的字段。
  function formatStore(store) {
    return {
      ...store,
      avatar: serverFileUrl(String(store.avatarPath || '').includes('/storage/') ? `/api/assets/stores/${store.id}/cover` : (store.avatarPath || ''))
    }
  }

  const formatAsset = (asset) => ({
    ...asset,
    url: serverFileUrl(asset.url || asset.filePath),
    createdAt: Date.parse(asset.createdAt)
  })
  const formatTaskFile = (file) => ({
    ...file,
    url: serverFileUrl(file.url || file.filePath),
    createdAt: Date.parse(file.createdAt)
  })
  const formatTask = (task) => ({
    ...task,
    productImageUrl: serverFileUrl(String(task.productImageUrl || '').includes('/storage/') ? `/api/assets/tasks/${task.id}/image` : task.productImageUrl)
  })

  // 页面打开时加载店铺和素材。
  async function load() {
    if (loading.value) return

    loading.value = true
    error.value = ''

    try {
      // 店铺从Node.js后端和SQLite读取。
      const storeResponse = await getStores()

      stores.value = storeResponse.data.map(formatStore)

      const assetResponse = await getAssets()
      assets.value = assetResponse.data.map(formatAsset)
      const taskFileResponse = await getTaskFiles()
      taskFiles.value = taskFileResponse.data.map(formatTaskFile)
      const taskResponse = await getTasks()
      tasks.value = taskResponse.data.map(formatTask)

      ready.value = true
    } catch (loadError) {
      error.value = loadError.message
      console.error('加载数据失败：', loadError)
    } finally {
      loading.value = false
    }
  }

  // 创建或者编辑店铺。
  async function saveStore(form, id = null) {
    error.value = ''

    const requestData = {
      name: form.name.trim(),
      country: form.country.trim(),
      category: form.category.trim(),
      avatarPath: form.avatar || null
    }

    try {
      if (id) {
        const response = await updateStoreApi(
          id,
          requestData
        )

        const updatedStore = formatStore(response.data)
        const index = stores.value.findIndex(
          (store) => store.id === id
        )

        if (index !== -1) {
          stores.value[index] = updatedStore
        }

        return updatedStore
      }

      const response = await createStoreApi(requestData)
      const newStore = formatStore(response.data)

      stores.value.unshift(newStore)

      return newStore
    } catch (saveError) {
      error.value = saveError.message
      throw saveError
    }
  }

  // 删除店铺。
  async function deleteStore(id) {
    error.value = ''

    try {
      // 先删除后端SQLite中的店铺。
      const response = await deleteStoreApi(id)
      const store = storeById(id)
      if (store) store.deletedAt = response.data.deletedAt
    } catch (deleteError) {
      error.value = deleteError.message
      throw deleteError
    }
  }

  async function restoreDeletedStore(id) {
    const response = await restoreStoreApi(id)
    const index = stores.value.findIndex((store) => store.id === id)
    if (index !== -1) stores.value[index] = formatStore(response.data)
  }

  async function permanentlyDeleteStore(id) {
    if (!await confirmPermanentDelete(password => permanentlyDeleteStoreApi(id, password))) return
    stores.value = stores.value.filter((store) => store.id !== id)
    assets.value = assets.value.filter((asset) => asset.storeId !== id)
  }

  // 上传到服务端，所有客户端都可以读取这些素材。
  async function addAssets(storeId, files) {
    const uploadedAssets = []
    for (let index = 0; index < files.length; index += 50) {
      const response = await uploadAssets(storeId, files.slice(index, index + 50))
      uploadedAssets.push(...response.data)
    }
    const formattedAssets = uploadedAssets.map(formatAsset)
    assets.value.unshift(...formattedAssets)
    window.dispatchEvent(new Event('operation-log-updated'))
    return formattedAssets
  }

  async function addTaskFiles(storeId, files, taskId = null, purpose = 'reference') {
    const uploaded = []
    const batch = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    const folderNames = [...new Set(files.map((file) => (file.relativePath || file.webkitRelativePath || '').split('/')[0]).filter((part, index) => part && (fileHasFolder(files[index]))))]
    const label = folderNames.length === 1 ? folderNames[0] : (files.length > 1 ? `${l('上传文件', 'Uploaded files', 'ไฟล์ที่อัปโหลด')} ${new Date().toLocaleString()}` : '')
    for (let index = 0; index < files.length; index += 50) {
      const response = await uploadTaskFiles(storeId, files.slice(index, index + 50), taskId, purpose, files.length > 1 ? { batch, label } : {})
      uploaded.push(...response.data)
    }
    taskFiles.value.unshift(...uploaded.map(formatTaskFile))
    window.dispatchEvent(new Event('operation-log-updated'))
  }

  function fileHasFolder(file) {
    return (file.relativePath || file.webkitRelativePath || '').includes('/')
  }

  function taskFilesForStore(storeId) {
    return taskFiles.value.filter((file) => file.storeId === storeId)
  }

  async function removeTaskFile(id) {
    await deleteTaskFileApi(id)
    taskFiles.value = taskFiles.value.filter((file) => file.id !== id)
  }

  async function createDesignTask(form) {
    const response = await createTaskApi(form)
    tasks.value.unshift(formatTask(response.data))
    window.dispatchEvent(new Event('operation-log-updated'))
    return formatTask(response.data)
  }

  async function claimDesignTask(id) {
    const response = await claimTaskApi(id)
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index !== -1) tasks.value[index] = formatTask(response.data)
  }

  async function setDesignTaskProgress(id, progress) {
    const response = await updateTaskProgressApi(id, progress)
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index !== -1) tasks.value[index] = formatTask(response.data)
  }

  async function submitDesignTask(id) {
    const response = await submitTaskApi(id)
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index !== -1) tasks.value[index] = formatTask(response.data)
    window.dispatchEvent(new Event('operation-log-updated'))
  }

  async function reviewDesignTask(id, approved, note = '') {
    const response = await reviewTaskApi(id, approved, note)
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index !== -1) tasks.value[index] = formatTask(response.data)
    window.dispatchEvent(new Event('operation-log-updated'))
  }

  // 修改素材的删除状态。
  async function moveToTrash(id) {
    const asset = assets.value.find(
      (item) => item.id === id
    )

    if (!asset) return
    const response = await moveAssetToTrashApi(id)
    asset.deletedAt = response.data.deletedAt
    window.dispatchEvent(new Event('operation-log-updated'))
  }

  async function restoreDeletedAsset(id) {
    const response = await restoreAssetApi(id)
    const index = assets.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      assets.value[index] = formatAsset(response.data)
    }
    window.dispatchEvent(new Event('operation-log-updated'))
  }

  // 永久删除素材。
  async function permanentlyDeleteAsset(id) {
    const asset = assets.value.find(
      (item) => item.id === id
    )

    if (!await confirmPermanentDelete(password => permanentlyDeleteAssetApi(id, password))) return
    assets.value = assets.value.filter(
      (item) => item.id !== id
    )
  }

  function releaseAllUrls() {}

  return {
    stores,
    activeStores,
    deletedStores,
    assets,
    taskFiles,
    taskMediaAssets,
    tasks,
    currentUser,
    ready,
    loading,
    error,
    activeAssets,
    deletedAssets,
    recentAssets,
    imageCount,
    videoCount,
    assetsForStore,
    taskFilesForStore,
    taskFileMediaType,
    storeById,
    load,
    saveStore,
    deleteStore,
    restoreDeletedStore,
    permanentlyDeleteStore,
    addAssets,
    addTaskFiles,
    removeTaskFile,
    createDesignTask,
    claimDesignTask,
    setDesignTaskProgress,
    submitDesignTask,
    reviewDesignTask,
    moveToTrash,
    restoreAsset: restoreDeletedAsset,
    permanentlyDeleteAsset,
    releaseAllUrls
  }
})
