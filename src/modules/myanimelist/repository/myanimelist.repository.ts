import { Between, EntityRepository, LessThanOrEqual, Repository } from 'typeorm'
import * as _ from 'lodash'
import { IMyanimelist, RECORD_TYPE } from './interface'
import { MyanimelistLinks } from './myanimelist.entity'
import {da} from "date-fns/locale";

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
          animeId: item.animeId,
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
          animeId: item.animeId,
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
    // Match on the link first.
    //
    // This matched on name+type first and fell back to the link, which made a
    // retitled entry a new row rather than an update: MAL lists the same URL as
    // "Kikou Ryouhei Merowlink", "Kikou Ryouhei Mellowlink" and "Armor Hunter
    // Mellowlink", and production ended up with all three. 485 links were
    // duplicated that way across 971 rows, and 399 of those rows never resolved
    // to an anime.
    //
    // The link is the identity here -- one MAL URL is one record, which is what
    // the unique index added alongside this asserts. The name is a label on it
    // and changes freely.
    // eslint-disable-next-line
    let savedLink: MyanimelistLinks = await this.findOne({
      where: { link: cleanBody.link },
    })
    if (!savedLink) {
      savedLink = await this.findOne({
        where: { name: cleanBody.name, type: cleanBody.type },
      })
    }

    if (savedLink) {
      await this.update({ id: savedLink.id }, cleanBody)
      const link = { ...savedLink, ...cleanBody }
      return {
        id: link.id,
        name: link.name,
        type: link.type,
        link: link.link,
        animeId: link.animeId,
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
      animeId: saved.animeId,
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
      animeId: link.animeId,
      updatedAt: link.updatedAt,
    }))
  }

  async getAllNewAnime(days: number = 1): Promise<IMyanimelist[]> {
    // current date
    const today = new Date()
    if (days < 1) days = 1

    // today minus 1 day
    const yesterday = new Date(
      new Date(today).setDate(today.getDate() - days),
    ).toISOString()
console.log(yesterday, today.toISOString())

    const links: MyanimelistLinks[] = await this.find({
      where: {
        type: RECORD_TYPE.Anime,
        // created at is between yesterday and today
        createdAt: Between(yesterday, today.toISOString()),
      },
    })
    console.log(links)
    return links.map((link: MyanimelistLinks) => ({
      id: link.id,
      name: link.name,
      type: link.type,
      link: link.link,
      animeId: link.animeId,
      updatedAt: link.updatedAt,
    }))
  }
}
