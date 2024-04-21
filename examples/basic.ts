#!/usr/bin/env -S deno run --allow-env

import { Resp3Parser } from "../mod.ts"

const chunk = new TextEncoder().encode([
    ':1',
    ':2',
    ':3',
].join('\r\n') + '\r\n')

const parser = new Resp3Parser()

parser.appendChunk(chunk)

console.log(parser.process(), parser.done)
console.log(parser.process(), parser.done)
console.log(parser.process(), parser.done)
