import { 
    EMPTY_BUFFER
} from "./utils.ts"

function sum(a: number, x: Uint8Array) {
    return a + x.byteLength
}

/** @internal */
export class BlobComposer {

    /**
     *  Blob parts
     */
    private parts = [
        // ...
    ] as Readonly<Uint8Array>[]

    /**
     *  Blob size in bytes
     */
    get size() {
        return this.parts.reduce(sum, 0)
    }

    /**
     *  Number of parts
     */
    get count() {
        return this.parts.length
    }

    /**
     *  Add a new part
     */
    add(blob: Readonly<Uint8Array>) {
        this.parts.push(blob)
    }

    /**
     * Clear the Blob
     */
    clear() {

        this.parts = [
            // ...
        ]

    }

    /**
     *  Concatenates all parts into one
     */
    compose() : Readonly<Uint8Array> {

        const {
            count
        } = this

        if (count == 1) {
            return this.parts.pop()!
        }

        else
        if (count == 0) {
            return EMPTY_BUFFER
        }

        else {

            const out = new Uint8Array(this.size)

            let s = 0
            for (const x of this.parts) {
                out.set(x, s); s += x.byteLength
            }
    
            this.parts = [
                // ...
            ]
    
            return out

        }
        
    }

}
