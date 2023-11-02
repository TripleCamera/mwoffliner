import 'dotenv/config.js'
import domino from 'domino'
import { testAllRenders } from '../testAllRenders.js'
import { jest } from '@jest/globals'
import { zimdump } from '../util.js'
import rimraf from 'rimraf'
import { execa } from 'execa'

jest.setTimeout(200000)

const parameters = {
  mwUrl: 'https://en.wikipedia.org',
  adminEmail: 'mail@mail.com',
  redis: process.env.REDIS,
  mwApiPath: 'w/api.php',
  mwWikiPath: '/',
}

await testAllRenders({ ...parameters, format: 'nopic', articleList: 'BMW' }, async (outFiles) => {
  describe('format:nopic', () => {
    test(`Test en.wikipedia.org using format:nopic for ${outFiles[0]?.renderer} renderer`, async () => {
      await execa('redis-cli flushall', { shell: true })
      const articleFromDump = await zimdump(`show --url A/BMW ${outFiles[0].outFile}`)
      const articleDoc = domino.createDocument(articleFromDump)

      const imgElements = Array.from(articleDoc.querySelectorAll('img'))

      expect(imgElements).toHaveLength(0)
      rimraf.sync(`./${outFiles[0].testId}`)
    })
  })
})

await testAllRenders({ ...parameters, format: 'nodet', articleList: 'BMW' }, async (outFiles) => {
  describe('format:nodet', () => {
    test(`Test en.wikipedia.org using format:nodet for ${outFiles[0]?.renderer} renderer`, async () => {
      await execa('redis-cli flushall', { shell: true })
      const articleFromDump = await zimdump(`show --url A/BMW ${outFiles[0].outFile}`)
      const articleDoc = domino.createDocument(articleFromDump)

      const sectionsElements = Array.from(articleDoc.querySelectorAll('section'))

      expect(sectionsElements).toHaveLength(1)
      expect(sectionsElements[0].getAttribute('data-mw-section-id')).toEqual('0')
      rimraf.sync(`./${outFiles[0].testId}`)
    })
  })
})

await testAllRenders({ ...parameters, format: 'novid', articleList: 'Animation' }, async (outFiles) => {
  describe('format:novid to check no video tags', () => {
    test(`Test en.wikipedia.org using format:novid for ${outFiles[0]?.renderer} renderer (no video)`, async () => {
      await execa('redis-cli flushall', { shell: true })
      const articleFromDump = await zimdump(`show --url A/Animation ${outFiles[0].outFile}`)
      const articleDoc = domino.createDocument(articleFromDump)

      const audioElements = Array.from(articleDoc.querySelectorAll('audio'))

      expect(audioElements).toHaveLength(0)
      rimraf.sync(`./${outFiles[0].testId}`)
    })
  })
})

await testAllRenders({ ...parameters, format: 'novid', articleList: 'English_alphabet' }, async (outFiles) => {
  describe('format:novid to check no audio tags', () => {
    test(`Test en.wikipedia.org using format:novid for ${outFiles[0]?.renderer} renderer (no audio)`, async () => {
      await execa('redis-cli flushall', { shell: true })
      const articleFromDump = await zimdump(`show --url A/English_alphabet ${outFiles[0].outFile}`)
      const articleDoc = domino.createDocument(articleFromDump)

      const videoElements = Array.from(articleDoc.querySelectorAll('video'))

      expect(videoElements).toHaveLength(0)
      rimraf.sync(`./${outFiles[0].testId}`)
    })
  })
})

// TODO: blocked by issues/1928
/*
await testAllRenders({ ...parameters, format: 'nopdf', articleList: 'PDF' }, async (outFiles) => {
  describe('format:pdf to check no internal links pdf files', () => {
    test(`Test en.wikipedia.org using format:nopdf for ${outFiles[0]?.renderer} renderer`, async () => {
      await execa('redis-cli flushall', { shell: true })
      const articleFromDump = await zimdump(`show --url A/PDF ${outFiles[0].outFile}`)
      const articleDoc = domino.createDocument(articleFromDump)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const anchorElements = Array.from(articleDoc.querySelectorAll('a'))
      rimraf.sync(`./${outFiles[0].testId}`)
    })
  })
})
*/
