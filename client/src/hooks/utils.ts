const INVALID_ID_MESSAGE = 'ID invàlid';

export function parseRouteId(id: unknown): number {
    if (id === undefined || id === null)
        throw new Error(INVALID_ID_MESSAGE)

    if (typeof id === 'string') {
        const parsedId = parseInt(id, 10)

        if (isNaN(parsedId) || parsedId < 1)
            throw new Error(INVALID_ID_MESSAGE)

        return parsedId
    }

    throw new Error(INVALID_ID_MESSAGE)
}
