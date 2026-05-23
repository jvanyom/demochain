const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'short',
	day: 'numeric'
}

const DATETIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit'
}

const fmtEn = new Intl.DateTimeFormat('en', DATE_FORMAT_OPTIONS)
const fmtCa = new Intl.DateTimeFormat('ca', DATE_FORMAT_OPTIONS)
const fmtEs = new Intl.DateTimeFormat('es', DATE_FORMAT_OPTIONS)
const dateFormatters: Record<string, Intl.DateTimeFormat> = { en: fmtEn, ca: fmtCa, es: fmtEs }

const fmtEnDt = new Intl.DateTimeFormat('en', DATETIME_FORMAT_OPTIONS)
const fmtCaDt = new Intl.DateTimeFormat('ca', DATETIME_FORMAT_OPTIONS)
const fmtEsDt = new Intl.DateTimeFormat('es', DATETIME_FORMAT_OPTIONS)
const datetimeFormatters: Record<string, Intl.DateTimeFormat> = { en: fmtEnDt, ca: fmtCaDt, es: fmtEsDt }

export function dateToUnix(date: Date): number {
	return Math.floor(date.getTime() / 1000)
}

/** Formats a UNIX-seconds timestamp in the given locale (date only). */
export function formatDate(unixSeconds: number, locale: string): string {
	try {
		return (dateFormatters[locale] ?? fmtEn).format(new Date(unixSeconds * 1000))
	} catch {
		return String(unixSeconds)
	}
}

/** Formats a UNIX-seconds timestamp with date and time in the given locale. */
export function formatDatetime(unixSeconds: number, locale: string): string {
	try {
		return (datetimeFormatters[locale] ?? fmtEnDt).format(new Date(unixSeconds * 1000))
	} catch {
		return String(unixSeconds)
	}
}
