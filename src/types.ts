export class Failure {
    
    constructor(public message: string) {
        // ...
    }

}

export class Push extends Array<Reply> {
    // ...
}

export class Unordered extends Array<Reply> {
    // ...
}

export class Hash<
    K extends Reply = Reply, 
    V extends Reply = Reply
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

export type ReplyValue
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
    T extends ReplyValue = ReplyValue, U extends Record<string, ReplyValue> = Record<string, ReplyValue>
> {

    constructor(
        public attrs: U,
        public reply: T
    ) {
        
        // ...

    }

}
 
export type Maybe<T extends Reply> 
    = T 
    | undefined

export type Reply 
    = ReplyValue 
    | ReplyWithAttributes