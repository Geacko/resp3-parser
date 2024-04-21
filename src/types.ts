import { 
    decode 
} from "./utils.ts"

/** Resp2Parser options */
export interface Resp3ParserOptions {

    /**
     *  If true, all RESP3 bulk strings that are 
     *  not a key of a `Hash` will be returned 
     *  decoded. Otherwise, a `Bulk` object will 
     *  be returned.
     *  @default true
     */
    decodeBulk?: boolean

    /**
     *  Maps all replies
     */
    map?(
        x: unknown, attributes?: Hash
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
    readonly reason: string
    
    /** 
     *  Failure constructor 
     */
    constructor(
        reason: string
    ) {

        this.reason = reason
    
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

/** 
 *  Represents a RESPv2/v3 Bulk String
 */
export class Bulk {

    /**
     *  Buffer of the `Bulk`
     */
    readonly body: Uint8Array

    /**
     *  Size in bytes of the body
     */
    get size() {
        return this.body.byteLength
    }
    
    /**
     *  Bulk constructor
     */
    constructor(
        body: Uint8Array,
    ) {

        this.body = body

    }

    /**
     *  Returns a string containing the 
     *  text UTF-8 decoded.
     */
    decode() : string {
        return decode(this.body)
    }

}


/** 
 *  Represents a RESPv3 Verbatim String 
 */
export class FormatedBulk extends Bulk {

    /**
     *  Format of the Bulk
     */
    readonly format: string
    
    /**
     *  FormatedBulk constructor
     */
    constructor(
        body: Uint8Array, format: string
    ) {

        super(body)
        this.format = format

    }

}
