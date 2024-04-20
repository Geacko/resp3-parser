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
export class Push<
    T extends unknown = unknown
> extends Array<T> {
    // ...
}

/** ... */
export class Unordered<
    T extends unknown = unknown
> extends Array<T> {

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
    readonly body: Uint8Array
    
    /**
     *  ...
     */
    constructor(
        encoding : string,
        body     : Uint8Array,
    ) {

        this.encoding = encoding
        this.body     = body

    }

    /**
     *  ...
     */
    decode() : string {
        return decode(this.body)
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
