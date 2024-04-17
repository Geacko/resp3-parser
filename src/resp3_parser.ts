import { 
    BlobComposer 
} from "./blob_composer.ts"

import type {
    Reply,
    Maybe,
} from './types.ts'

import {
    Failure,
    Push,
    Hash,
    ReplyWithAttributes,
    Unordered,
    Verbatim,
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
    ';' = 0x3B,
    '?' = 0x3F,
    't' = 0x74,

}

const enum KeyWord {

    '+INF' =  'inf',
    '-INF' = '-inf',

}

type List = Array<Reply | ReplyWithAttributes>

interface Func<T> {
    (/** void */) : T
}

function createParserState() {

    const composer 
        = new BlobComposer()

    let chunk = EMPTY_BUFFER
    let count = 0
    let stack = [
        // ...
    ] as unknown[]

    /**
     *  Calls the last processor from the stack.
     *  If the stack is empty, call `proc`
     */
    function call<T>(proc: Func<T>) {
        return (stack.length ? stack.pop() as Func<T> : proc)()
    }

    /**
     *  Parse the reply
     */
    function parseReply() : Maybe<Reply | ReplyWithAttributes> {

        switch (chunk[count++] ?? 0) {

            case 0: {
                return count--, void 0
            }

            case Code[`+`]: return parseLine()
            case Code[`-`]: return parseFailure()
            case Code[`:`]: return parseInt()
            case Code[`$`]: return parseBlob()
            case Code[`*`]: return parseList()
            case Code[`_`]: return parseNil()
            case Code[`#`]: return parseBoolean()
            case Code[`,`]: return parseDouble()
            case Code[`(`]: return parseBigNumbers()
            case Code[`!`]: return parseBlobFailure()
            case Code[`=`]: return parseVerbatimString()
            case Code[`~`]: return parseUnordered()
            case Code[`%`]: return parseHash()
            case Code[`>`]: return parsePush()
            case Code['|']: return parseReplyWithAttributes()

        }

        throw new SyntaxError(
            '...'
        )

    }

    /**
     *  parse reply with attributes
     */
    function parseReplyWithAttributes() {

        const e = call(parseHash) as Hash<string, Reply>

        if (e) {

            const a = {
                // ...
            } as Record<string, Reply>
            
            // convert hash -> record
            e.forEach(([
                i, 
                x,
            ]) => a[i]= x)
            
            return parseReplyWithAttributesValue(a)
        
        }

        else {

            stack.push(
                parseReplyWithAttributes
            )

        }

    }

    /**
     *  parse reply value of the reply with attributes
     */
    function parseReplyWithAttributesValue(
        o = stack.pop() as Record<string, Reply>
    ) {

        const x = call(parseReply)

        if (x !== void 0) {

            if (x instanceof ReplyWithAttributes) {

                for (const i in o) {
                    x.attrs[i] = o[i]!
                }
                
                return x
            
            }

            return new ReplyWithAttributes(o,x)

        }

        else {

            stack.push(
                o, parseReplyWithAttributesValue
            )

        }

    }

    /**
     *  Parse simple error
     */
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

    /**
     *  Parse integer
     */
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

    /**
     *  Parse array
     */
    function parseList() {
        
        const s = call(
            parseSize
        )

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

    /**
     *  Parse null
     */
    function parseNil() {
        return count += 2, null
    }

    /**
     *  Parse boolean
     */
    function parseBoolean() {

        const x = chunk[count]

        if (x) {
            return count += 3, x == Char[`t`]
        }

        stack.push(
            parseBoolean
        )

    }

    /**
     *  Parse double
     */
    function parseDouble() {

        const x = call(
            parseAsciiLine
        )

        if (x !== void 0) {
            
            switch (x) {
                case KeyWord["+INF"] : return +Infinity
                case KeyWord["-INF"] : return -Infinity
            }

            return +x

        }

        stack.push(
            parseDouble
        )

    }

    /**
     *  Parse big int
     */
    function parseBigNumbers() {

        const x = call(parseAsciiLine)

        if (x !== void 0) {
            return BigInt(x)
        }

        stack.push(
            parseBigNumbers
        )

    }

    /**
     *  Parse bulk error
     */
    function parseBlobFailure() {

        const x = call(parseBlob)

        if (x !== void 0) {
            return new Failure(x ?? '')
        }

        stack.push(
            parseBlobFailure
        )

    }

    /**
     *  parse verbatim
     */
    function parseVerbatimString() {
        
        const x = call(parseBlob)

        if (x === void 0) {
            stack.push(parseVerbatimString)
        }

        else if (x === null) {
            return x
        }
        
        else {
            
            const i = x.indexOf(':')
            
            return new Verbatim(
                x.substring(0 , i),
                x.substring(i + 1)
            )

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
            return new Unordered()
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

    /**
     *  parse hash
     */
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

        // size with negative value -> null
        else if (s < 0) {
            return null
        }

        // NaN -> streamed
        else {
            return parseStreamedEntryList(new Hash())
        }

    }

    /**
     *  parse push
     */
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

    /**
     *  Initialize ascii line capture
     */
    function parseAsciiLine() {
        return parseAsciiLineBytes('')
    }

    /**
     *  Capture chars of an ASCII line
     */
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

        count = m - 1
        stack.push(
            o, parseAsciiLineBytes
        )

    }

    /**
     *  Capture chars of a line
     */
    function parseLine() {

        let m = count
        let x

        while ((x = chunk[m++]) && x != Char[`↲`]) {
            // ...
        }

        m--

        if (m > count) {

            composer.add(chunk.subarray(
                count, m
            ))

        }

        count = m + 2

        if (x) {
            return decode(composer.compose())
        }

        count -= 2
        stack.push(
            parseLine
        )

    }

    /**
     *  Capture [0-9]+
     */
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

        count = m - 1
        stack.push(
            i, s, parseDecimals
        )

    }

    /**
     *  Capture [0-9]+ in the case of 
     *  a number > Number.MAX_SAFE_INTEGER
     */
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

        count = m - 1
        stack.push(
            i, s, parseBigIntDecimals
        )

    }

    function parseBlob() {

        const s = call(
            parseSize
        )

        if (s === void 0) {
            return stack.push(parseBlob), void 0
        }

        // non-empty blob
        else if (s > 0) {
            return parseDecodedBlob(s)
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
            return parseChunkedBlob()
        }

    }

    function parseChunkedBlob() {

        let e

        while (chunk[count++] && (e = call(parseChunk))) {
            // ...
        }

        if (e === null) {
            return decode(composer.compose())
        }

        count--
        stack.push(
            parseChunkedBlob
        )

    }

    function parseChunk() {

        const s = call(
            parseSize
        )

        if (s === void 0) {
            return stack.push(parseChunk), void 0
        }

        else if (s > 0) {
            return parseUndecodedBlob(s)
        }

        return null

    }

    /**
     *  capture chars of a fixed-length blob or chunk
     */
    function parseDecodedBlob(
        s = stack.pop() as number
    ) {

        const m = Math.min(s, Math.max(0, chunk.byteLength - count))

        s -= m

        if (m > 0) {

            composer.add(chunk.subarray(
                count,
                count + m
            ))

        }

        count += m + 2

        if (s == 0) {
            return decode(composer.compose())
        }

        count -= 2
        stack.push(
            s, parseDecodedBlob
        )

    }

    /**
     *  capture chars of a fixed-length blob or chunk
     */
    function parseUndecodedBlob(
        s = stack.pop() as number
    ) {

        const m = Math.min(s, Math.max(0, chunk.byteLength - count))

        s -= m

        if (m > 0) {

            composer.add(chunk.subarray(
                count,
                count + m
            ))

        }

        count += m + 2

        if (s == 0) {
            return true
        }

        count -= 2
        stack.push(
            s, parseUndecodedBlob
        )

    }

    function parseEntryOrEndOfStream() {
        return chunk[count] != Char['.'] ? parseEntry() : void 0
    }

    function parseStreamedEntryList(
        o = stack.pop() as Hash
    ) {

        let e

        while (chunk[count] && void 0 !== (e = call(parseEntryOrEndOfStream))) {
            o.push(e)
        }

        if (chunk[count] == Char['.']) {
            return count += 3, o
        }

        stack.push(
            o, parseStreamedEntryList
        )

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

        stack.push(
            o, i, s, parseEntryList
        )

    }

    function parseEntry() {

        return parseExpressionList(2, 0, new Array(2)) as [ 
            Reply | ReplyWithAttributes, 
            Reply | ReplyWithAttributes 
        ] | undefined

    }

    function parseReplyOrEndOfStream() {
        return chunk[count] != Char['.'] ? parseReply() : void 0
    }

    function parseStreamedExpressionList(
        o = stack.pop() as List
    ) {

        let e

        while (chunk[count] && void 0 !== (e = call(parseReplyOrEndOfStream))) {
            o.push(e)
        }

        if (chunk[count] == Char['.']) {
            return count += 3, o
        }

        stack.push(
            o, parseStreamedExpressionList
        )

    }

    function parseExpressionList(
        s = stack.pop() as number,
        i = stack.pop() as number,
        o = stack.pop() as List
    ) {

        for (
            let e; i < s && void 0 !== (e = call(parseReply)); i++
        ) {

            o[i] = e

        }

        if (i == s) {
            return o
        }

        stack.push(
            o, i, s, parseExpressionList
        )

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

    /**
     *  Capture length
     */
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

        count -= 2
        stack.push(
            o, parseUint32
        )

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

            const bl = chunk.byteLength

            if (count < bl) {
                chunk = concat(chunk, xs)
            }
    
            else {
    
                count -= bl
                chunk  = xs
    
            }

        },

        process() {
           return call(parseReply)
        },

        stack

    } as const

}

/**
 *  ...
 */
export class Resp3Parser {

    /** ... */
    get done() : boolean {
        return true
    }

    /** ... */
    get remainingBytes() : number {
        return 0
    }

    /** ... */
    constructor() {
        
        const state = createParserState()

        Object.defineProperties(this, {

            done           : { get   : state.done },
            remainingBytes : { get   : state.remainingBytes },
            
            reset          : { value : state.reset },
            appendChunk    : { value : state.appendChunk },
            process        : { value : state.process },
        
        })

    }

    /** ... */
    reset() {
        return
    }

    /** ... */
    appendChunk(
        _: Uint8Array
    ) {

        return
    
    }

    /** ... */
    process<T extends Reply | ReplyWithAttributes>() : Maybe<T> {
        return null as Maybe<T>
    }

}
