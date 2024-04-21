#!/usr/bin/env -S deno run --allow-env

import { Resp3Parser } from "../mod.ts"

const chunk = new TextEncoder().encode([
    '|4',
    '+a',
    '#t',
    '+b',
    '#t',
    '+c',
    '#t',
    '+d',
    '#t',
    ':1',
].join('\r\n') + '\r\n')

const parser = new Resp3Parser()

parser.appendChunk(chunk)

console.log(parser.process())
console.log(parser.done)
