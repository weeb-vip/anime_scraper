import { format } from 'winston'
import * as colors from 'colors'
import { format as formatDate } from 'date-fns'

// One colour per level, so a single console transport can do what four used to.
//
// The four existed to colour by level -- warn yellow, info blue, error red,
// debug magenta -- but a winston transport emits every level at or below its
// own, so an info line was printed by both the info and the debug transport and
// a warning by three of them. Every scraper log line came out two to four
// times, which also made "how far along is the run" unanswerable by counting.
const LEVEL_COLORS: Record<string, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'blue',
  debug: 'magenta',
}

export const alignColorsAndTime = (service: string, color?: string) =>
  format.combine(
    format.printf((info) => {
      // date-fns is case-sensitive in a way that bit this: MM is the month and
      // SS is fractional seconds, so 'HH:MM:SS' printed the hour, the month and
      // a fraction -- every line in September read 07:09:60. Minutes are mm and
      // seconds are ss.
      const timestamp: string = formatDate(new Date(), 'yy-MM-dd HH:mm:ss')
      const paint = colors[color || LEVEL_COLORS[info.level] || 'yellow']

      return (
        colors.green(`[Scraper] - ${timestamp}\t`) +
        paint(`${info.level.toUpperCase()} [${service}] ${info.message}`)
      )
    }),
  )
