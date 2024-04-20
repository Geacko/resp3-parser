import { 
    decode 
} from "./utils.ts"

/** ... */
export interface Resp3ParserOptions {

    /**
     *  ...
     */
    decodeBulk?: boolean

    /**
     *  ...
     */
    decodeVerbatim?(
        x: Bulk
    ): unknown

    /**
     *  ...
     */
    mapMap?(
        x: Hash
    ): unknown

    /**
     *  ...
     */
    mapSet?(
        x: Unordered
    ): unknown

    /**
     *  ...
     */
    mapReplyWithAttributes?(
        x: ReplyWithAttributes
    ): unknown

}

export type Maybe<T extends unknown> 
    = T 
    | undefined

/** ... */
export class Failure {
    
    constructor(public payload: string | Bulk) {
        // ...
    }

}

/** ... */
export class Push extends Array<unknown> {
    // ...
}

/** ... */
export class Unordered extends Array<unknown> {
    // ...
}

/** ... */
export class Hash<
    K extends unknown = unknown, 
    V extends unknown = unknown
> extends Array<[ K , V ]> {

    // ...

}

/** ... */
export class Bulk {

    /**
     *  ...
     */
    readonly encoding: string

    /**
     *  ...
     */
    readonly blob: Uint8Array
    
    /**
     *  ...
     */
    constructor(
        encoding : string,
        blob     : Uint8Array,
    ) {

        this.encoding = encoding
        this.blob     = blob

    }

    /**
     *  ...
     */
    decode() : string {
        return decode(this.blob)
    }

}

/** ... */
export class ReplyWithAttributes<
    T extends unknown = unknown, U extends Hash = Hash
> {

    /**
     *  ...
     */
    readonly attributes: U
    
    /**
     *  ...
     */
    readonly value: T

    /**
     *  ...
     */
    constructor(
        attributes : U,
        value      : T
    ) {
        
        this.attributes = attributes
        this.value      = value

    }

}
