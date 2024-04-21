#!/usr/bin/env -S deno run --allow-env

import { 
    FormatedBulk, 
    Hash, 
    Resp3Parser, 
    Unordered 
} from "../mod.ts"

const chunk = new TextEncoder().encode([
    '|?',
    '+name',
    '$7',
    'name #0',
    '+popularity',
    ',0.5',
    '+previous',
    ':0',
    '+is_primary',
    '#t',
    '+related_keys',
    '~?',
    ':2',
    ':1',
    '.',
    '.',
    '%?',
    '+0',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '+1',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '+2',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '.',
    '|?',
    '+name',
    '$7',
    'name #1',
    '+popularity',
    ',0.25',
    '+previous',
    ':1',
    '+is_primary',
    '#f',
    '+related_keys',
    '~?',
    ':0',
    ':8',
    ':1',
    ':5',
    ':2',
    '.',
    '.',
    '%?',
    '+0',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '+1',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '+2',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '.',
    '|?',
    '+name',
    '$7',
    'name #2',
    '+popularity',
    ',0.125',
    '+previous',
    ':2',
    '+is_primary',
    '#f',
    '+related_keys',
    '~?',
    ':7',
    '.',
    '.',
    '%?',
    '+0',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '+1',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '+2',
    '=?',
    ';3',
    'txt',
    ';1',
    ':',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';10',
    'xxxxxxxxxx',
    ';0',
    '.',
].join('\r\n') + '\r\n')

class Reply {

    constructor(
        readonly attrs: Record<string, unknown>,
        readonly reply: unknown
    ) {}

}

const parser = new Resp3Parser({

    map(x, attributes) {

        if (x instanceof FormatedBulk) {
            x = x.decode()
        }

        else {

            x = x instanceof Hash      ? new Map(x)
              : x instanceof Unordered ? new Set(x)
              : x

        }

        return attributes ? new Reply(
            Object.fromEntries(attributes), x
        ) : x

    }

})

parser.appendChunk(chunk)

while (parser.remainingBytes > 0) {
    console.log(parser.process())
}

console.log(parser.done)
