import * as z from 'zod'

const ALGORAND_ADDR_RE = /^[A-Z2-7]{58}$/

declare const addressBrand: unique symbol
export type Address = string & { readonly [addressBrand]: true }

export const addressSchema = z
	.string()
	.trim()
	.regex(ALGORAND_ADDR_RE, { message: 'address.invalid' })
	// oxlint-disable-next-line no-unsafe-type-assertion
	.transform((addressString): Address => addressString as Address)

export function isAddress(value: string): value is Address {
	return ALGORAND_ADDR_RE.test(value.trim())
}

export function asAddress(value: string): Address {
	return addressSchema.parse(value)
}

export function parseAddressList(text: string): { valid: Address[]; invalid: string[] } {
	const lines = text.split(/[\r\n]+/).filter(line => line.trim())

	const valid: Address[] = []
	const invalid: string[] = []

	const validSet = new Set<Address>()

	for (const line of lines) {
		const tokens = line.split(/[,;\t]+/).flatMap(t => {
			const trimmed = t.trim()
			return trimmed ? [trimmed] : []
		})

		const [addr] = tokens

		if (!addr) continue

		if (isAddress(addr)) {
			if (!validSet.has(addr)) {
				valid.push(addr)
				validSet.add(addr)
			}
		} else invalid.push(addr)
	}

	return { valid, invalid }
}
