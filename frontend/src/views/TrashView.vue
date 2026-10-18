<script setup>
import PageHeader from '../components/PageHeader.vue'; import AssetCard from '../components/AssetCard.vue'; import { useLibraryStore } from '../stores/library'
import { useLocale } from '../i18n.js'
const library = useLibraryStore()
const { t, l } = useLocale()
</script>
<template>
  <section class="workspace-page trash-page">
  <PageHeader :title="t.trash" :description="`${t.restore} / ${t.permanentDelete}`" />
  <section v-if="library.deletedStores.length" class="trash-section">
    <div class="section-title"><div><h2>{{ l('已删除店铺', 'Deleted stores', 'ร้านค้าที่ลบแล้ว') }}</h2><p>{{ l(`${library.deletedStores.length} 个店铺`, `${library.deletedStores.length} stores`, `${library.deletedStores.length} ร้าน`) }}</p></div></div>
    <div class="trash-store-list">
      <article v-for="store in library.deletedStores" :key="store.id" class="trash-store-item">
        <img v-if="store.avatar" :src="store.avatar" :alt="store.name">
        <span v-else class="trash-store-avatar">{{ store.name.slice(0, 1) }}</span>
        <div><b>{{ store.name }}</b><small>{{ store.country }} · {{ store.category }} · {{ l('删除于', 'Deleted', 'ลบเมื่อ') }} {{ new Date(store.deletedAt).toLocaleString() }}</small></div>
        <button class="secondary" @click="library.restoreDeletedStore(store.id)">{{ t.restore }}</button>
        <button class="trash-purge" @click="library.permanentlyDeleteStore(store.id)">{{ t.permanentDelete }}</button>
      </article>
    </div>
  </section>
  <section v-if="library.deletedAssets.length" class="trash-section">
    <div class="section-title"><div><h2>{{ l('已删除素材', 'Deleted assets', 'สื่อที่ลบแล้ว') }}</h2><p>{{ l(`${library.deletedAssets.length} 个文件`, `${library.deletedAssets.length} files`, `${library.deletedAssets.length} ไฟล์`) }}</p></div></div>
    <div class="asset-grid"><AssetCard v-for="asset in library.deletedAssets" :key="asset.id" :asset="asset" :store-name="library.storeById(asset.storeId)?.name" trash @restore="library.restoreAsset(asset.id)" @purge="library.permanentlyDeleteAsset(asset.id)" /></div>
  </section>
  <div v-if="!library.deletedStores.length && !library.deletedAssets.length" class="empty ui-empty"><svg class="empty-illustration" viewBox="0 0 160 128" aria-hidden="true"><ellipse cx="80" cy="116" rx="44" ry="6" fill="#eef4fb"/><path d="m48 40 8 68h48l8-68" fill="#dbeafd" stroke="#b8d4f5" stroke-width="2"/><path d="M42 40h76M64 28h32M68 57v32m24-32v32" fill="none" stroke="#91b7df" stroke-width="4" stroke-linecap="round"/><path d="M118 22v-8m10 15 7-6" stroke="#1677ef" stroke-width="3" stroke-linecap="round"/></svg><h2>{{ t.emptyTrash }}</h2><p>{{ l('被删除的素材将显示在这里，支持恢复或永久删除。','Deleted media appears here. Restore it or delete it permanently.','สื่อที่ลบจะแสดงที่นี่ สามารถกู้คืนหรือลบถาวรได้') }}</p></div>
  </section>
</template>
