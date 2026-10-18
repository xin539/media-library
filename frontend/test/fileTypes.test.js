import test from 'node:test'
import assert from 'node:assert/strict'
import { fileMediaType } from '../src/fileTypes.js'

test('图片附件保持图片类型，不取决于上传入口和用途', () => {
  for (const purpose of ['reference','result']) {
    for (const name of ['1.png','主图.JPG','商品.webp','相片.HEIC']) {
      assert.equal(fileMediaType({name,purpose,mimeType:'application/octet-stream'}),'image')
    }
  }
})
test('普通文件和压缩包不提取图片，视频独立分类', () => {
  for (const name of ['图片.zip','设计.psd','素材.ai','说明.pdf','表格.xlsx']) {
    assert.equal(fileMediaType({name}),'file')
  }
  assert.equal(fileMediaType({name:'演示.MP4'}),'video')
  assert.equal(fileMediaType({name:'无扩展名',mimeType:'image/png'}),'image')
  assert.equal(fileMediaType({name:'未知文件'}),'file')
})
