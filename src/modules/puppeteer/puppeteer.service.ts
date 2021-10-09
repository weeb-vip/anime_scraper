import { Injectable } from '@nestjs/common'
import puppeteer from 'puppeteer-extra'
// @ts-ignore
import * as StealthPlugin from 'puppeteer-extra-plugin-stealth'
import Recaptcha from 'puppeteer-extra-plugin-recaptcha'
import ClusterManager from './clusterManager'

@Injectable()
export class PuppeteerService {
  clusterManager: ClusterManager
  concurrency = 1
  constructor() {
    this.clusterManager = new ClusterManager()
  }

  getManager(): ClusterManager {
    return this.clusterManager
  }
  async setup(limit = 5, headless = true) {
    // @ts-ignore
    puppeteer.use(StealthPlugin())
    puppeteer.use(Recaptcha())
    await this.clusterManager.launch({
      concurrency: limit,
      puppeteer,
      headless,
    })
  }
  getStaticClusterManager(): typeof ClusterManager {
    return ClusterManager
  }
}
