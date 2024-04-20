# resp3-parser
Parser for RESP protocol v2/v3

**Basic Example**

```ts
const parser = new Resp3Parser()

const blob = new TextEncoder().encode('+This is a test...\r\n#t\r\n:1234567890\r\n')
parser.appendChunk(blob.subarray(0,9))
parser.appendChunk(blob.subarray(9))

while (parser.remainingBytes > 0) {
    console.log(parser.process())
}

// Outputs:
// This is a test...
// true
// 1234567890

```

**RESP3 Features**

| Feature                        | Supported |
|--------------------------------|-----------|
| Attributes                     | Yes       |
| Streamed strings               | Yes       |
| Streamed aggregated data types | Yes       |
| Sets                           | Yes       |
| Maps                           | Yes       |
| Verbatim Strings               | Yes       |
| Blob Errors                    | Yes       |
| Pushes                         | Yes       |
| Big Numbers                    | Yes       |
| Booleans                       | Yes       |
| Doubles                        | Yes       |
| Null                           | Yes       |
| Hello                          | Yes       |

**Types**

| RESP            | Javascript           |
|-----------------|----------------------|
| Simple String   | `string`             |
| Simple Error    | `Failure`            |
| Integer         | `number` or `bigint` |
| Big Number      | `bigint`             |
| Boolean         | `boolean`            |
| Double          | `number`             |
| Array           | `Array<T>`           |
| Null            | `null`               |
| Bulk String     | `Bulk` or `string`   |
| Verbatim String | `Bulk`               |
| Bulk Error      | `Failure`            |
| Set             | `Unordered<T>`       |
| Map             | `Hash<T>`            |
| Attributes      | `Hash<T>`            |
| Hello            |`Hash<T>`            |
| Push            | `Push<T>`            |
