export const PAYMONGO_API = "https://api.paymongo.com/v1"

export const payMongoAuthHeaders = () => {
    if (!process.env.PAYMONGO_SECRET_KEY) {
        throw new Error("PAYMONGO_SECRET_KEY is not set")
    }

    const token = Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString('base64')

    return `Basic ${token}`
}
