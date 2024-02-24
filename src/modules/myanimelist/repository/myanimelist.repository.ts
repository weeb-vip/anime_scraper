import { Between, EntityRepository, LessThanOrEqual, Repository } from 'typeorm'
import * as _ from 'lodash'
import { IMyanimelist, RECORD_TYPE } from './interface'
import { MyanimelistLinks } from './myanimelist.entity'

@EntityRepository(MyanimelistLinks)
export class MyanimelistlinkRepository extends Repository<MyanimelistLinks> {
  public async findOneById(id: number): Promise<IMyanimelist> {
    const item: MyanimelistLinks = await this.findOne({
      where: { id },
    })

    return item
      ? {
          id: item.id,
          name: item.name,
          type: item.type,
          link: item.link,
          updatedAt: item.updatedAt,
        }
      : null
  }

  async findOneByName(name: string): Promise<IMyanimelist> {
    const item: MyanimelistLinks = await this.findOne({ where: { name } })

    return item
      ? {
          id: item.id,
          name: item.name,
          type: item.type,
          link: item.link,
          updatedAt: item.updatedAt,
        }
      : null
  }

  public async upsert(body: Partial<MyanimelistLinks>): Promise<IMyanimelist> {
    // eslint-disable-next-line
    let nullFields: readonly string[] = Object.keys(body).reduce(
      (empty: readonly string[], key: string) =>
        !body[key] ? empty.concat(key) : empty,
      [],
    )
    // eslint-disable-next-line
    let cleanBody: MyanimelistLinks = _.omit(
      body,
      nullFields,
    ) as MyanimelistLinks
    // eslint-disable-next-line
    let savedLink: MyanimelistLinks = await this.findOne({
      name: cleanBody.name,
      type: cleanBody.type,
    })
    if (savedLink) {
      await this.update({ id: savedLink.id }, cleanBody)
      const link = { ...savedLink, ...cleanBody }
      return {
        id: link.id,
        name: link.name,
        type: link.type,
        link: link.link,
        updatedAt: link.updatedAt,
      }
    }

    // eslint-disable-next-line
    let newUserData: MyanimelistLinks = this.create(cleanBody)
    const saved: MyanimelistLinks = await this.save(newUserData)
    newUserData = null
    cleanBody = null
    nullFields = null
    savedLink = null
    return {
      id: saved.id,
      name: saved.name,
      type: saved.type,
      link: saved.link,
      updatedAt: saved.updatedAt,
    }
  }

  async getAllAnime(): Promise<IMyanimelist[]> {
    const links: MyanimelistLinks[] = await this.find({
      where: {
        type: RECORD_TYPE.Anime,
      },
    })
    return links.map((link: MyanimelistLinks) => ({
      id: link.id,
      name: link.name,
      type: link.type,
      link: link.link,
      updatedAt: link.updatedAt,
    }))
  }

  async getAllNewAnime(): Promise<IMyanimelist[]> {
    // current date
    const today = new Date()
    // today minus 1 day
    const yesterday = new Date(
      new Date(today).setDate(today.getDate() - 1),
    ).toISOString()

    const links: MyanimelistLinks[] = await this.find({
      where: {
        type: RECORD_TYPE.Anime,
        // created at is between yesterday and today
        createdAt: Between(yesterday, today.toISOString()),
      },
    })
    return links.map((link: MyanimelistLinks) => ({
      id: link.id,
      name: link.name,
      type: link.type,
      link: link.link,
      updatedAt: link.updatedAt,
    }))
  }
}
