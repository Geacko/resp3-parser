# resp3-parser
Parser for RESP protocol v2/v3

**Basic Example**
```ts
const parser = new ChunkedParser()

const blob = new TextEncoder().encode('+Welcome, this is a test...\r\n#t\r\n:1234567890\r\n')
parser.appendChunk(blob.subarray(0,9))
parser.appendChunk(blob.subarray(9))

while (parser.remainingBytes > 0) {
    console.log(parser.process())
}

// Outputs:
// Welcome, this is a test...
// true
// 1234567890

```
