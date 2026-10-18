<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import { downloadTaskFiles } from '../api/storeApi.js';
import { saveDownload } from '../utils/saveDownload.js';
import { serverFileUrl } from '../api/request.js';
import ResultFileBrowser from "../components/ResultFileBrowser.vue";
import { resultFileKey } from "../utils/resultFileTree.js";
import { useLibraryStore } from "../stores/library.js";
import { useLocale } from "../i18n.js";

const library = useLibraryStore();
const { language, t } = useLocale();
const l = (zh, en, th) => language.value === "en" ? en : language.value === "th" ? th : zh;
const route = useRoute();
const router = useRouter();
const createOpen = ref(false);
const failedThumbnails = ref(new Set());
function markThumbnailFailed(id) {
  failedThumbnails.value = new Set([...failedThumbnails.value, id]);
}
const taskEntry = ref(null);
async function goToTaskEntry() {
  await router.push({ path: "/tasks", query: { view: "available" } });
  await nextTick();
  taskEntry.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  taskEntry.value?.querySelector("select")?.focus({ preventScroll: true });
}
const directUploadOpen = ref(false);
const detailTask = ref(null);
const saving = ref(false);
const error = ref("");
const query = ref("");
const countryFilter = ref("");
const storeFilter = ref("");
const priorityFilter = ref("");
const assigneeFilter = ref("");
const overdueOnly = ref(false);
const productImageFile = ref(null);
const productImagePreview = ref("");
const productImageDragging = ref(false);
const attachments = ref([]);
const resultFiles = ref([]);
const resultInput = ref(null);
const resultFolderInput = ref(null);
const resultDragging = ref(false);
const reviewNote = ref("");
const resultUploadError = ref("");
const resultUploadSuccess = ref("");
const directUploadStoreId = ref("");
const directUploadFiles = ref([]);
const directUploadError = ref("");
const directDragging = ref(false);
let batchRowSeed = 1;
const newBatchRow = () => ({
  id: batchRowSeed++,
  productCode: "",
  productName: "",
  skuLines: [""],
  note: "",
  imageFile: null,
  imagePreview: "",
  dragging: false,
});
const batchStoreId = ref("");
const batchDeadline = ref("");
const batchRows = ref([newBatchRow()]);
const batchTaskCount = computed(
  () =>
    batchRows.value.filter(
      (row) =>
        row.productCode.trim() ||
        row.productName.trim() ||
        row.skuLines.some((line) => line.trim()) || row.note.trim() ||
        row.imageFile,
    ).length,
);
const form = reactive({
  storeId: "",
  title: "",
  productCode: "",
  productName: "",
  productImageUrl: "",
  skuText: "",
  description: "",
  priority: "normal",
  deadline: "",
});
const publishSkuLines = computed(() => form.skuText.split("\n"));
function updatePublishSku(index, value) {
  const lines = [...publishSkuLines.value];
  lines[index] = value;
  form.skuText = lines.join("\n");
}
function removePublishSku(index) {
  form.skuText = publishSkuLines.value.filter((_, i) => i !== index).join("\n");
}
const currentView = computed(() =>
  ["available", "mine", "review", "completed"].includes(route.query.view)
    ? route.query.view
    : "available",
);
const viewInfo = computed(() => ({
  available: [l("待领取任务", "Available tasks", "งานรอรับ"), l("查看并领取新的美工任务", "View and claim new design tasks", "ดูและรับงานออกแบบใหม่")],
  mine: [l("我的任务", "My tasks", "งานของฉัน"), l("制作、上传成品并提交自检", "Create, upload and submit for self-review", "สร้าง อัปโหลดและส่งตรวจ")],
  review: [l("待自检任务", "Tasks to review", "งานรอตรวจ"), l("美工检查自己上传的成品并确认完成", "Review your uploaded work and confirm completion", "ตรวจผลงานและยืนยัน")],
  completed: [l("已完成任务", "Completed tasks", "งานที่เสร็จแล้ว"), l("查看已经完成的交付记录", "View completed deliveries", "ดูประวัติการส่งมอบ")],
}));
const tabs = computed(() => [
  { key: "available", label: l("待领取", "Available", "รอรับ") },
  { key: "mine", label: l("我的任务", "My tasks", "งานของฉัน") },
  { key: "review", label: l("待自检", "Self-review", "รอตรวจ") },
  { key: "completed", label: l("已完成", "Completed", "เสร็จแล้ว") },
]);
function inView(task, view) {
  if (view === "available") return task.status === "available";
  if (view === "mine")
    return (
      ["in_progress", "revision"].includes(task.status) &&
      task.assigneeId === library.currentUser?.id
    );
  if (view === "review")
    return (
      task.status === "submitted" &&
      (["owner", "admin"].includes(library.currentUser?.role) ||
        task.assigneeId === library.currentUser?.id)
    );
  return task.status === "completed";
}
const assignees = computed(() => [
  ...new Map(
    library.tasks
      .filter((task) => task.assigneeId)
      .map((task) => [task.assigneeId, task.assigneeName || l("未命名成员", "Unnamed member", "สมาชิกไม่มีชื่อ")]),
  ).entries(),
]);
function countryGroup(country = "") {
  const value = country.toLowerCase();
  if (value.includes("泰国") || value.includes("thailand")) return "泰国";
  if (value.includes("菲律宾") || value.includes("philippines")) return "菲律宾";
  if (value.includes("马来西亚") || value.includes("malaysia")) return "马来西亚";
  if (value.includes("东南亚") || value.includes("southeast asia")) return "东南亚";
  return country || "未分类";
}
const countryLabel = (country) => ({
  "东南亚": l("东南亚", "Southeast Asia", "เอเชียตะวันออกเฉียงใต้"),
  "泰国": l("泰国", "Thailand", "ประเทศไทย"),
  "菲律宾": l("菲律宾", "Philippines", "ฟิลิปปินส์"),
  "马来西亚": l("马来西亚", "Malaysia", "มาเลเซีย"),
  "中国": l("中国", "China", "จีน"),
  "未分类": l("未分类", "Uncategorized", "ยังไม่จัดหมวดหมู่"),
})[country] || country;
const countries = computed(() => [
  ...new Set(['菲律宾', '马来西亚', '泰国', ...library.activeStores.map((store) => countryGroup(store.country))]),
]);
const availableStores = computed(() =>
  library.activeStores.filter(
    (store) =>
      !countryFilter.value || countryGroup(store.country) === countryFilter.value,
  ),
);
const storesByCountry = computed(() =>
  countries.value.map((country) => ({
    country,
    stores: library.activeStores.filter(
      (store) => countryGroup(store.country) === country,
    ),
  })),
);
function changeCountry() {
  storeFilter.value = "";
}
const visibleTasks = computed(() =>
  library.tasks.filter((task) => {
    if (!inView(task, currentView.value)) return false;
    if (
      countryFilter.value &&
      countryGroup(library.storeById(task.storeId)?.country) !==
        countryFilter.value
    )
      return false;
    if (storeFilter.value && task.storeId !== storeFilter.value) return false;
    if (priorityFilter.value && task.priority !== priorityFilter.value)
      return false;
    if (assigneeFilter.value && task.assigneeId !== assigneeFilter.value)
      return false;
    if (
      overdueOnly.value &&
      (!task.deadline ||
        new Date(task.deadline).getTime() >= Date.now() ||
        task.status === "completed")
    )
      return false;
    const text =
      `${task.productCode || ""} ${task.productName || ""} ${task.title || ""} ${task.skuText || ""} ${library.storeById(task.storeId)?.name || ""} ${library.storeById(task.storeId)?.country || ""}`.toLowerCase();
    return !query.value || text.includes(query.value.toLowerCase());
  }),
);
const selectedClaimIds = ref([]);
const claimSelection = computed(() => visibleTasks.value.filter(task => task.status === "available" && selectedClaimIds.value.includes(task.id)));
async function claimPublishedTasks() {
  if (saving.value || !claimSelection.value.length) return;
  saving.value = true;
  error.value = "";
  try {
    for (const task of [...claimSelection.value]) {
      await library.claimDesignTask(task.id);
      selectedClaimIds.value = selectedClaimIds.value.filter(id => id !== task.id);
    }
    await router.push({ path: "/tasks", query: { view: "mine" } });
  } catch (e) {
    error.value = e.message || l("领取失败，请重试。", "Could not claim tasks. Try again.", "รับงานไม่สำเร็จ โปรดลองอีกครั้ง");
  } finally {
    saving.value = false;
  }
}
const count = (view) =>
  library.tasks.filter((task) => inView(task, view)).length;
