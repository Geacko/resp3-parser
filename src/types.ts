import { 
    decode 
} from "./utils.ts"

/** Resp2Parser options */
export interface Resp3ParserOptions {

    /**
     *  If true, the bulk string and error 
     *  will be returned decoded. 
     *  Otherwise, a `Bulk` object will 
     *  be returned.
     *  @default true
     */
    decodeBulk?: boolean

    /**
     *  Transform all RESPv3 Verbatim 
     *  Strings
     */
    mapVerbatim?(
        x: Bulk
    ): unknown

    /**
     *  Transform all RESPv3 Maps
     */
    mapMap?(
        x: Hash
    ): unknown

    /**
     *  Transform all RESPv3 Sets
     */
    mapSet?(
        x: Unordered
    ): unknown

    /**
     *  Transform all replies with
     *  attributes
     */
    mapReplyWithAttributes?(
        x: unknown, attribs: Hash
    ): unknown

}

export type Maybe<T extends unknown> 
    = T 
    | undefined

/** Represents a RESPv2/v3 Error */
export class Failure {

    /** 
     *  Error message
     */
    readonly payload: string | Bulk
    
    /** 
     *  Failure constructor 
     */
    constructor(
        payload: string | Bulk
    ) {

        this.payload = payload
    
    }

}

/** Represents a RESPv3 Push */
export class Push<
    T extends unknown = unknown
> extends Array<T> {

    // ...

}

/** Represents a RESPv3 Unordered List (Set) */
export class Unordered<
    T extends unknown = unknown
> extends Array<T> {

    // ...

}

/** Represents a RESPv3 Hash (Map or Attributes) */
export class Hash<
    K extends unknown = unknown, 
    V extends unknown = unknown
> extends Array<[ K , V ]> {

    // ...

}

/** Represents a RESPv2/v3 Bulk */
export class Bulk {

    /**
     *  Encoding of the `Bulk`
     */
    readonly encoding: string

    /**
     *  Buffer of the `Bulk`
     */
    readonly body: Uint8Array
    
    /**
     *  Bulk constructor
     */
    constructor(
        encoding : string,
        body     : Uint8Array,
    ) {

        this.encoding = encoding
        this.body     = body

    }

    /**
     *  Returns a string containing the 
     *  text UTF-8 decoded.
     */
    decode() : string {
        return decode(this.body)
    }

}

