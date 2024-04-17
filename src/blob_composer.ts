import { 
    EMPTY_BUFFER
} from "./utils.ts"

function sum(a: number, x: Uint8Array) {
    return a + x.byteLength
}

export class BlobComposer {

    private blobparts = [
        // ...
    ] as Uint8Array[]

    get size() {
        return this.blobparts.reduce(sum, 0)
    }

    get count() {
        return this.blobparts.length
    }

    add(blob: Uint8Array) {
        this.blobparts.push(blob)
    }

    clear() {

        this.blobparts = [
            // ...
        ]
    
    }

    compose() {

        const {
            count
        } = this

        if (count == 1) {
            return this.blobparts.pop()!
        }

        else
        if (count == 0) {
            return EMPTY_BUFFER
        }

        else {

            const out = new Uint8Array(this.size)

            let s = 0
            for (const x of this.blobparts) {
                out.set(x, s); s += x.byteLength
            }
    
            this.blobparts = [
                // ...
            ]
    
            return out

        }
        
    }

}
