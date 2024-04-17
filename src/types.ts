export class Failure {
    
    constructor(public message: string) {
        // ...
    }

}

export class Push extends Array<Reply | ReplyWithAttributes> {
    // ...
}

export class Unordered extends Array<Reply | ReplyWithAttributes> {
    // ...
}

export class Hash<
    K extends Reply | ReplyWithAttributes = Reply | ReplyWithAttributes, 
    V extends Reply | ReplyWithAttributes = Reply | ReplyWithAttributes
> extends Array<[ K , V ]> {

    // ...

}

export class Verbatim {
    
    constructor(
        public ecoding: string,
        public content: string,
    ) {

        // ...

    }

}

export type Reply
    = string 
    | number 
    | boolean
    | bigint
    | null
    | Failure
    | Push
    | Unordered
    | Hash
    | Verbatim
    | Reply[]

export class ReplyWithAttributes<
    T extends Reply = Reply, U extends Record<string, Reply> = Record<string, Reply>
> {

    constructor(
        public attrs: U,
        public reply: T
    ) {
        
        // ...

    }

}
 
export type Maybe<T extends Reply | ReplyWithAttributes> 
    = T 
    | undefined
