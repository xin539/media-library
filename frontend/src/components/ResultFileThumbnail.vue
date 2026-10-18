<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
const props = defineProps({ file: { type: Object, required: true } });
const element = ref(null);
const url = ref('');
const failed = ref(false);
let observer;
const isImage = () => props.file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(props.file.name);
function release() {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = '';
}
onMounted(() => {
  if (!isImage()) return;
  // Only visible rows allocate image URLs; scrolling away also releases them.
  if (typeof IntersectionObserver === 'undefined') return;
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !failed.value && !url.value) url.value = URL.createObjectURL(props.file);
    else if (!entry.isIntersecting) release();
  }, { root: element.value.closest('.result-browser-scroll'), rootMargin: '60px' });
  observer.observe(element.value);
});
onBeforeUnmount(() => { observer?.disconnect(); release(); });
</script>

<template>
  <span ref="element" class="result-thumb" aria-hidden="true">
    <img v-if="url" :src="url" alt="" @error="failed = true; release()" />
    <span v-else>{{ file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name) ? '▶' : isImage() ? '▧' : '≡' }}</span>
  </span>
</template>

<style scoped>
.result-thumb { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex: 0 0 36px; border-radius: 6px; background: #edf4ff; color: #1677ef; overflow: hidden; }
.result-thumb img { width: 100%; height: 100%; object-fit: cover; }
</style>
