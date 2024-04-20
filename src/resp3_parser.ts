import { 
    BlobComposer 
} from "./blob_composer.ts"

import type {
    Maybe,
    Resp3ParserOptions,
} from './types.ts'

import {
    Failure,
    Push,
    Hash,
    Unordered,
    Bulk,
    ReplyWithAttributes,
} from './types.ts'

import { 
    concat,
    decode,
    EMPTY_BUFFER,
    ASCII,
} from './utils.ts'

const enum Code {

    '+' = 0x2B,
    '-' = 0x2D,
    ':' = 0x3A,
    '$' = 0x24,
    '*' = 0x2A,
    '_' = 0x5F,
    '#' = 0x23,
    ',' = 0x2C,
    '(' = 0x28,
    '!' = 0x21,
    '=' = 0x3D,
    '%' = 0x25,
    '~' = 0x7E,
    '>' = 0x3E,
    '|' = 0x7C,

}

const enum Char {

    '↲' = 0x0D,
    '+' = 0x2B,
    '-' = 0x2D,
    '.' = 0x2E,
    'Ø' = 0x30,
    ':' = 0x3A,
    ';' = 0x3B,
    '?' = 0x3F,
    't' = 0x74,

}

const enum KeyWord {

    '+INF' =  'inf',
    '-INF' = '-inf',

}

interface Func<T> {
    (/** void */) : T
}

