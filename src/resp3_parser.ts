import { 
    BlobComposer 
} from "./blob_composer.ts"

import type {
    Maybe,
    Resp3ParserOptions
} from './types.ts'

import {
    Failure,
    Push,
    Hash,
    Unordered,
    Bulk,
    FormatedBulk,
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
    decodeBulk = true, enableResp3 = true, map
} : Resp3ParserOptions) {

    const composer 
        = new BlobComposer()

    let chunk = EMPTY_BUFFER
    let count = 0
    let stack = [
        // ...
    ] as unknown[]
    
    function call<T>(proc: Func<T>) {
        return (stack.length ? stack.pop() as Func<T> : proc)()
    }

    function parseResp2Unmapped() : Maybe<unknown> {

        switch (chunk[count++]) {

            case void 0: {
                return count--, void 0
            }

            case Code[`+`]: return parseLine()
            case Code[`-`]: return parseFailure()
            case Code[`:`]: return parseInt()
            case Code[`$`]: return parseBulk()
            case Code[`*`]: return parseList()

        }

        throw new SyntaxError()

    }

    function parseResp3Unmapped() : Maybe<unknown> {

        switch (chunk[count++]) {

            case void 0: {
                return count--, void 0
            }

            case Code[`+`]: return parseLine()
            case Code[`-`]: return parseFailure()
            case Code[`:`]: return parseInt()
            case Code[`$`]: return parseBulk()
            case Code[`*`]: return parseList()
            case Code[`~`]: return parseUnordered()
            case Code[`%`]: return parseHash()
            case Code[`_`]: return parseNil()
            case Code[`#`]: return parseBoolean()
            case Code[`,`]: return parseDouble()
            case Code[`(`]: return parseBigNumbers()
            case Code[`!`]: return parseBulkFailure()
            case Code[`>`]: return parsePush()
            case Code[`=`]: return parseFormatedBulk()
            case Code[`|`]: return parseAttributes()

        }

        throw new SyntaxError()

    }

    function hasAttributes(
        x: unknown
    ) : x is { attributes: Hash, reply: unknown } {

        return (x as { attributes: unknown }).attributes !== void 0
    
    }

    function parseResp2Mapped() {

        const x = call(parseResp2Unmapped)

        if (x !== void 0) {
            return map!(x)
        }

        else {

            stack.push(
                parseResp2Mapped
            )
        
        }

    }

    function parseResp3Mapped() {

        const x = call(parseResp3Unmapped)

        if (x !== void 0) {

            return hasAttributes(x) 
                 ? map!(x.reply, x.attributes) 
                 : map!(x)

        }

        else {

            stack.push(
                parseResp3Mapped
            )
        
        }

    }

    const parse 
        = map ? enableResp3 ? parseResp3Mapped   : parseResp2Mapped 
              : enableResp3 ? parseResp3Unmapped : parseResp2Unmapped 

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

    function parseNil() {
        return count += 2, null
    }

    function parseBoolean() {

        const x = chunk[count]

        if (x) {
            return count += 3, x == Char[`t`]
        }

        else {

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

        const x = call(captureBlob)

        if (x !== void 0) {
            return x ? decodeBulk ? decode(x.compose()) : new Bulk(x.compose()) : x
        }

        else {

            stack.push(
                parseBulk
            )

        }

    }

    function parseBulkFailure() {

        const x = call(captureBlob)

        if (x !== void 0) {
            return new Failure(x ? decode(x.compose()) : '')
        }

        else {

            stack.push(
                parseBulkFailure
            )

        }

    }

    function parseFormatedBulk() {
     
        const x = call(captureBlob)

        if (x !== void 0) {
            
            if (x) {
                
                const t = x.compose()
                const k
                    = ASCII[t[0]!]!
                    + ASCII[t[1]!]!
                    + ASCII[t[2]!]!

                return new FormatedBulk(
                    t.subarray(4), k
                )

            }
            
            else {
                return x
            }

        }

        else {

            stack.push(
                parseFormatedBulk
            )

        }

    }

    function parseExpressionList<T extends Array<unknown>>(
        s = stack.pop() as number,
        i = stack.pop() as number,
        o = stack.pop() as T
    ) {

        for (
            let e; i < s && void 0 !== (e = call(parse)); i++
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

    function parseEntry() {
        return parseExpressionList(2, 0, new Array(2)) as [ unknown , unknown ] | undefined
    }

    function parseStreamedEntry() {
        return chunk[count] != Char['.'] ? parseEntry() : void 0
    }

    function parseStreamedEntryList(
        o = stack.pop() as Hash
    ) {

        let e

        while (chunk[count] && void 0 !== (e = call(parseStreamedEntry))) {
            o.push(e)
        }

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

            const [
                k,
                x,
            ] = e

            o[i] = [ 
                k instanceof Bulk ? k.decode() : k , 
                x 
            ]

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

    function parseStreamedReply() {
        return chunk[count] != Char['.'] ? parse() : void 0
    }

    function parseStreamedExpressionList<T extends Array<unknown>>(
        o = stack.pop() as T
    ) {

        let e

        while (chunk[count] && void 0 !== (e = call(parseStreamedReply))) {
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

    function parseList() {
        
        const s = call(parseSize)

        if (s === void 0) {
            stack.push(parseList)
        } 
        
        // non-empty array
        else if (s > 0) {
            return parseExpressionList(s, 0, new Array<unknown>(s))
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
            return parseStreamedExpressionList([] as unknown[])
        }

    }

    function parseUnordered() {

        const s = call(parseSize)

        if (s === void 0) {
            stack.push(parseUnordered)
        }

        // non-empty hash
        else if (s > 0) {
            return parseExpressionList(s, 0, new Unordered(s))
        }

        // empty hash
        else if (s == 0) {
            return new Unordered(0)
        }

        // size with negative value -> null
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
            return new Hash(0)
        }

        // size with negative value -> null
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

        // size with negative value -> null
        else if (s < 0) {
            return null
        }

        // NaN -> streamed
        else {
            return parseStreamedExpressionList(new Push())
        }

    }

    function parseAttributes() {

        const x = call(parseHash)

        if (x !== void 0) {
            return x ? parseWithAttributes(x) : parseResp3Unmapped()
        }

        else {

            stack.push(
                parseAttributes
            )

        }

    }

    function parseWithAttributes(
        o = stack.pop() as Hash
    ) {

        const x = call(parseResp3Unmapped)

        if (x !== void 0) {
            return hasAttributes(x) ? x : { attributes: o, reply: x }
        }

        else {

            stack.push(
                o, parseWithAttributes
            )

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

    function captureBlob() {

        const s = call(parseSize)

        if (s === void 0) {
            stack.push(captureBlob)
        }

        // non-empty blob
        else if (s > 0) {
            return captureUncomposedBlob(s)
        }

        // empty blob
        else if (s == 0) {
            return count += 2, ''
        }

        // negative size -> null
        else if (s < 0) {
            return null
        }

        // NaN -> chunked
        else {
            return captureChunkedBlob()
        }

    }

    function captureUncomposedBlob(
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
            return composer
        }

        else {

            count -= 2
            stack.push(
                s, captureUncomposedBlob
            )

        }

    }

    function captureChunkedBlob() {
        
        let e
        while ((e = call(captureChunk))) {
            // ...
        }

        if (e !== void 0) {
            return count -= 2, composer
        }

        else {

            stack.push(
                captureChunkedBlob
            )

        }

    }

    function captureChunk() {
        return ++count, captureBlob()
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

        appendChunk(x: Uint8Array) {

            const s = chunk.byteLength

            if (count < s) {
                chunk = concat(chunk, x)
            }
    
            else {
    
                count -= s
                chunk  = x
    
            }

        },

        process() {
           return call(parse)
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
     *  const parser = new Resp3Parser()
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
