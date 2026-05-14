export function parseRouteId(id: unknown): number {
  if (id === undefined || id === null)
    throw new Error('ID invàlid')

  if (typeof id === 'string') {
    const parsedId = parseInt(id, 10)

    if (isNaN(parsedId) || parsedId < 1)
      throw new Error("ID invàlid")

    return parsedId
  }

  throw new Error("ID invàlid")
}
