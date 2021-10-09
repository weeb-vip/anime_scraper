import { format } from 'winston'
import * as colors from 'colors'
import { format as formatDate } from 'date-fns'

export const alignColorsAndTime = (service, color?) =>
  format.combine(
    format.printf(
      (info) =>
        colors.green(
          `[Scraper] - ${formatDate(new Date(), 'yy-MM-dd HH:MM:SS')}\t`,
        ) +
        colors[color || 'yellow'](
          `${info.level.toUpperCase()} [${service}] ${info.message}`,
        ),
    ),
  )