const taskFiles = computed(() =>
  detailTask.value
    ? library.taskFiles.filter((file) => file.taskId === detailTask.value.id)
    : [],
);
const groupedTaskFiles = computed(() => {
  const groups = new Map();
  for (const file of taskFiles.value) {
    const relative = String(file.relativePath || "").replaceAll("\\", "/");
    const folder = relative.includes("/") ? relative.split("/")[0] : "";
    const key = folder ? [file.uploadBatch || "", file.purpose, folder].join(":") : file.id;
    if (!groups.has(key)) groups.set(key, { key, folder, files: [] });
    groups.get(key).files.push(file);
  }
  return [...groups.values()];
});
const downloadingResults = ref(false);
const resultFoldersByTask = computed(() => {
  const tasks = new Map();
  for (const file of library.taskFiles) {
    if (!file.taskId || file.purpose !== 'result') continue;
    const relative = String(file.relativePath || '').replaceAll('\\', '/');
    const folder = relative.includes('/') ? relative.split('/')[0] : '';
    const key = folder ? [file.uploadBatch || '', file.purpose, folder].join(':') : file.id;
    if (!tasks.has(file.taskId)) tasks.set(file.taskId, new Map());
    const groups = tasks.get(file.taskId);
    if (!groups.has(key)) groups.set(key, { key, folder, name: folder || file.name, count: 0 });
    groups.get(key).count++;
  }
  return new Map([...tasks].map(([id, groups]) => [id, [...groups.values()]]));
});
function openResultFolder(task, group) {
  detailTask.value = task;
  folderLocation.value = { taskId: task.id, key: group.folder ? group.key : '', parts: [] };
}
const resultDownloadError = ref('');
async function downloadResults(group) {
  if (downloadingResults.value) return;
  const files = group.files;
  if (!files.length) return;
  const name = `${group.folder}.zip`;
  downloadingResults.value = true; resultDownloadError.value = '';
  try { saveDownload(await downloadTaskFiles(files.map(file => file.id)), name); }
  catch (error) { resultDownloadError.value = error.message || '下载失败，请重试。'; }
  finally { downloadingResults.value = false; }
}
function dragFolder(event, group) {
  const file = group.files[0];
  const query = new URLSearchParams({ folder: group.folder, batch: file.uploadBatch || '', purpose: file.purpose });
  const url = serverFileUrl(`/api/task-files/tasks/${encodeURIComponent(file.taskId)}/folder-download?${query}`);
  const name = `${group.folder.replace(/[:/\\\r\n]/g, '_')}.zip`;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('DownloadURL', `application/zip:${name}:${url}`);
}
const folderLocation = ref({ taskId: "", key: "", parts: [] });
const openedFolder = computed(() => folderLocation.value.taskId === detailTask.value?.id ? groupedTaskFiles.value.find(group => group.key === folderLocation.value.key && group.folder) : null);
function enterFolder(group) { folderLocation.value = { taskId: detailTask.value.id, key: group.key, parts: [] }; }
function folderBack() {
  if (folderLocation.value.parts.length) folderLocation.value.parts.pop();
  else folderLocation.value.key = "";
}
const folderEntries = computed(() => {
  if (!openedFolder.value) return [];
  const entries = new Map();
  const prefix = [openedFolder.value.folder, ...folderLocation.value.parts];
  for (const file of openedFolder.value.files) {
    const parts = String(file.relativePath || file.name).replaceAll("\\", "/").split("/");
    if (!prefix.every((part, index) => parts[index] === part)) continue;
    const remaining = parts.slice(prefix.length);
    if (remaining.length > 1) {
      const name = remaining[0];
      entries.set("folder:" + name, { key: "folder:" + name, folder: true, name });
    } else entries.set(file.id, { key: file.id, folder: false, name: file.name, file });
  }
  return [...entries.values()].sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name));
});
const resultSelections = computed(() => {
  const selections = new Map();
  resultFiles.value.forEach((file) => {
    const relativePath = file.webkitRelativePath || file.relativePath || "";
    const folderName = relativePath.includes("/") ? relativePath.split("/")[0] : "";
    const key = folderName ? `folder:${folderName}` : `file:${file.name}:${file.size}:${file.lastModified}`;
    if (!selections.has(key)) selections.set(key, { key, folder: Boolean(folderName), name: folderName || file.name, files: [] });
    selections.get(key).files.push(file);
  });
  return [...selections.values()];
});
const statusLabel = (status) =>
  ({ available: l("待领取", "Available", "รอรับ"), in_progress: l("制作中", "In progress", "กำลังทำ"), submitted: l("待自检", "Self-review", "รอตรวจ"), revision: l("继续修改", "Revision", "แก้ไข"), completed: l("已完成", "Completed", "เสร็จแล้ว"), cancelled: l("已取消", "Cancelled", "ยกเลิก") })[status] || status;
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(language.value === "en" ? "en-US" : language.value === "th" ? "th-TH" : "zh-CN") : l("未设置", "Not set", "ไม่ได้ตั้งค่า");
const storeName = (id) => library.storeById(id)?.name || l("未知店铺", "Unknown store", "ไม่ทราบร้าน");
const canPublish = computed(() => Boolean(library.currentUser));
const canClaim = computed(() => Boolean(library.currentUser));
const canDirectUpload = computed(() => Boolean(library.currentUser));
onBeforeUnmount(() => {
  if (productImagePreview.value) URL.revokeObjectURL(productImagePreview.value);
  batchRows.value.forEach((row) => {
    if (row.imagePreview) URL.revokeObjectURL(row.imagePreview);
  });
});
function addBatchRow() {
  batchRows.value.push(newBatchRow());
}
function removeBatchRow(index) {
  const [row] = batchRows.value.splice(index, 1);
  if (row?.imagePreview) URL.revokeObjectURL(row.imagePreview);
  if (!batchRows.value.length) batchRows.value.push(newBatchRow());
}
function clearBatchRows() {
  batchRows.value.forEach((row) => {
    if (row.imagePreview) URL.revokeObjectURL(row.imagePreview);
  });
  batchRows.value = [newBatchRow()];
  error.value = "";
}
function setBatchImage(row, file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    error.value = l("商品图片请选择图片格式。", "Choose an image file for the product image.", "เลือกรูปภาพสำหรับสินค้า");
    return;
  }
  if (row.imagePreview) URL.revokeObjectURL(row.imagePreview);
  row.imageFile = file;
  row.imagePreview = URL.createObjectURL(file);
  row.dragging = false;
}
function chooseBatchImage(row, event) {
  setBatchImage(row, event.target.files?.[0]);
  event.target.value = "";
}
function dropBatchImage(row, event) {
  event.preventDefault();
  row.dragging = false;
  setBatchImage(
    row,
    [...event.dataTransfer.files].find((file) => file.type.startsWith("image/")),
  );
}
function removeBatchImage(row) {
  row.imageFile = null;
  if (row.imagePreview) URL.revokeObjectURL(row.imagePreview);
  row.imagePreview = "";
}
function addBatchSku(row) {
  row.skuLines.push("");
}
function removeBatchSku(row, index) {
  row.skuLines.splice(index, 1);
  if (!row.skuLines.length) row.skuLines.push("");
}
async function createBatch() {
  const rows = batchRows.value.filter(
    (row) =>
      row.productCode.trim() ||
      row.productName.trim() ||
      row.skuLines.some((line) => line.trim()) || row.note.trim() ||
      row.imageFile,
  );
  if (!batchStoreId.value) {
    error.value = l("请先选择店铺。", "Select a store first.", "เลือกร้านค้าก่อน");
    return;
  }
  if (!rows.length || rows.some((row) => !row.productName.trim())) {
    error.value = l("请至少填写一条任务，每条任务都要填写型号或品名。", "Add at least one task and enter a model or product name for every task.", "เพิ่มอย่างน้อยหนึ่งงานและกรอกรุ่นหรือชื่อสินค้าในทุกงาน");
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    for (const row of rows) {
      let productImageUrl = "";
      if (row.imageFile) {
        const uploaded = await library.addAssets(batchStoreId.value, [row.imageFile]);
        productImageUrl = uploaded[0]?.filePath || uploaded[0]?.url || "";
      }
      const task = await library.createDesignTask({
        storeId: batchStoreId.value,
        title: row.productName.trim(),
        productCode: row.productCode.trim(),
        productName: row.productName.trim(),
        productImageUrl,
        skuText: row.skuLines.map((line) => line.trim()).filter(Boolean).join("\n"),
        description: row.note.trim(),
        priority: "normal",
        deadline: batchDeadline.value,
      });
      await library.claimDesignTask(task.id);
    }
    clearBatchRows();
    batchStoreId.value = "";
    batchDeadline.value = "";
    router.push({ path: "/tasks", query: { view: "mine" } });
  } catch (e) {
    error.value = e.message || l("批量领取失败，请重试。", "Could not claim tasks. Please try again.", "รับงานไม่สำเร็จ โปรดลองอีกครั้ง");
  } finally {
    saving.value = false;
  }
}
function chooseImage(event) {
  const file = event.target.files?.[0];
  setProductImage(file);
  event.target.value = "";
}
function setProductImage(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    error.value = l("商品图片请选择图片格式。", "Choose an image file for the product image.", "เลือกรูปภาพสำหรับสินค้า");
    return;
  }
  if (productImagePreview.value) URL.revokeObjectURL(productImagePreview.value);
  productImageFile.value = file;
  productImagePreview.value = URL.createObjectURL(file);
}
function dropProductImage(event) {
  event.preventDefault();
  productImageDragging.value = false;
  setProductImage([...event.dataTransfer.files].find((file) => file.type.startsWith("image/")));
}
function chooseAttachments(event) {
  attachments.value = [...(event.target.files || [])];
}
const formatSize = (size) =>
  size < 1048576
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / 1048576).toFixed(1)} MB`;
const fileType = (file) => file.name.split(".").pop()?.toUpperCase() || "FILE";
function removeAttachment(index) {
  attachments.value.splice(index, 1);
}
function removeResultSelection(selection) {
  const files = new Set(selection.files);
  resultFiles.value = resultFiles.value.filter((file) => !files.has(file));
}
function addResultFiles(fileList) {
  const existing = new Set(
    resultFiles.value.map(resultFileKey),
  );
  const added = [...(fileList || [])].filter((file) => {
    const name = file.name.split('/').pop();
    if (name.startsWith('._') || name === '.DS_Store') return false;
    const key = resultFileKey(file);
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  resultFiles.value.push(...added);
  resultUploadError.value = "";
  resultUploadSuccess.value = "";
}
function chooseResultFiles(event) {
  addResultFiles(event.target.files);
  event.target.value = "";
}
function openResultPicker() {
  resultInput.value?.click();
}
function openResultFolderPicker() {
  resultFolderInput.value?.click();
}
async function dropResultFiles(event) {
  event.preventDefault();
  resultDragging.value = false;
  try {
    const items = [...(event.dataTransfer?.items || [])];
    const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
    const files = entries.length
      ? (await Promise.all(entries.map(readDroppedEntry))).flat()
      : [...(event.dataTransfer?.files || [])];
    addResultFiles(files);
  } catch {
    resultUploadError.value = l("读取文件夹失败，请使用“选择文件夹”。", "Could not read the folder. Use Choose folder.", "อ่านโฟลเดอร์ไม่สำเร็จ โปรดใช้เลือกโฟลเดอร์");
  }
}
function removeProductImage() {
  productImageFile.value = null;
  if (productImagePreview.value) URL.revokeObjectURL(productImagePreview.value);
  productImagePreview.value = "";
}
async function create() {
  form.title = form.productName.trim() || form.title.trim();
  if (!form.storeId || !form.title) {
    error.value = l("请选择店铺并填写型号或品名。", "Select a store and enter a model or product name.", "เลือกร้านค้าและกรอกรุ่นหรือชื่อสินค้า");
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    if (productImageFile.value) {
      const uploaded = await library.addAssets(form.storeId, [
        productImageFile.value,
      ]);
      form.productImageUrl = uploaded[0]?.filePath || uploaded[0]?.url || "";
    }
    const task = await library.createDesignTask({ ...form });
    if (attachments.value.length)
      await library.addTaskFiles(
        form.storeId,
        attachments.value,
        task.id,
        "reference",
      );
    query.value = "";
    countryFilter.value = "";
    storeFilter.value = "";
    priorityFilter.value = "";
    assigneeFilter.value = "";
    overdueOnly.value = false;
    await router.push({ path: "/tasks", query: { view: "available" } });
    Object.assign(form, {
      storeId: "",
      title: "",
      productCode: "",
      productName: "",
      productImageUrl: "",
      skuText: "",
      description: "",
      priority: "normal",
      deadline: "",
    });
    attachments.value = [];
    productImageFile.value = null;
    createOpen.value = false;
    if (productImagePreview.value)
      URL.revokeObjectURL(productImagePreview.value);
    productImagePreview.value = "";
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
async function claim(task) {
  await library.claimDesignTask(task.id);
  detailTask.value = library.tasks.find((item) => item.id === task.id);
}
async function uploadResults() {
  if (!resultFiles.value.length) {
    resultUploadError.value = l("请先选择要上传的成品文件。", "Choose result files to upload.", "เลือกไฟล์ผลงานที่จะอัปโหลด");
    return false;
  }
  saving.value = true;
  resultUploadError.value = "";
  resultUploadSuccess.value = "";
  try {
    const selectionCount = resultSelections.value.length;
    await library.addTaskFiles(
      detailTask.value.storeId,
      resultFiles.value,
      detailTask.value.id,
      "result",
    );
    resultUploadSuccess.value = l(`已成功上传 ${selectionCount} 项`, `${selectionCount} item(s) uploaded`, `อัปโหลดแล้ว ${selectionCount} รายการ`);
    resultFiles.value = [];
    if (resultInput.value) resultInput.value.value = "";
    if (resultFolderInput.value) resultFolderInput.value.value = "";
    return true;
  } catch (error) {
    resultUploadError.value = error.message || l("上传失败，请重试。", "Upload failed. Please try again.", "อัปโหลดไม่สำเร็จ โปรดลองอีกครั้ง");
    return false;
  } finally {
    saving.value = false;
  }
}
async function submit(task) {
  resultUploadError.value = "";
  try {
    if (resultFiles.value.length && !(await uploadResults())) return;
    await library.submitDesignTask(task.id);
    detailTask.value = null;
    router.push({ path: "/tasks", query: { view: "review" } });
  } catch (error) {
    resultUploadError.value = error.message || l("提交失败，请重试。", "Submission failed. Please try again.", "ส่งไม่สำเร็จ โปรดลองอีกครั้ง");
  }
}
async function review(task, approved) {
  await library.reviewDesignTask(task.id, approved, reviewNote.value);
  reviewNote.value = "";
  detailTask.value = null;
}
async function directUpload() {
  if (!directUploadStoreId.value) {
    directUploadError.value = l("请选择文件所属店铺。", "Select the store for these files.", "เลือกร้านค้าสำหรับไฟล์เหล่านี้");
    return;
  }
  if (!directUploadFiles.value.length) {
    directUploadError.value = l("请至少选择一个文件。", "Choose at least one file.", "เลือกอย่างน้อยหนึ่งไฟล์");
    return;
  }
  saving.value = true;
  directUploadError.value = "";
  try {
    await library.addTaskFiles(
      directUploadStoreId.value,
      directUploadFiles.value,
      null,
      "reference",
    );
    directUploadFiles.value = [];
    directUploadStoreId.value = "";
    directUploadOpen.value = false;
  } catch (error) {
    directUploadError.value = error.message || l("上传失败，请重试。", "Upload failed. Please try again.", "อัปโหลดไม่สำเร็จ โปรดลองอีกครั้ง");
  } finally {
    saving.value = false;
  }
}
function addDirectFiles(fileList) {
  const nextFiles = [...(fileList || [])];
  const existing = new Set(
    directUploadFiles.value.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
  );
  directUploadFiles.value.push(
    ...nextFiles.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    }),
  );
  directUploadError.value = "";
}
function chooseDirectFiles(event) {
  addDirectFiles(event.target.files);
  event.target.value = "";
}
function readDroppedEntry(entry) {
  if (entry.isFile) {
    return new Promise((resolve, reject) =>
      entry.file((file) => {
        file.relativePath = entry.fullPath.replace(/^\//, "");
        resolve(file);
      }, reject),
    );
  }
  if (!entry.isDirectory) return Promise.resolve([]);
  const reader = entry.createReader();
  return new Promise((resolve, reject) => {
    const batches = [];
    const readBatch = () =>
      reader.readEntries(async (entries) => {
        if (!entries.length) return resolve((await Promise.all(batches)).flat());
        batches.push(...entries.map(readDroppedEntry));
        readBatch();
      }, reject);
    readBatch();
  });
}
async function dropDirectFiles(event) {
  event.preventDefault();
  directDragging.value = false;
  try {
    const items = [...(event.dataTransfer?.items || [])];
    const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
    const files = entries.length
      ? (await Promise.all(entries.map(readDroppedEntry))).flat()
      : [...(event.dataTransfer?.files || [])];
    addDirectFiles(files);
  } catch {
    directUploadError.value = l("读取文件或文件夹失败，请重新拖入。", "Could not read the files or folder. Drop them again.", "อ่านไฟล์หรือโฟลเดอร์ไม่สำเร็จ โปรดลองอีกครั้ง");
  }
}
</script>

<template>
  <section class="workspace-page tasks-page">
  <PageHeader
    :title="viewInfo[currentView][0]"
    :description="viewInfo[currentView][1]"
    ><div class="header-actions"><button v-if="canPublish" class="primary" @click="error = ''; createOpen = true">
      ＋ {{ l("发布任务", "Publish task", "สร้างงาน") }}
    </button></div></PageHeader
  >
  <div class="resource-toolbar">
    <label class="resource-search"
      ><span>⌕</span
      ><input v-model="query" :placeholder="l('搜索货号、品名、SKU 或店铺', 'Search code, product, SKU or store', 'ค้นหารหัส สินค้า SKU หรือร้าน')" /></label
    ><select v-model="countryFilter" @change="changeCountry">
      <option value="">{{ l("全部国家/地区", "All countries/regions", "ทุกประเทศ/ภูมิภาค") }}</option>
      <option v-for="country in countries" :key="country" :value="country">
        {{ countryLabel(country) }}
      </option></select
    ><select v-model="storeFilter">
      <option value="">{{ l("全部店铺", "All stores", "ร้านทั้งหมด") }}</option>
      <option
        v-for="store in availableStores"
        :key="store.id"
        :value="store.id"
      >
        {{ store.name }}
      </option></select
    ><select v-model="assigneeFilter">
      <option value="">{{ l("全部负责人", "All assignees", "ผู้รับผิดชอบทั้งหมด") }}</option>
      <option v-for="entry in assignees" :key="entry[0]" :value="entry[0]">
        {{ entry[1] }}
      </option></select
    ><select v-model="priorityFilter">
      <option value="">{{ l("全部优先级", "All priorities", "ทุกลำดับ") }}</option>
      <option value="urgent">{{ l("加急", "Urgent", "ด่วน") }}</option>
      <option value="normal">{{ l("普通", "Normal", "ปกติ") }}</option></select
    ><label class="overdue-filter"
      ><input v-model="overdueOnly" type="checkbox" /> {{ l("仅看逾期", "Overdue only", "เกินกำหนดเท่านั้น") }}</label
    >
  </div>
  <nav class="task-status-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="{ active: currentView === tab.key }"
      @click="router.push({ path: '/tasks', query: { view: tab.key } })"
    >
      {{ tab.label }}<span>{{ count(tab.key) }}</span>
    </button>
  </nav>
  <section ref="taskEntry" v-if="currentView === 'available'" class="inline-task-entry">
    <header><div><span>{{ l('领取任务', 'CLAIM TASKS', 'รับงาน') }}</span><h2>{{ l('批量领取任务', 'Claim multiple tasks', 'รับหลายงานพร้อมกัน') }}</h2><p>{{ l('发布的任务显示在这里，勾选后领取。', 'Published tasks appear here. Select tasks to claim.', 'งานที่สร้างจะแสดงที่นี่ เลือกเพื่อรับงาน') }}</p></div><button class="secondary" :disabled="saving" @click="selectedClaimIds = []">{{ l('取消选择', 'Clear selection', 'ยกเลิกการเลือก') }}</button></header>
    <div v-if="visibleTasks.length" class="claim-sheet-scroll">
      <table class="claim-sheet">
        <thead><tr><th>{{ l('产品代号', 'Product code', 'รหัสสินค้า') }}</th><th>{{ l('型号', 'Product name', 'ชื่อสินค้า') }}</th><th>{{ l('图片', 'Image', 'รูปภาพ') }}</th><th>SKU</th><th>{{ l('备注', 'Notes', 'หมายเหตุ') }}</th></tr></thead>
        <tbody><tr v-for="task in visibleTasks" :key="task.id">
          <td><label class="claim-selection"><input v-model="selectedClaimIds" type="checkbox" :value="task.id" :disabled="saving || !canClaim"><b>{{ task.productCode || '—' }}</b></label><small>{{ storeName(task.storeId) }}</small><small>{{ l('发布人', 'Published by', 'ผู้สร้าง') }}：{{ task.creatorName || (task.creatorId === library.currentUser?.id ? library.currentUser.nickname : l('未知用户', 'Unknown user', 'ไม่ทราบผู้ใช้')) }}</small><small>{{ l('发布时间', 'Published', 'เวลาสร้าง') }}：{{ formatDate(task.createdAt) }}</small><small>{{ l('截止时间', 'Deadline', 'กำหนดส่ง') }}：{{ formatDate(task.deadline) }}</small></td>
          <td><button class="text-button" @click="detailTask = task">{{ task.productName || task.title }}</button></td>
          <td><img v-if="task.productImageUrl" :src="task.productImageUrl" :alt="task.productName || task.title"><span v-else>{{ l('暂无图片', 'No image', 'ไม่มีรูป') }}</span></td>
          <td><div v-for="(sku, index) in (task.skuText || '').split('\n').filter(Boolean)" :key="index" class="claim-sku">{{ sku }}</div><span v-if="!task.skuText">—</span></td>
          <td class="claim-note">{{ task.description || '—' }}</td>
        </tr></tbody>
      </table>
    </div>
    <div v-else class="empty ui-empty">
<svg class="empty-illustration" viewBox="0 0 160 128" aria-hidden="true"><ellipse cx="80" cy="116" rx="48" ry="6" fill="#eef4fb"/><path d="m36 64 44-18 44 18-44 20Z" fill="#c5ddf9"/><path d="m36 64 44 20v34l-44-20Z" fill="#dbeafd"/><path d="m80 84 44-20v34l-44 20Z" fill="#a8cdf7"/><path d="m36 64-16 20 45 17 15-17Z" fill="#eef5ff" stroke="#d3e5fa"/><path d="m80 84 16 17 44-19-16-18Z" fill="#e1efff" stroke="#c5ddf9"/><rect x="58" y="12" width="36" height="34" rx="6" transform="rotate(-12 58 12)" fill="#e7f1fe"/><path d="m63 36 8-11 8 7 5-6 9 12" fill="#a8cdf7"/><circle cx="85" cy="18" r="3" fill="#bad6f7"/><path d="M110 18v-8m13 16 6-6" stroke="#1677ef" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="46" r="3" fill="#c5ddf9"/></svg>
      <h2>{{ l('暂无待领取任务','No available tasks','ยังไม่มีงานรอรับ') }}</h2>
      <p>{{ l('暂无待领取任务，发布后会自动显示在这里。', 'No available tasks. Published tasks will appear here.', 'ยังไม่มีงานรอรับ งานที่สร้างจะแสดงที่นี่') }}</p>
    </div>
    <div class="inline-task-actions"><span v-if="error && !createOpen" class="error" role="alert">{{ error }}</span><button class="secondary" :disabled="saving || !visibleTasks.length" @click="selectedClaimIds = visibleTasks.map(task => task.id)">{{ l('选择全部', 'Select all', 'เลือกทั้งหมด') }}</button><button v-if="canClaim" class="primary" :disabled="saving || !claimSelection.length" @click="claimPublishedTasks">{{ saving ? l('领取中…', 'Claiming…', 'กำลังรับ…') : l('领取 ' + claimSelection.length + ' 条任务', 'Claim ' + claimSelection.length + ' tasks', 'รับ ' + claimSelection.length + ' งาน') }}</button></div>
  </section>
  <div v-if="currentView !== 'available' && visibleTasks.length" class="resource-table-wrap">
    <table class="resource-table task-resource-table">
      <thead>
        <tr>
          <th>{{ l("产品货号", "Product code", "รหัสสินค้า") }}</th>
          <th>{{ l("型号", "Model", "รุ่น") }}</th>
          <th>{{ currentView === 'review' ? l('成品文件夹', 'Result folders', 'โฟลเดอร์ผลงาน') : l("图片", "Image", "รูปภาพ") }}</th>
          <th>{{ l("店铺", "Store", "ร้าน") }}</th>
          <th>SKU</th>
          <th>{{ l("优先级", "Priority", "ลำดับ") }}</th>
          <th>{{ l("负责人", "Assignee", "ผู้รับผิดชอบ") }}</th>
          <th>{{ l("状态", "Status", "สถานะ") }}</th>
          <th>{{ l("截止时间", "Deadline", "กำหนด") }}</th>
          <th>{{ l("操作", "Actions", "การทำงาน") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="task in visibleTasks"
          :key="task.id"
          @click="detailTask = task"
        >
          <td><b>{{ task.productCode || "—" }}</b></td>
          <td>{{ task.productName || task.title }}</td>
          <td>
            <div v-if="currentView === 'review'" class="task-result-folders">
              <button v-for="group in resultFoldersByTask.get(task.id) || []" :key="group.key" type="button" class="task-result-folder" @click.stop="openResultFolder(task, group)"><span aria-hidden="true">{{ group.folder ? '📁' : '📄' }}</span><span><b :title="group.name">{{ group.name }}</b><small>{{ group.count }} {{ l('个文件', 'files', 'ไฟล์') }}</small></span></button>
              <span v-if="!resultFoldersByTask.get(task.id)?.length" class="muted">{{ l('暂无成品文件', 'No result files', 'ยังไม่มีไฟล์ผลงาน') }}</span>
            </div>
            <template v-else><img v-if="task.productImageUrl" class="task-table-image" :src="task.productImageUrl" alt=""><span v-else class="muted">{{ l('暂无图片', 'No image', 'ไม่มีรูป') }}</span></template>
          </td>
          <td>{{ storeName(task.storeId) }}</td>
          <td>
            {{
              task.skuText ? task.skuText.split("\n").filter(Boolean).length : 0
            }}
            {{ l('个', 'items', 'รายการ') }}
          </td>
          <td>
            <em :class="['priority-badge', task.priority]">{{
              task.priority === "urgent" ? l("加急", "Urgent", "ด่วน") : l("普通", "Normal", "ปกติ")
            }}</em>
          </td>
          <td>{{ task.assigneeName || l("待领取", "Available", "รอรับ") }}</td>
          <td>
            <div class="status-line">
              <span :class="['status-badge', task.status]">{{
                statusLabel(task.status)
              }}</span>
            </div>
          </td>
          <td>{{ formatDate(task.deadline) }}</td>
          <td>
            <button
              v-if="
                task.status === 'available' &&
                canClaim
              "
              class="primary compact-action"
              @click.stop="claim(task)"
            >
              {{ l('领取', 'Claim', 'รับงาน') }}</button
            ><button
              v-if="
                ['in_progress', 'revision'].includes(task.status) &&
                task.assigneeId === library.currentUser?.id
              "
              class="primary compact-action"
              @click.stop="detailTask = task"
            >
              {{ l('上传成品', 'Upload result', 'อัปโหลดผลงาน') }}</button
            ><button class="text-button" @click.stop="detailTask = task">
              {{ l('查看', 'View', 'ดู') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="directUploadOpen" class="modal-mask" @click.self="directUploadOpen = false">
    <form class="modal designer-upload-modal" @submit.prevent="directUpload">
      <header><div><h2>{{ l('上传美工文件', 'Upload design files', 'อัปโหลดไฟล์ออกแบบ') }}</h2><p>{{ l('选择店铺后上传，系统会自动归入文件、图片或视频栏目', 'Choose a store; files are automatically categorized as files, images or videos.', 'เลือกร้านค้า ระบบจะจัดหมวดหมู่ไฟล์ รูปภาพ หรือวิดีโอโดยอัตโนมัติ') }}</p></div><button type="button" @click="directUploadOpen = false">×</button></header>
      <div class="designer-upload-fields">
        <label class="form-field"><span>{{ l('所属店铺', 'Store', 'ร้านค้า') }} *</span><select v-model="directUploadStoreId"><option value="" disabled>{{ l('请选择店铺', 'Select a store', 'เลือกร้านค้า') }}</option><optgroup v-for="group in storesByCountry" :key="group.country" :label="countryLabel(group.country)"><option v-for="store in group.stores" :key="store.id" :value="store.id">{{ store.name }}</option></optgroup></select></label>
        <label class="designer-file-picker" :class="{ dragging: directDragging }" @dragenter.prevent="directDragging = true" @dragover.prevent="directDragging = true; $event.dataTransfer.dropEffect = 'copy'" @dragleave.prevent="directDragging = false" @drop="dropDirectFiles"><b>{{ directDragging ? l("松开即可识别文件", "Release to add files", "ปล่อยเพื่อเพิ่มไฟล์") : l("拖入文件或文件夹", "Drop files or folders", "ลากไฟล์หรือโฟลเดอร์มาวาง") }}</b><small>{{ l('也可以点击选择 · 支持图片、视频、Excel、PDF、PSD、AI、ZIP 等格式', 'Or click to choose · Images, videos, Excel, PDF, PSD, AI, ZIP and more', 'หรือคลิกเพื่อเลือก · รองรับรูป วิดีโอ Excel, PDF, PSD, AI, ZIP และอื่นๆ') }}</small><input type="file" multiple @change="chooseDirectFiles"></label>
        <div v-if="directUploadFiles.length" class="upload-file-list"><div v-for="(file, index) in directUploadFiles" :key="`${file.name}-${file.size}`"><span class="upload-file-icon">{{ fileType(file).slice(0, 4) }}</span><div><b>{{ file.name }}</b><small>{{ file.type || t.files }} · {{ formatSize(file.size) }}</small></div><button type="button" @click="directUploadFiles.splice(index, 1)">×</button></div></div>
      </div>
      <p v-if="directUploadError" class="error">{{ directUploadError }}</p>
      <footer><button type="button" class="secondary" @click="directUploadOpen = false">{{ t.cancel }}</button><button class="primary" :disabled="saving || !directUploadFiles.length">{{ saving ? l("上传中…", "Uploading…", "กำลังอัปโหลด…") : l(`确认上传${directUploadFiles.length ? `（${directUploadFiles.length}）` : ''}`, `Upload${directUploadFiles.length ? ` (${directUploadFiles.length})` : ''}`, `อัปโหลด${directUploadFiles.length ? ` (${directUploadFiles.length})` : ''}`) }}</button></footer>
    </form>
  </div>

  <div v-if="detailTask" class="drawer-mask" @click.self="detailTask = null">
    <aside class="task-drawer">
      <header>
        <div>
          <span :class="['status-badge', detailTask.status]">{{
            statusLabel(detailTask.status)
          }}</span>
          <h2>{{ detailTask.productName || detailTask.title }}</h2>
          <p>
            {{ detailTask.productCode || l("未填写货号", "No product code", "ไม่มีรหัสสินค้า") }} ·
            {{ storeName(detailTask.storeId) }}
          </p>
        </div>
        <button @click="detailTask = null">×</button>
      </header>
      <div class="drawer-body">
        <img
          v-if="detailTask.productImageUrl"
          class="drawer-product-image"
          :src="detailTask.productImageUrl"
          alt=""
        />
        <dl class="task-facts">
          <div>
            <dt>{{ l('负责人', 'Assignee', 'ผู้รับผิดชอบ') }}</dt>
            <dd>{{ detailTask.assigneeName || l("尚未领取", "Not claimed", "ยังไม่มีผู้รับ") }}</dd>
          </div>
          <div>
            <dt>{{ l('优先级', 'Priority', 'ลำดับ') }}</dt>
            <dd>{{ detailTask.priority === "urgent" ? l("加急", "Urgent", "ด่วน") : l("普通", "Normal", "ปกติ") }}</dd>
          </div>
          <div>
            <dt>{{ l('截止时间', 'Deadline', 'กำหนดส่ง') }}</dt>
            <dd>{{ formatDate(detailTask.deadline) }}</dd>
          </div>
          <div>
            <dt>{{ l('状态', 'Status', 'สถานะ') }}</dt>
            <dd>{{ statusLabel(detailTask.status) }}</dd>
          </div>
        </dl>
        <section>
          <h3>{{ l('备注 / 任务要求', 'Notes / requirements', 'หมายเหตุ / ข้อกำหนดงาน') }}</h3>
          <p class="drawer-description">
            {{ detailTask.description || l("未填写任务要求", "No requirements provided", "ไม่มีข้อกำหนด") }}
          </p>
        </section>
        <section>
          <h3>SKU</h3>
          <div class="drawer-skus">
            <span
              v-for="sku in (detailTask.skuText || '')
                .split('\n')
                .filter(Boolean)"
              :key="sku"
              >{{ sku }}</span
            ><small v-if="!detailTask.skuText">{{ l('未填写 SKU', 'No SKU provided', 'ไม่มี SKU') }}</small>
          </div>
        </section>
        <section>
          <h3>{{ l('任务文件', 'Task files', 'ไฟล์งาน') }}</h3>
          <p v-if="resultDownloadError" class="error">{{ resultDownloadError }}</p>
          <div v-if="taskFiles.length" class="task-file-list">
            <div v-if="openedFolder" class="folder-browser">
              <nav><button type="button" class="secondary" @click="folderBack">← {{ l('返回上一级', 'Back', 'ย้อนกลับ') }}</button><button type="button" class="text-button" @click="folderLocation.key = ''">{{ l('任务文件', 'Task files', 'ไฟล์งาน') }}</button><span>/ {{ [openedFolder.folder, ...folderLocation.parts].join(' / ') }}</span></nav>
              <div class="desktop-file-grid">
                <template v-for="entry in folderEntries" :key="entry.key">
                  <button v-if="entry.folder" type="button" class="desktop-file" @click="folderLocation.parts.push(entry.name)"><span class="desktop-folder-icon">📁</span><span>{{ entry.name }}</span></button>
                  <a v-else class="desktop-file" :href="entry.file.url || entry.file.filePath" target="_blank" rel="noopener noreferrer">
                    <img v-if="library.taskFileMediaType(entry.file) === 'image' && !failedThumbnails.has(entry.file.id)" :src="entry.file.url || entry.file.filePath" :alt="entry.name" loading="lazy" @error="markThumbnailFailed(entry.file.id)">
                    <span v-else class="task-file-icon">{{ entry.name.split('.').pop()?.toUpperCase() }}</span><span>{{ entry.name }}</span>
                  </a>
                </template>
              </div>
            </div>
            <template v-for="group in (openedFolder ? [] : groupedTaskFiles)" :key="group.key">
            <div v-if="group.folder" class="desktop-folder-row">
              <button type="button" class="task-folder-open" draggable="true" @dragstart="dragFolder($event, group)" :title="l('点击打开文件夹，拖出保存为 ZIP', 'Click to open; drag out to save as ZIP', 'คลิกเพื่อเปิด ลากออกเพื่อบันทึกเป็น ZIP')" @click="enterFolder(group)"><span class="desktop-folder-icon">📁</span><span><b>{{ group.folder }}</b><small>{{ group.files.length }} {{ l('个文件', 'files', 'ไฟล์') }}</small></span></button>
              <div class="task-folder-actions"><button type="button" class="secondary" :disabled="downloadingResults" @click="downloadResults(group)">{{ downloadingResults ? l('下载中…', 'Downloading…', 'กำลังดาวน์โหลด…') : l('下载', 'Download', 'ดาวน์โหลด') }}</button></div>
            </div>
            <article v-else
              v-for="file in group.files"
              :key="file.id"
              class="task-file-row"
            >
              <a v-if="library.taskFileMediaType(file) === 'image' && !failedThumbnails.has(file.id)" class="task-file-thumbnail" :href="file.url || file.filePath" target="_blank" rel="noopener noreferrer" :aria-label="l('预览图片：', 'Preview image: ', 'ดูรูป: ') + file.name">
                <img :src="file.url || file.filePath" :alt="file.name" loading="lazy" @error="markThumbnailFailed(file.id)">
              </a>
              <span v-else class="task-file-icon">{{
                file.name.split(".").pop()?.slice(0, 4).toUpperCase()
              }}</span>
              <div>
                <b>{{ file.name }}</b
                ><small
                  >{{ file.purpose === "result" ? l("美工成品", "Design result", "ผลงานออกแบบ") : l("参考资料", "Reference", "เอกสารอ้างอิง") }} ·
                  {{ new Date(file.createdAt).toLocaleString() }}</small
                >
              </div>
              <a :href="file.url" target="_blank">{{ l('预览', 'Preview', 'ดูตัวอย่าง') }}</a>
            </article>
            </template>
          </div>
          <p v-else class="muted">{{ l('暂时没有附件', 'No attachments', 'ไม่มีไฟล์แนบ') }}</p>
        </section>
        <section v-if="detailTask.reviewNote">
          <h3>{{ l('自检备注', 'Self-review note', 'หมายเหตุตรวจงาน') }}</h3>
          <p class="review-note">{{ detailTask.reviewNote }}</p>
        </section>
        <section
          v-if="
            ['in_progress', 'revision'].includes(detailTask.status) &&
            detailTask.assigneeId === library.currentUser?.id
          "
        >
          <h3>{{ l('上传成品', 'Upload result', 'อัปโหลดผลงาน') }}</h3>
          <div class="result-upload-bar" :class="{ dragging: resultDragging }" @dragenter.prevent="resultDragging = true" @dragover.prevent="resultDragging = true; $event.dataTransfer.dropEffect = 'copy'" @dragleave.prevent="resultDragging = false" @drop="dropResultFiles">
            <input ref="resultInput" class="visually-hidden-file" type="file" multiple @change="chooseResultFiles" />
            <input ref="resultFolderInput" class="visually-hidden-file" type="file" multiple webkitdirectory directory @change="chooseResultFiles" />
            <div class="result-upload-toolbar"><span>{{ resultDragging ? l('松开添加文件', 'Drop to add files', 'ปล่อยเพื่อเพิ่มไฟล์') : l('可拖入文件或文件夹', 'Drop files or folders here', 'ลากไฟล์หรือโฟลเดอร์มาที่นี่') }}</span><div class="result-picker-actions"><button type="button" class="secondary" @click="openResultPicker">＋ {{ l('选择文件', 'Choose files', 'เลือกไฟล์') }}</button><button type="button" class="secondary" @click="openResultFolderPicker">▰ {{ l('选择文件夹', 'Choose folder', 'เลือกโฟลเดอร์') }}</button></div></div>
            <ResultFileBrowser :files="resultFiles" :disabled="saving" @remove="removeResultSelection" />
          </div>
          <div class="result-upload-actions"><span>{{ l(`已选择 ${resultSelections.length} 项`, `${resultSelections.length} item(s) selected`, `เลือกแล้ว ${resultSelections.length} รายการ`) }}</span><button type="button" class="primary" :disabled="saving || !resultFiles.length" @click="uploadResults">{{ saving ? l("上传中…", "Uploading…", "กำลังอัปโหลด…") : l("立即上传", "Upload now", "อัปโหลดตอนนี้") }}</button></div>
          <p v-if="resultUploadSuccess" class="upload-success">{{ resultUploadSuccess }}</p>
          <p v-if="resultUploadError" class="error">{{ resultUploadError }}</p>
        </section>
      </div>
      <footer>
        <button
          v-if="detailTask.status === 'available' && canClaim"
          class="primary"
          @click="claim(detailTask)"
        >
          {{ l('领取任务', 'Claim task', 'รับงาน') }}</button
        ><template
          v-if="
            ['in_progress', 'revision'].includes(detailTask.status) &&
            detailTask.assigneeId === library.currentUser?.id
          "
          ><button
            class="primary"
            :disabled="saving"
            @click="submit(detailTask)"
          >
            {{ resultFiles.length ? l("上传并提交自检", "Upload and submit review", "อัปโหลดและส่งตรวจ") : l("提交自检", "Submit review", "ส่งตรวจ") }}
          </button></template
        ><template
          v-if="
            detailTask.status === 'submitted' &&
            detailTask.assigneeId === library.currentUser?.id
          "
          ><input
            v-model="reviewNote"
            :placeholder="l('可填写自检备注', 'Optional review note', 'หมายเหตุตรวจงาน (ไม่บังคับ)')"
          /><button class="secondary" @click="review(detailTask, false)">
            {{ l('继续修改', 'Continue editing', 'แก้ไขต่อ') }}</button
          ><button class="primary" @click="review(detailTask, true)">
            {{ l('确认完成', 'Confirm complete', 'ยืนยันเสร็จสิ้น') }}
          </button></template
        >
      </footer>
    </aside>
  </div>

  <div v-if="createOpen" class="modal-mask" @click.self="!saving && (createOpen = false)">
    <form class="modal task-create-modal" @submit.prevent="create">
      <header><div><h2>{{ l('发布美工任务', 'Publish design task', 'สร้างงานออกแบบ') }}</h2><p>{{ l('填写后发布到待领取列表，美工可领取任务', 'Publish to the available list for designers to claim', 'สร้างงานในรายการรอรับสำหรับนักออกแบบ') }}</p></div><button type="button" :disabled="saving" @click="createOpen = false">×</button></header>
      <fieldset :disabled="saving" class="publish-fields">
      <div class="task-sheet-settings">
        <label class="form-field"><span>{{ l('所属店铺', 'Store', 'ร้านค้า') }} *</span><select v-model="form.storeId" required><option value="" disabled>{{ l('请选择店铺', 'Select a store', 'เลือกร้านค้า') }}</option><optgroup v-for="group in storesByCountry" :key="group.country" :label="countryLabel(group.country)"><option v-for="store in group.stores" :key="store.id" :value="store.id">{{ store.name }}</option></optgroup></select></label>
        <label class="form-field"><span>{{ l('优先级', 'Priority', 'ลำดับ') }}</span><select v-model="form.priority"><option value="normal">{{ l('普通', 'Normal', 'ปกติ') }}</option><option value="urgent">{{ l('加急', 'Urgent', 'ด่วน') }}</option></select></label>
        <label class="form-field"><span>{{ l('截止时间', 'Deadline', 'กำหนดส่ง') }}</span><input v-model="form.deadline" type="date"></label>
      </div>
      <div class="publish-sheet-scroll"><div class="task-entry-sheet batch-task-sheet publish-task-sheet">
        <div class="sheet-head">{{ l('产品代号', 'Product code', 'รหัสสินค้า') }}</div><div class="sheet-head">{{ l('型号', 'Product name', 'ชื่อสินค้า') }} *</div><div class="sheet-head">{{ l('图片', 'Image', 'รูปภาพ') }}</div><div class="sheet-head">SKU</div><div class="sheet-head">{{ l('备注', 'Notes', 'หมายเหตุ') }}</div>
        <div class="sheet-cell"><input v-model="form.productCode" placeholder="T-0543"></div>
        <div class="sheet-cell"><input v-model="form.productName" required maxlength="80" :placeholder="l('型号或品名', 'Model or product name', 'รุ่นหรือชื่อสินค้า')"></div>
        <label class="sheet-image-cell" :class="{ dragging: productImageDragging }" @dragover.prevent="productImageDragging = true" @dragleave.prevent="productImageDragging = false" @drop="dropProductImage"><img v-if="productImagePreview" :src="productImagePreview" :alt="form.productName"><span v-else>{{ l('拖入图片或点击选择', 'Drop image or click to choose', 'ลากรูปหรือคลิกเพื่อเลือก') }}</span><input type="file" accept="image/*" @change="chooseImage"></label>
        <div class="sheet-cell batch-sku-cell"><div v-for="(sku, index) in publishSkuLines" :key="index" class="batch-sku-line"><input :value="sku" :placeholder="l('例如：6格蓝色', 'e.g. 6-slot blue', 'เช่น 6 ช่อง สีฟ้า')" @input="updatePublishSku(index, $event.target.value)"><button v-if="publishSkuLines.length > 1" type="button" @click="removePublishSku(index)">×</button></div><button class="batch-sku-add" type="button" @click="form.skuText += '\n'">＋ {{ l('添加 SKU', 'Add SKU', 'เพิ่ม SKU') }}</button></div>
        <div class="sheet-cell batch-note-cell"><textarea v-model="form.description" rows="4" :placeholder="l('填写备注或制作要求', 'Notes or production requirements', 'หมายเหตุหรือข้อกำหนดงาน')"></textarea></div>
      </div></div>
      <div class="task-sheet-extra"><label class="task-upload-choice"><b>{{ l('选择参考文件', 'Choose reference files', 'เลือกไฟล์อ้างอิง') }}</b><input type="file" multiple @change="chooseAttachments"></label><div class="selected-file-names"><span v-for="(file, index) in attachments" :key="index">{{ file.name }}</span></div></div>
      </fieldset>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <footer><button type="button" class="secondary" :disabled="saving" @click="createOpen = false">{{ t.cancel }}</button><button class="primary" :disabled="saving">{{ saving ? l('发布中…', 'Publishing…', 'กำลังสร้าง…') : l('发布任务', 'Publish task', 'สร้างงาน') }}</button></footer>
    </form>
  </div>

  </section>
</template>

<style scoped>
.desktop-folder-row { width: 100%; display: flex; align-items: center; gap: 16px; padding: 16px; background: white; border: 0; border-bottom: 1px solid #e2e4e8; text-align: left; cursor: pointer; color: inherit; }
.desktop-folder-row:hover, .desktop-file:hover { background: #eef5ff; }
.desktop-folder-row > :last-child { margin-left: auto; }
.desktop-folder-row small { display: block; margin-top: 6px; color: #7a8494; }
.task-folder-open { display:flex; align-items:center; gap:16px; flex:1; min-width:0; border:0; background:transparent; text-align:left; color:inherit; }
.task-folder-actions { display:flex; flex-wrap:wrap; gap:8px; }
.task-folder-open[draggable] { cursor:grab; }
.task-folder-open[draggable]:active { cursor:grabbing; }
.task-result-folders { display:flex; flex-direction:column; gap:8px; max-height:180px; overflow:auto; }
.task-result-folder { display:flex; align-items:center; gap:10px; border:1px solid #e3e9f1; background:#f7faff; border-radius:8px; padding:10px; text-align:left; color:#172033; max-width:240px; }
.task-result-folder > span:first-child { font-size:26px; }
.task-result-folder > span:last-child { min-width:0; }
.task-result-folder b { display:block; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.task-result-folder small { display:block; margin-top:4px; color:#8491a4; }
@media(max-width:600px) { .desktop-folder-row { flex-wrap:wrap; } }
.desktop-folder-icon { font-size: 42px; }
.folder-browser nav { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid #e2e4e8; overflow-wrap: anywhere; }
.desktop-file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; padding: 16px; }
.desktop-file { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 12px; border: 1px solid transparent; border-radius: 8px; background: white; color: inherit; text-decoration: none; text-align: center; cursor: pointer; min-width: 0; }
.desktop-file > span:last-child { overflow-wrap: anywhere; font-size: 13px; }
.desktop-file img { width: 80px; height: 80px; object-fit: contain; }

.task-file-folder { border-bottom: 1px solid #e2e4e8; }
.task-file-folder summary { display: flex; align-items: center; gap: 12px; padding: 16px; cursor: pointer; }
.task-file-folder summary small { display: block; color: #7a8494; margin-top: 6px; }
.folder-contents { display: grid; gap: 10px; padding: 0 16px 16px 84px; overflow-wrap: anywhere; }

.task-file-row .task-file-thumbnail { display: flex; width: 56px; height: 56px; flex: 0 0 56px; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #e2e4e8; border-radius: 8px; background: #f7f8fa; }
.task-file-thumbnail img { display: block; width: 100%; height: 100%; object-fit: contain; }
.task-file-thumbnail:focus-visible { outline: 2px solid #1769aa; outline-offset: 2px; }
.claim-sheet-scroll { overflow-x: auto; margin-top: 18px; }
.claim-sheet { width: 100%; min-width: 650px; border-collapse: collapse; table-layout: fixed; }
.claim-sheet th { background: #f8fafc; color: #64748b; padding: 12px; border: 0; border-bottom: 1px solid #e8edf3; font-size: 12px; font-weight: 600; }
.claim-sheet td { padding: 16px 12px; border: 0; border-bottom: 1px solid #e8edf3; overflow-wrap: anywhere; text-align: center; }
.claim-sheet td img { width: 100%; height: 140px; object-fit: contain; }
.claim-sheet small { display: block; margin-top: 8px; color: #6b7280; }
.claim-selection { display: flex; gap: 10px; justify-content: center; align-items: center; }
.claim-selection input { width: 16px; height: 16px; }
.claim-sheet .claim-note { white-space: pre-wrap; text-align: left; }
.claim-sku { padding: 8px; border-bottom: 1px solid #e2e4e8; }

.publish-fields { border: 0; padding: 0; margin: 0; min-width: 0; }
.publish-sheet-scroll { max-width: 100%; overflow-x: auto; }
.task-create-modal { width: min(1080px, 96vw); max-width: 100%; box-sizing: border-box; }
.publish-task-sheet { min-width: 0; width: 100%; box-sizing: border-box; }
.publish-task-sheet > * { min-width: 0; }
.publish-task-sheet .batch-sku-line input { height: 34px; text-align: left; }
.batch-task-sheet {
  grid-template-columns: minmax(100px, 0.7fr) minmax(140px, 1fr) minmax(150px, 1fr) minmax(220px, 1.3fr) minmax(200px, 1.2fr);
}
.batch-note-cell textarea {
  min-height: 150px;
  text-align: left;
  line-height: 1.6;
  resize: vertical;
}
@media (max-width: 900px) {
  .batch-task-sheet { grid-template-columns: 100px 140px 150px 220px 200px; overflow-x: auto; }
}
.publish-task-sheet.batch-task-sheet {
  grid-template-columns: minmax(0, .8fr) minmax(0, 1fr) minmax(0, 1.05fr) minmax(0, 1.2fr) minmax(0, 1.25fr);
  overflow: visible;
}
.publish-task-sheet .sheet-head { padding: 8px 4px; overflow-wrap: anywhere; }
.publish-task-sheet .sheet-cell input,
.publish-task-sheet .sheet-cell textarea { box-sizing: border-box; min-width: 0; padding: 8px; }
.publish-task-sheet .sheet-image-cell span { padding: 8px; overflow-wrap: anywhere; font-size: 13px; }
.publish-task-sheet .sheet-image-cell img { max-width: 100%; }
@media (max-width: 700px) {
  .task-create-modal { padding: 16px; }
  .publish-task-sheet.batch-task-sheet { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .publish-task-sheet > .sheet-head { min-height: 40px; }
  .publish-task-sheet > :nth-child(1) { grid-column: 1; grid-row: 1; }
  .publish-task-sheet > :nth-child(2) { grid-column: 2; grid-row: 1; }
  .publish-task-sheet > :nth-child(6) { grid-column: 1; grid-row: 2; }
  .publish-task-sheet > :nth-child(7) { grid-column: 2; grid-row: 2; }
  .publish-task-sheet > :nth-child(3) { grid-column: 1; grid-row: 3; }
  .publish-task-sheet > :nth-child(4) { grid-column: 2; grid-row: 3; }
  .publish-task-sheet > :nth-child(8) { grid-column: 1; grid-row: 4; }
  .publish-task-sheet > :nth-child(9) { grid-column: 2; grid-row: 4; }
  .publish-task-sheet > :nth-child(5) { grid-column: 1 / -1; grid-row: 5; }
  .publish-task-sheet > :nth-child(10) { grid-column: 1 / -1; grid-row: 6; }
  .publish-task-sheet > .sheet-cell { min-height: 80px; }
  .publish-task-sheet .batch-note-cell textarea { min-height: 100px; }
}
</style>
