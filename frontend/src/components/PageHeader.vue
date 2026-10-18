<script setup>
// 标题和说明由不同页面传入；默认插槽用于放页面操作按钮。
defineProps({ title: { type: String, required: true }, description: { type: String, default: '' } })
</script>
<template><header class="page-header"><div><div class="page-title-line"><h1>{{ title }}</h1><slot name="title-after" /></div><p>{{ description }}</p></div><slot /></header></template>
