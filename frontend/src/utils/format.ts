export function formatPrice(price: string | number | undefined | null): string {
    if (price === undefined || price === null || price === '') return ''
    const num = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(num)) return ''
    if (num === 0) return 'Free'

    // If price is very small (per token), convert to per 1M tokens
    if (num < 0.01) {
        const perMillion = num * 1000000
        return `$${perMillion.toFixed(2)} / 1M`
    }

    return `$${num.toFixed(4)}`
}

export function formatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null) return ''
    return num.toLocaleString()
}
