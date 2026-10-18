import { computed, ref } from 'vue'

const savedLanguage = localStorage.getItem('media-language') || 'zh'
const language = ref(savedLanguage)

const messages = {
  zh: {
    language: '语言', chinese: '中文', english: 'English', thai: 'ไทย',
    home: '店铺首页', images: '图片', videos: '视频', tasks: '美工任务', recent: '最近上传', trash: '回收站',
    tasksDescription: '美工领取和处理设计任务', noTasks: '暂无可领取任务', tasksHint: '新任务发布后会显示在这里。',
    login: '登录并进入', register: '注册并进入', account: '请输入账号', password: '请输入密码',
    name: '请输入名字', firstUse: '首次使用？注册账号', hasAccount: '已有账号？直接登录',
    registerHint: '首次进入请注册协作身份', loginHint: '使用账号密码登录共享空间',
    library: '共享素材库', stores: '店铺', storage: '存储', local: '浏览器本地', myStores: '我的店铺',
    createStore: '创建店铺', enterStore: '进入店铺', edit: '编辑', remove: '删除', imagesCount: '图片', videosCount: '视频',
    all: '全部', files: '文件', latestUpload: '最近上传', upload: '上传素材', backStore: '返回店铺', backFolder: '返回文件夹',
    rename: '重命名', save: '保存', downloadFolder: '下载文件夹', download: '下载', selectAll: '全选', cancelSelect: '取消全选',
    operationLog: '操作日志', refresh: '刷新日志', noLogs: '暂无操作记录', owner: '空间所有者', me: '我',
    uploadTime: '上传时间', moveTrash: '删除', restore: '恢复', permanentDelete: '永久删除', setCover: '设为店铺首页', emptyTrash: '回收站为空',
    uploadMedia: '上传图片/视频', confirmUpload: '确认上传', cancel: '取消', chooseMedia: '拖入文件或文件夹，点击也可选择',
    dropMedia: '松开即可添加文件', createFirst: '创建第一个店铺后即可上传素材。', search: '搜索店铺、国家或类别',
    storeManagement: '店铺管理', allStores: '全部店铺', mediaCenter: '素材中心', designTasks: '美工任务', pendingClaim: '待领取', myTasks: '我的任务', pendingReview: '待自检', completed: '已完成', management: '管理', membersPermissions: '成员与权限', serverConnected: '服务器已连接', sharedStorage: '共享存储',
    editStore: '编辑店铺', renameStore: '重命名', createStoreDescription: '添加一个店铺，用于分类管理素材和美工任务', editStoreDescription: '更新店铺的名称、国家、类别和头像', close: '关闭', storeAvatar: '店铺头像', avatarHint: '建议使用清晰的正方形图片，不超过 1.5 MB', chooseImage: '选择图片', storeName: '店铺名称', storeCountry: '店铺国家', storeCategory: '店铺类别', storeNameExample: '例如：泰国服装店', countryExample: '例如：中国', categoryExample: '例如：服装', saveChanges: '保存修改', chooseAvatarError: '请选择图片作为头像。', avatarSizeError: '头像不能超过1.5MB。', storeRequiredError: '请填写店铺名称、国家和类别。', recentImages: '最近上传图片', noImageUpload: '暂无图片上传', serverStorage: '服务器存储'
  },
  en: {
    language: 'Language', chinese: '中文', english: 'English', thai: 'ไทย',
    home: 'Stores', images: 'Images', videos: 'Videos', tasks: 'Design tasks', recent: 'Recent', trash: 'Trash',
    tasksDescription: 'Claim and work on design tasks', noTasks: 'No tasks available', tasksHint: 'New tasks will appear here when published.',
    login: 'Log in', register: 'Create account', account: 'Account', password: 'Password',
    name: 'Name', firstUse: 'New here? Create account', hasAccount: 'Have an account? Log in',
    registerHint: 'Create your workspace identity', loginHint: 'Log in to the shared workspace',
    library: 'Media Library', stores: 'Stores', storage: 'Storage', local: 'Browser local', myStores: 'My stores',
    createStore: 'Create store', enterStore: 'Open store', edit: 'Edit', remove: 'Delete', imagesCount: 'Images', videosCount: 'Videos',
    all: 'All', files: 'Files', latestUpload: 'Latest upload', upload: 'Upload', backStore: 'Back to stores', backFolder: 'Back to folders',
    rename: 'Rename', save: 'Save', downloadFolder: 'Download folder', download: 'Download', selectAll: 'Select all', cancelSelect: 'Clear selection',
    operationLog: 'Activity log', refresh: 'Refresh log', noLogs: 'No activity yet', owner: 'Space owner', me: 'Me',
    uploadTime: 'Uploaded', moveTrash: 'Move to trash', restore: 'Restore', permanentDelete: 'Delete permanently', setCover: 'Set as store cover', emptyTrash: 'Trash is empty',
    uploadMedia: 'Upload images/videos', confirmUpload: 'Upload', cancel: 'Cancel', chooseMedia: 'Drop files or folders here, or click to choose',
    dropMedia: 'Release to add files', createFirst: 'Create your first store to upload media.', search: 'Search stores, countries or categories',
    storeManagement: 'Store management', allStores: 'All stores', mediaCenter: 'Media center', designTasks: 'Design tasks', pendingClaim: 'Available', myTasks: 'My tasks', pendingReview: 'Self-review', completed: 'Completed', management: 'Management', membersPermissions: 'Members & permissions', serverConnected: 'Server connected', sharedStorage: 'Shared storage',
    editStore: 'Edit store', renameStore: 'Rename', createStoreDescription: 'Add a store to organize media and design tasks', editStoreDescription: 'Update the store name, country, category and avatar', close: 'Close', storeAvatar: 'Store avatar', avatarHint: 'Use a clear square image, up to 1.5 MB', chooseImage: 'Choose image', storeName: 'Store name', storeCountry: 'Country', storeCategory: 'Category', storeNameExample: 'e.g. Thailand Fashion Store', countryExample: 'e.g. China', categoryExample: 'e.g. Fashion', saveChanges: 'Save changes', chooseAvatarError: 'Please choose an image for the avatar.', avatarSizeError: 'The avatar must be no larger than 1.5 MB.', storeRequiredError: 'Enter the store name, country and category.', recentImages: 'Latest image upload', noImageUpload: 'No image uploaded', serverStorage: 'Server storage'
  },
  th: {
    language: 'ภาษา', chinese: '中文', english: 'English', thai: 'ไทย',
    home: 'ร้านค้า', images: 'รูปภาพ', videos: 'วิดีโอ', tasks: 'งานออกแบบ', recent: 'อัปโหลดล่าสุด', trash: 'ถังขยะ',
    tasksDescription: 'รับและจัดการงานออกแบบ', noTasks: 'ยังไม่มีงานให้รับ', tasksHint: 'งานใหม่จะแสดงที่นี่เมื่อมีการเผยแพร่',
    login: 'เข้าสู่ระบบ', register: 'สร้างบัญชี', account: 'ชื่อบัญชี', password: 'รหัสผ่าน',
    name: 'ชื่อ', firstUse: 'ผู้ใช้ใหม่? สร้างบัญชี', hasAccount: 'มีบัญชีแล้ว? เข้าสู่ระบบ',
    registerHint: 'สร้างตัวตนสำหรับพื้นที่ทำงาน', loginHint: 'เข้าสู่พื้นที่แบ่งปัน',
    library: 'คลังสื่อ', stores: 'ร้านค้า', storage: 'พื้นที่จัดเก็บ', local: 'เบราว์เซอร์ในเครื่อง', myStores: 'ร้านค้าของฉัน',
    createStore: 'สร้างร้านค้า', enterStore: 'เปิดร้านค้า', edit: 'แก้ไข', remove: 'ลบ', imagesCount: 'รูปภาพ', videosCount: 'วิดีโอ',
    all: 'ทั้งหมด', files: 'ไฟล์', latestUpload: 'อัปโหลดล่าสุด', upload: 'อัปโหลด', backStore: 'กลับไปร้านค้า', backFolder: 'กลับไปโฟลเดอร์',
    rename: 'เปลี่ยนชื่อ', save: 'บันทึก', downloadFolder: 'ดาวน์โหลดโฟลเดอร์', download: 'ดาวน์โหลด', selectAll: 'เลือกทั้งหมด', cancelSelect: 'ยกเลิกการเลือก',
    operationLog: 'บันทึกกิจกรรม', refresh: 'รีเฟรช', noLogs: 'ยังไม่มีกิจกรรม', owner: 'เจ้าของพื้นที่', me: 'ฉัน',
    uploadTime: 'อัปโหลดเมื่อ', moveTrash: 'ย้ายไปถังขยะ', restore: 'กู้คืน', permanentDelete: 'ลบถาวร', setCover: 'ตั้งเป็นหน้าร้าน', emptyTrash: 'ถังขยะว่าง',
    uploadMedia: 'อัปโหลดรูปภาพ/วิดีโอ', confirmUpload: 'ยืนยันการอัปโหลด', cancel: 'ยกเลิก', chooseMedia: 'วางไฟล์หรือโฟลเดอร์ หรือคลิกเพื่อเลือก',
    dropMedia: 'ปล่อยเพื่อเพิ่มไฟล์', createFirst: 'สร้างร้านค้าแรกเพื่ออัปโหลดสื่อ', search: 'ค้นหาร้านค้า ประเทศ หรือหมวดหมู่',
    storeManagement: 'จัดการร้าน', allStores: 'ร้านทั้งหมด', mediaCenter: 'คลังสื่อ', designTasks: 'งานออกแบบ', pendingClaim: 'รอรับ', myTasks: 'งานของฉัน', pendingReview: 'รอตรวจ', completed: 'เสร็จแล้ว', management: 'จัดการ', membersPermissions: 'สมาชิกและสิทธิ์', serverConnected: 'เชื่อมต่อเซิร์ฟเวอร์แล้ว', sharedStorage: 'พื้นที่เก็บร่วม',
    editStore: 'แก้ไขร้าน', renameStore: 'เปลี่ยนชื่อ', createStoreDescription: 'เพิ่มร้านเพื่อจัดหมวดสื่อและงานออกแบบ', editStoreDescription: 'อัปเดตชื่อ ประเทศ หมวดหมู่และรูปร้าน', close: 'ปิด', storeAvatar: 'รูปร้าน', avatarHint: 'ใช้รูปสี่เหลี่ยมจัตุรัสที่ชัดเจน ไม่เกิน 1.5 MB', chooseImage: 'เลือกรูป', storeName: 'ชื่อร้าน', storeCountry: 'ประเทศ', storeCategory: 'หมวดหมู่', storeNameExample: 'เช่น ร้านเสื้อผ้าไทย', countryExample: 'เช่น จีน', categoryExample: 'เช่น แฟชั่น', saveChanges: 'บันทึกการแก้ไข', chooseAvatarError: 'กรุณาเลือกรูปสำหรับรูปร้าน', avatarSizeError: 'รูปต้องไม่เกิน 1.5 MB', storeRequiredError: 'กรอกชื่อร้าน ประเทศและหมวดหมู่', recentImages: 'อัปโหลดรูปล่าสุด', noImageUpload: 'ยังไม่มีรูป', serverStorage: 'พื้นที่เก็บบนเซิร์ฟเวอร์'
  }
}

export function useLocale() {
  const t = computed(() => messages[language.value])
  const l = (zh, en, th) => language.value === 'en' ? en : language.value === 'th' ? th : zh
  function setLanguage(nextLanguage) {
    language.value = nextLanguage
    localStorage.setItem('media-language', nextLanguage)
  }
  return { language, t, l, setLanguage }
}
