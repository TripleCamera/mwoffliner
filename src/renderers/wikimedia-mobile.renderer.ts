import * as domino from 'domino'
import urlJoin from 'url-join'
import * as logger from '../Logger.js'
import { MobileRenderer } from './abstractMobile.render.js'
import { getStrippedTitleFromHtml } from '../util/misc.js'
import { RenderOpts, RenderOutput } from './abstract.renderer.js'

type PipeFunction = (value: DominoElement) => DominoElement | Promise<DominoElement>

// Represent 'https://{wikimedia-wiki}/api/rest_v1/page/mobile-html/'
export class WikimediaMobileRenderer extends MobileRenderer {
  constructor() {
    super()
  }

  private getStrippedTitle(renderOpts: RenderOpts): string {
    const { data, articleId } = renderOpts

    const strippedTitle = getStrippedTitleFromHtml(data)
    return strippedTitle || articleId.replace('_', ' ')
  }

  public async render(renderOpts: RenderOpts): Promise<any> {
    try {
      const result: RenderOutput = []
      const { data, articleId, webp, _moduleDependencies, dump } = renderOpts
      const articleDetail = await renderOpts.articleDetailXId.get(articleId)

      const displayTitle = this.getStrippedTitle(renderOpts)
      if (data) {
        const moduleDependenciesFiltered = super.filterWikimediaMobileModules(_moduleDependencies)
        let mediaDependenciesVal
        let subtitlesVal
        const mobileHTML = domino.createDocument(data)
        const finalHTMLMobile = await this.pipeMobileTransformations(
          mobileHTML,
          this.INTERNAL.convertLazyLoadToImages,
          this.removeEditContainer,
          this.removeHiddenClass,
          async (doc) => {
            const { finalHTML, subtitles, mediaDependencies } = await super.processHtml(
              doc.documentElement.outerHTML,
              dump,
              articleId,
              articleDetail,
              moduleDependenciesFiltered,
              webp,
              super.templateMobileArticle.bind(this),
            )

            mediaDependenciesVal = mediaDependencies
            subtitlesVal = subtitles
            return domino.createDocument(finalHTML)
          },
          this.restoreLinkDefaults,
        )

        result.push({
          articleId,
          displayTitle,
          html: finalHTMLMobile.documentElement.outerHTML,
          mediaDependencies: mediaDependenciesVal,
          moduleDependencies: moduleDependenciesFiltered,
          staticFiles: this.staticFilesListMobile,
          subtitles: subtitlesVal,
        })
        return result
      } else {
        throw new Error(`Cannot render [${data}] into an article`)
      }
    } catch (err) {
      logger.error(err.message)
      throw new Error(err.message)
    }
  }

  private async pipeMobileTransformations(value: DominoElement, ...fns: PipeFunction[]): Promise<DominoElement> {
    let result: DominoElement | Promise<DominoElement> = value
    for (const fn of fns) {
      result = fn(await result)
    }
    return result
  }

  private removeEditContainer(doc: DominoElement) {
    const editContainers = doc.querySelectorAll('.pcs-edit-section-link-container')

    editContainers.forEach((elem: DominoElement) => {
      elem.remove()
    })

    return doc
  }

  private convertLazyLoadToImagesImpl(doc: DominoElement) {
    const protocol = 'https://'
    const spans = doc.querySelectorAll('.pcs-lazy-load-placeholder')

    spans.forEach((span: DominoElement) => {
      // Create a new img element
      const img = doc.createElement('img') as DominoElement

      // Set the attributes for the img element based on the data attributes in the span

      // The data-data-file-original-src attribute is the URL of the image that was used in the original article.
      // It is preferred over the data-src attribute, which is a "mobile" image that may be scaled up to 320px
      // or 640px in order to be "full width" on mobile devices. However, if the mobile API didn't scale the
      // image up, then the data-data-file-original-src attribute will be missing, and we should use the data-src.
      // See https://github.com/openzim/mwoffliner/issues/1925.
      const imgSrc = span.getAttribute('data-data-file-original-src') || span.getAttribute('data-src')
      img.src = urlJoin(protocol, imgSrc)
      img.setAttribute('decoding', 'async')
      img.width = span.getAttribute('data-width')
      img.height = span.getAttribute('data-height')
      img.className = span.getAttribute('data-class')

      // Replace the span with the img element
      span.parentNode.replaceChild(img, span)
    })

    return doc
  }

  private removeHiddenClass(doc: DominoElement) {
    const pcsSectionHidden = 'pcs-section-hidden'
    const hiddenSections = doc.querySelectorAll(`.${pcsSectionHidden}`)
    hiddenSections.forEach((section) => {
      section.classList.remove(pcsSectionHidden)
    })
    return doc
  }

  private restoreLinkDefaults(doc: DominoElement) {
    const supElements = doc.querySelectorAll('sup')

    Array.from(supElements).forEach((sup: DominoElement) => {
      const anchor = doc.createElement('a')
      const mwRefLinkTextElement = sup.querySelector('.mw-reflink-text') as DominoElement

      let mwRefLinkText = ''
      if (mwRefLinkTextElement) {
        mwRefLinkText = mwRefLinkTextElement.textContent || ''
      }

      const existedAnchor = sup.querySelector('.reference-link')

      if (existedAnchor?.getAttribute('href')) {
        anchor.setAttribute('href', existedAnchor.getAttribute('href'))
      }
      anchor.className = 'reference-link'
      anchor.textContent = mwRefLinkText

      sup.innerHTML = ''
      sup.appendChild(anchor)
    })

    return doc
  }

  public readonly INTERNAL = {
    convertLazyLoadToImages: this.convertLazyLoadToImagesImpl,
  }
}
