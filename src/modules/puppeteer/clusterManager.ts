import { ElementHandle, Page } from 'puppeteer'
import { Cluster } from 'puppeteer-cluster'

class ClusterManager {
  private cluster: Cluster<any, any>

  public async launch({ concurrency, puppeteer, headless, executablePath }) {
    console.log('THE EX', executablePath)
    this.cluster = await Cluster.launch({
      executablePath,
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: concurrency,
      retryLimit: 3,
      timeout: 60 * 2000,
      monitor: false,
      puppeteer,
      puppeteerOptions: {
        // @ts-ignore
        headless,
        args: [
          '--window-size=1400,900',
          '--remote-debugging-port=9222',
          '--remote-debugging-address=0.0.0.0', // You know what your doing?
          '--disable-gpu',
          '--disable-features=IsolateOrigins,site-per-process',
          '--blink-settings=imagesEnabled=true',
          '--no-sandbox',
        ],
      },
    })
  }

  public queue(...args) {
    // @ts-ignore
    return this.cluster.queue(...args)
  }

  public idle(...args) {
    // @ts-ignore
    return this.cluster.idle(...args)
  }

  public task(...args) {
    // @ts-ignore
    return this.cluster.task(...args)
  }

  public close(...args) {
    // @ts-ignore
    return this.cluster.close(...args)
  }

  public getCluster() {
    return this.cluster
  }

  public static async wait(page: Page, selector: string, timeout = 5000) {
    if (page) {
      try {
        await page.waitForSelector(selector, { timeout })

        return true
      } catch (error) {
        return false
      }
    } else {
      throw new Error('No page is open!')
    }
  }

  public static async pageFindOne(
    page: Page,
    selector: string,
    target: string,
    timeout = 5000,
  ) {
    if (page && selector && target) {
      const elementExists: boolean = await this.wait(page, selector, timeout)
      if (!elementExists) {
        return null
      }

      return page.$eval(
        selector,
        (element: Element, ...args: unknown[]) => {
          const subTarget: string = args[0] as unknown as string
          if (subTarget === 'innerHTML') {
            return element.innerHTML
          }
          if (subTarget === 'outerHTML') {
            return element.outerHTML
          }
          if (subTarget === 'textContent') {
            return element.textContent
          }
          try {
            return element.getAttribute(subTarget)
          } catch (error) {
            throw new Error(`No valid target specified for element. ${error}`)
          }
        },
        target,
      )
    }
    throw new Error(
      'An issue occurred during element search. Has a page been instantiated?',
    )
  }

  public static async findOneGivenElement(
    page: Page,
    element: ElementHandle,
    selector: string,
    target: string,
    timeout = 5000,
  ) {
    if (page && element && target) {
      const elementExists: boolean = await this.wait(page, selector, timeout)
      if (!elementExists) {
        return null
      }

      return element.$eval(
        selector,
        (el: Element, ...args: unknown[]) => {
          const subTarget: string = args[0] as unknown as string
          if (subTarget === 'innerHTML') {
            return el.innerHTML
          }
          if (subTarget === 'outerHTML') {
            return el.outerHTML
          }
          if (subTarget === 'textContent') {
            return el.textContent
          }
          try {
            return el.getAttribute(subTarget)
          } catch (error) {
            throw new Error(`No valid target specified for element. ${error}`)
          }
        },
        target,
      )
    }
    return null
  }

  public static async findManyGivenElement(
    page: Page,
    element: any,
    selector: string,
    target?: string,
    timeout = 5000,
  ) {
    if (page && element) {
      const elementExists: boolean = await this.wait(page, selector, timeout)
      if (!elementExists) {
        return null
      }

      if (!target) {
        return element.$$(selector)
      }
      return Promise.all(
        (await element.$$(selector)).map(async (childEl: ElementHandle) =>
          page.evaluate(
            (el: Element, subTarget: string) => el[subTarget],
            childEl,
            target,
          ),
        ),
      )
    }
    return null
  }

  public static async findMany(page: Page, selector: string, timeout = 5000) {
    if (page && selector) {
      return page.$$(selector)
    }
    throw new Error(
      'An issue occurred during element search. Has a page been instantiated?',
    )
  }
}

export default ClusterManager
