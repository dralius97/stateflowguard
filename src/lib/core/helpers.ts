import crypto from 'crypto'

export class Helpers {
    public isObject(obj: unknown): boolean {
        return Object.prototype.toString.call(obj) === '[object Object]'
    }
    public hash(str: string): string {
        const hash = crypto.createHash("sha1").update(str).digest("hex");
        return hash
    }
    public cannonizeObject(obj: Record<string, unknown>): Record<string, unknown> {
        return Object.keys(obj).sort().reduce((acc: Record<string, unknown>, key: string) => {
            acc[key] = obj[key]
            return acc
        }, {})
    }
}