#!/usr/bin/env -S deno run --allow-env

import { 
    Hash, 
    Resp3Parser, 
    Unordered 
} from "../mod.ts"

const chunk = new TextEncoder().encode([
    '%3',
    '+a',
    '~3',
    ':1',
    ':2',
    ':3',
    '+b',
    '~3',
    ':4',
    ':5',
    ':6',
    '+c',
    '~3',
    ':7',
    ':8',
    ':9',
].join('\r\n') + '\r\n')

const parser = new Resp3Parser({

    map(x) {

        return x instanceof Hash      ? new Map(x) 
             : x instanceof Unordered ? new Set(x) 
             : x

    }

})

parser.appendChunk(chunk)

console.log(parser.process())
console.log(parser.done)