function createParserState({
    decodeBulk = true, mapMap, mapSet, mapReplyWithAttributes, decodeVerbatim
} : Resp3ParserOptions) {

    const composer 
        = new BlobComposer()

    let chunk = EMPTY_BUFFER
    let count = 0
    let stack = [
        // ...
    ] as unknown[]

    const parseMap 
        = mapMap 
        ? parseMappedHash 
        : parseHash

    const parseSet 
        = mapSet 
        ? parseMappedUnordered 
        : parseUnordered

    function call<T>(proc: Func<T>) {
        return (stack.length ? stack.pop() as Func<T> : proc)()
    }

    function parseReply() : Maybe<unknown> {

        switch (chunk[count++] ?? 0) {

        //  ------------------------------------------------------
        //  > EOF
        //  ------------------------------------------------------
            case 0: return count--, void 0
        //  ------------------------------------------------------

        //  ------------------------------------------------------
        //  > Value
        //  ------------------------------------------------------
            case Code[`+`]: return parseLine()
            case Code[`-`]: return parseFailure()
            case Code[`:`]: return parseInt()
            case Code[`$`]: return parseBulk()
            case Code[`*`]: return parseList()
            case Code[`_`]: return parseNil()
            case Code[`#`]: return parseBoolean()
            case Code[`,`]: return parseDouble()
            case Code[`(`]: return parseBigNumbers()
            case Code[`!`]: return parseBulkFailure()
            case Code[`=`]: return parseVerbatimString()
            case Code[`~`]: return parseSet()
            case Code[`%`]: return parseMap()
            case Code[`>`]: return parsePush()
            case Code[`|`]: return parseReplyWithAttributes()
        //  ------------------------------------------------------

        //  ------------------------------------------------------
        //  > Error
        //  ------------------------------------------------------
            default: throw new SyntaxError(
                'Unexpected char "' + String.fromCharCode(chunk[--count]!) + '"'
            )
        //  ------------------------------------------------------

        }

    }

    function parseReplyWithAttributes() {

        const x = call(parseHash)
        
        if (x !== void 0) {
            return parseReplyWithAttributesPayload(x)
        }

        else {

            stack.push(
                parseReplyWithAttributes
            )
        
        }

    }

    function parseReplyWithAttributesPayload(
        o = stack.pop() as Hash | null
    ) {

        let x = call(parseReply)
        
        if (x !== void 0) {

            // something wrong here...
            if (o === null) {
                return x
            }

            // We remove nested attributes
            x = x instanceof ReplyWithAttributes 
              ? x.value 
              : x

            const out = new ReplyWithAttributes(o, x)

            return mapReplyWithAttributes 
                 ? mapReplyWithAttributes(out) 
                 : out
        
        }

        else {

            stack.push(
                o, parseReplyWithAttributesPayload
            )

        }

    }

    function parseFailure() {

        const x = call(parseLine)
        
        if (x !== void 0) {
            return new Failure(x)
        }

        else {

            stack.push(
                parseFailure
            )

        }

    }

    function parseInt() {

        const x = chunk[count]
        
        if (x === void 0) {
            stack.push(parseInt)
        }

        // shortcut for 0
        else if (x == Char[`Ø`]) {
            return count += 3, 0
        }

        // unsigned int
        else if (
            x != Char[`+`] &&
            x != Char[`-`]
        ) {

            return parseDecimals(+1, 0)
        
        }

        // signed int
        else {

            return count++, parseDecimals(
                x == Char[`+`] ? +1 : -1, 0
            )

        }

    }

    function parseList() {

        const s = call(parseSize)
        
        if (s === void 0) {
            stack.push(parseList)
        }

        // non-empty array
        else if (s > 0) {
            return parseExpressionList(s, 0, new Array(s))
        } 
        
        // empty array
        else if (s == 0) {
            return []
        } 
        
        // array with negative size -> null
        else if (s < 0) {
            return null
        }
        
        // size is NaN -> streamed
        else {
            return parseStreamedExpressionList([])
        }

    }

    function parseNil() {
        return count += 2, null
    }

    function parseBoolean() {

        const x = chunk[count]
        
        if (x) {
            return count += 3, x == Char[`t`]
        }

        else  {

            stack.push(
                parseBoolean
            )

        }

    }

    function parseDouble() {

        const x = call(parseAsciiLine)
        
        if (x !== void 0) {

            switch (x) {
                case KeyWord["+INF"] : return +Infinity
                case KeyWord["-INF"] : return -Infinity
            }

            return +x

        }

        else {

            stack.push(
                parseDouble
            )

        }

    }

    function parseBigNumbers() {

        const x = call(parseAsciiLine)
        
        if (x !== void 0) {
            return BigInt(x)
        }

        else {

            stack.push(
                parseBigNumbers
            )

        }

    }

    function parseBulk() {

        const x = call(parseBlob)
        
        if (x === null) {
            return x
        }

        else if (x) {
            return decodeBulk ? decode(x) : new Bulk('', x)
        }

        else {

            stack.push(
                parseBulk
            )

        }

    }

    function parseBulkFailure() {

        const x = call(parseBlob)
        
        if (x !== void 0) {
            return new Failure(x ? decodeBulk ? decode(x) : new Bulk('', x) : '')
        }

        else {

            stack.push(
                parseBulkFailure
            )

        }

    }

    function parseVerbatimString() {

        const b = call(parseBlob)
        
        if (b === void 0) {
            stack.push(parseVerbatimString)
        }

        else if (b === null) {
            return b
        }

        else {

            const {
                byteLength: count
            } = b

            let e = ''
            let i = 0
            let x
            
            // We assume that the encoding part is ASCII and small
            while (i < count && (x = b[i++]!) != Char[':']) {
                e += ASCII[x]        
            }

            // something is wrong ...
            if (i === count) {
                return decodeBulk ? decode(b) : new Bulk(e, b)
            }

            else {

                const out = new Bulk(
                    e, 
                    b.subarray(i)
                )
    
                return decodeVerbatim 
                     ? decodeVerbatim(out) 
                     : out

            }

        }

    }

    function parseMappedHash() {

        const x = call(parseHash)
        
        if (x !== void 0) {
            return x ? mapMap!(x) : x
        }

        else {

            stack.push(
                parseMappedHash
            )
        
        }

    }

    function parseMappedUnordered() {

        const x = call(parseUnordered)
        
        if (x !== void 0) {
            return x ? mapSet!(x) : x
        }

        else {

            stack.push(
                parseMappedUnordered
            )
        
        }

    }

    function parseUnordered() {

        const s = call(parseSize)
        
        if (s === void 0) {
            stack.push(parseUnordered)
        }
        
        // non-empty set
        else if (s > 0) {
            return parseExpressionList(s, 0, new Unordered(s))
        }
        
        // empty set
        else if (s == 0) {
            return new Unordered()
        }
        
        // set with negative size -> null
        else if (s < 0) {
            return null
        }
        
        // NaN -> streamed
        else {
            return parseStreamedExpressionList(new Unordered())
        }

    }

    function parseHash() {

        const s = call(parseSize)
        
        if (s === void 0) {
            stack.push(parseHash)
        }
        
        // non-empty hash
        else if (s > 0) {
            return parseEntryList(s, 0, new Hash(s))
        }
        
        // empty hash
        else if (s == 0) {
            return new Hash()
        }
        
        // hash with negative value -> null
        else if (s < 0) {
            return null
        }
        
        // NaN -> streamed
        else {
            return parseStreamedEntryList(new Hash())
        }

    }

    function parsePush() {

        const s = call(parseSize)
        
        if (s === void 0) {
            stack.push(parsePush)
        }
        
        // non-empty push
        else if (s > 0) {
            return parseExpressionList(s, 0, new Push(s))
        }
        
        // empty push
        else if (s == 0) {
            return new Push(0)
        }
        
        // push with negative value -> null
        else if (s < 0) {
            return null
        }
        
        // NaN -> streamed
        else {
            return parseStreamedExpressionList(new Push())
        }

    }

    function parseAsciiLine() {
        return parseAsciiLineBytes('')
    }

    function parseAsciiLineBytes(
        o = stack.pop() as string
    ) {

        let m = count
        let x

        // We assume it's a small line
        while ((x = chunk[m++]) && x != Char[`↲`]) {
            o += ASCII[x]
        }

        count = m + 1

        if (x) {
            return o
        }

        else {

            count = m - 1
            stack.push(
                o, parseAsciiLineBytes
            )

        }

    }

    function parseLine() {

        let m = count
        let x

        while ((x = chunk[m]) && x != Char[`↲`]) {
            m++
        }

        m > count &&
        composer.add(chunk.subarray(
            count, m
        ))

        count = m + 2

        if (x) {
            return decode(composer.compose())
        }

        else {

            count -= 2
            stack.push(
                parseLine
            )

        }

    }

    function parseDecimals(
        s = stack.pop() as number,
        i = stack.pop() as number,
    ) {

        let x
        let m = count
        let t = i

        while ((x = chunk[m++]) && x != Char[`↲`]) {

            t *= 10
            t -= 48 - x

            if (t >= Number.MAX_SAFE_INTEGER) {
                return count = m, parseBigIntDecimals(s, 10n * BigInt(i) + BigInt(x - 48))
            }

            i = t

        }

        if (x) {
            return count = m + 1, s * i
        }

        else {

            count = m - 1
            stack.push(
                i, s, parseDecimals
            )

        }

    }

    function parseBigIntDecimals(
        s = stack.pop() as number,
        i = stack.pop() as bigint,
    ) {

        let x
        let m = count

        while ((x = chunk[m++]) && x != Char[`↲`]) {

            i *= 10n
            i -= 48n - BigInt(x)
        
        }

        if (x) {
            return count = m + 1, s < 0 ? -i : i
        }

        else {

            count = m - 1
            stack.push(
                i, s, parseBigIntDecimals
            )

        }

    }

    function parseBlob() {

        const s = call(parseSize)

        if (s === void 0) {
            stack.push(parseBlob)
        }
        
        // non-empty blob
        else if (s > 0) {
            return parseDecodedBlob(s)
        }
        
        // empty blob
        else if (s == 0) {
            return count += 2, EMPTY_BUFFER
        }
        
        // negative size -> null
        else if (s < 0) {
            return null
        }
        
        // NaN -> chunked
        else {
            return parseChunkedBlob()
        }

    }

    function parseChunkedBlob() {

        let e

        while ((e = call(captureChunk))) {
            // ...
        }

        if (e === null) {
            return composer.compose()
        }

        else {

            stack.push(
                parseChunkedBlob
            )

        }

    }

    function parseDecodedBlob(
        s = stack.pop() as number
    ) {

        const m = Math.min(s, Math.max(0, chunk.byteLength - count))
        
        s -= m

        m > 0 && 
        composer.add(chunk.subarray(
            count,
            count + m
        ))

        count += m + 2

        if (s == 0) {
            return composer.compose()
        }

        else {

            count -= 2
            stack.push(
                s, parseDecodedBlob
            )

        }

    }

    function parseEntryInStream() {
        return chunk[count] != Char['.'] ? parseEntry() : void 0
    }

    function parseStreamedEntryList(
        o = stack.pop() as Hash
    ) {

        let e

        while (chunk[count] && void 0 !== (e = call(parseEntryInStream))) {
            o.push(e)
        }

        // End of stream
        if (chunk[count] == Char['.']) {
            return count += 3, o
        }

        else {

            stack.push(
                o, parseStreamedEntryList
            )

        }

    }

    function parseEntryList(
        s = stack.pop() as number,
        i = stack.pop() as number,
        o = stack.pop() as Hash
    ) {

        for (
            let e; i < s && void 0 !== (e = call(parseEntry)); i++
        ) {

            o[i] = e

        }

        if (i == s) {
            return o
        }

        else {

            stack.push(
                o, i, s, parseEntryList
            )

        }

    }

    function parseEntry() {
        return parseExpressionList(2, 0, new Array(2)) as [ unknown, unknown ] | undefined
    }

    function parseReplyInStream() {
        return chunk[count] != Char['.'] ? parseReply() : void 0
    }

    function parseStreamedExpressionList(
        o = stack.pop() as unknown[]
    ) {

        let e

        while (chunk[count] && void 0 !== (e = call(parseReplyInStream))) {
            o.push(e)
        }

        if (chunk[count] == Char['.']) {
            return count += 3, o
        }

        else {

            stack.push(
                o, parseStreamedExpressionList
            )

        }

    }

    function parseExpressionList(
        s = stack.pop() as number,
        i = stack.pop() as number,
        o = stack.pop() as unknown[]
    ) {

        for (
            let e; i < s && void 0 !== (e = call(parseReply)); i++
        ) {

            o[i] = e

        }

        if (i == s) {
            return o
        }

        else {

            stack.push(
                o, i, s, parseExpressionList
            )

        }

    }

    function parseSize() {

        const x = chunk[count]
        
        // streamed -> NaN
        if (x == Char['?']) {
            return count += 3, NaN
        }
        
        // shortcut for 0
        else if (x == Char['Ø']) {
            return count += 3, 0
        }
        
        // "-1"
        else if (x == Char['-']) {
            return count += 4, -1
        }
        
        else if (x) {
            return parseUint32(0)
        }
        
        else {

            stack.push(
                parseSize
            )

        }

    }

    function parseUint32(
        o = stack.pop() as number
    ) {

        let x
        let m = count

        // We assume that `i` will be less than `Number.MAX_SAFE_INTEGER`
        while ((x = chunk[m++]) && x != Char[`↲`]) {
            
            o *= 10
            o -= 48 - x

        }

        count = m + 1

        if (x) {
            return o
        }

        else {

            count -= 2
            stack.push(
                o, parseUint32
            )

        }

    }

    function captureChunk() {

        // We skip ";"
        return ++count && captureChunkBytes()
    
    }

    function captureChunkBytes() {

        const s = call(parseSize)
        
        if (s === void 0) {
            stack.push(captureChunkBytes)
        }

        // non-empty chunk
        else if (s > 0) {
            return captureUndecodedBlob(s)
        }

        // end
        else {
            return null
        }

    }

    function captureUndecodedBlob(
        s = stack.pop() as number
    ) {

        const m = Math.min(s, Math.max(0, chunk.byteLength - count))
        
        s -= m

        m > 0 && 
        composer.add(chunk.subarray(
            count,
            count + m
        ))

        count += m + 2

        if (s == 0) {
            return true
        }

        else {

            count -= 2
            stack.push(
                s, captureUndecodedBlob
            )

        }

    }

    return {

        remainingBytes() {
            return chunk.byteLength - count
        },

        done() {
            return chunk.byteLength - count == 0 && stack.length == 0
        },

        reset() {

            chunk = EMPTY_BUFFER
            count = 0
            stack = [
                // ...
            ]
            composer.clear()

        },

        appendChunk(xs: Uint8Array) {

            const bs = chunk.byteLength

            if (count < bs) {
                chunk = concat(chunk, xs)
            }

            else {
                count -= bs
                chunk  = xs
    
            }

        },

        process() {
           return call(parseReply)
        },

    } as const

}

