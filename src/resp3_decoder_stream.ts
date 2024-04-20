import type { 
    Resp3ParserOptions,
} from './types.ts'

import { 
    Resp3Parser 
} from './resp3_parser.ts'

function createTransform(
    parser: Resp3Parser
) : TransformStreamDefaultControllerTransformCallback<Uint8Array, unknown> {

    return (
        chunk, controller
    ) => {
    
        parser.appendChunk(chunk)

        let out
        while (parser.remainingBytes > 0) { 
            void 0 !== (out = parser.process()) && controller.enqueue(out)
        }
    
    }

}

/**
 *  RESP v2/v3 decoder stream
 */
export class Resp3DecoderStream extends TransformStream<Uint8Array, unknown> {

    constructor(
        opts: Resp3ParserOptions = {}
    ) {

        super({ 
            transform: createTransform(new Resp3Parser(opts)) 
        })
    
    }

}
