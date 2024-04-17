/** @internal */
export const EMPTY_BUFFER = new Uint8Array(0)

/** @internal */
export const ASCII = Array.from({ length: 128 }, (_, i) => 
    String.fromCharCode(i)
)

const dec = TextDecoder.prototype.decode.bind(new TextDecoder())

/** @internal */
export function decode(chunk: Uint8Array) {

    const count 
        = chunk.byteLength

    if (count == 1) {
        return ASCII[chunk[0]!]!
    }

    else if (count < 20) {

        let o = '' ; for (
        let i = 0; 
            i < count; 
            i++
        ) {

            const x = chunk[i]!

            if (x <= 0x7E) {
                o += ASCII[x]!
            }
            
            else {
                return dec(chunk)
            }

        }

        return o

    }

    else if (count > 0) {
        return dec(chunk)
    }

    else {
        return ''
    }

}

/** @internal */
export function concat(
    a: Uint8Array,
    b: Uint8Array
) {

    const out = new Uint8Array(
        a.byteLength + 
        b.byteLength
    )

    out.set(a, 0)
    out.set(b,a.byteLength)

    return out

}