/**
 *  ...
 */
export class Resp3Parser {

    /**
     *  returns `true` if the buffer is empty and the 
     *  response has been completely parsed
     */
    get done() : boolean {
        return true
    }

    /**
     *  Returns the number of bytes remaining in the 
     *  buffer to process. 
     *  This number can be negative.
     */
    get remainingBytes() : number {
        return 0
    }

    /**
     *  Create a new parser.
     * 
     *  **Example**
     *  ```ts
     *  // create 2 responses packed into one
     *  const blob = new TextEncoder().encode('+Welcome, this is a test...\r\n:1234\r\n')
     *  
     *  // create the parser
     *  const parser = new ChunkedParser()
     *  
     *  // append a chunk "+Welcome"
     *  parser.appendChunk(blob.subarray(0, 8))
     *  
     *  // parsing failed
     *  console.log(parser.process())   // undefined
     *  
     *  // append a new chunk ", this is a test...\r\n:1234\r\n"
     *  parser.appendChunk(blob.subarray(8))
     *  
     *  // return the first response
     *  console.log(parser.process())   // "Welcome, this is a test..."
     *  
     *  // return the second response
     *  console.log(parser.process())   // 1234
     *  ```
     */
    constructor(
        opts: Resp3ParserOptions = {}
    ) {

        const state = createParserState(opts)
        
        Object.defineProperties(this, {
            done           : { get   : state.done },
            remainingBytes : { get   : state.remainingBytes },
            reset          : { value : state.reset },
            appendChunk    : { value : state.appendChunk },
            process        : { value : state.process },
        })

    }

    /**
     *  Resets parser state.
     */
    reset() {
        return
    }

    /**
     *  Add a new chunk to the buffer.
     */
    appendChunk(
        // deno-lint-ignore no-unused-vars
        chunk: Uint8Array
    ) {

        return
    
    }

    /**
     *  Try to parse the buffer. if successful, returns 
     *  the parsed response. 
     *  Otherwise, returns `undefined`.
     */
    process<T>() : Maybe<T> {
        return null as Maybe<T>
    }

}
