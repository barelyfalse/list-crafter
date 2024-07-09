export enum blockType {
  word, // 0
  digit, // 1
  bool, // 2
  group, // 3
  repetitive, // 4
  or, // 5
  plain, // 6
  newline, // 7
  logicGroup, // 8
  option, // 9
}

export interface Segment {
  raw: string
  type: blockType
  segmentId: number | null
  escaped: boolean
  value?: string | boolean | number
}

export interface Block {
  start: string
  end: string
  repetitive: boolean
  options: boolean
  option: boolean
  children: (Block | Segment)[]
  values: (Block | Segment)[]
}

export interface ParseResult {
  error: boolean
  catastrophic: boolean
  message: string
  raw: string | null
  root: Block
}
export const createBlock = (
  start: string,
  end: string,
  repetitive: boolean,
  options: boolean,
  option: boolean,
  children: (Block | Segment)[] = [],
  values: (Block | Segment)[] = []
): Block => ({
  start,
  end,
  repetitive,
  options,
  option,
  children,
  values,
})

export const createSegment = (
  raw: string,
  type: blockType,
  segmentId: number | null = null,
  escaped: boolean = false
): Segment => ({
  raw,
  type,
  segmentId,
  escaped,
})

export const createResult = (
  error: boolean = false,
  catastrophic: boolean = false,
  message: string = '',
  raw: string | null = null,
  root: Block = createBlock('', '', false, false, false, [], [])
): ParseResult => ({
  error,
  catastrophic,
  message,
  raw,
  root,
})

export function dynamicListParser(pattern: string): ParseResult {
  // 1 character each
  const flagToken = '-'
  const wordToken = 'w'
  const digitToken = 'd'
  const boolToken = 'b'
  const repToken = 'r'
  const lnToken = 'n'
  const orToken = '|'
  const groupTokens: { start: string; end: string }[] = [
    { start: '(', end: ')' },
    { start: '[', end: ']' },
    { start: '{', end: '}' },
  ]
  const logicGroupTokens = { start: '<', end: '>' }
  const escapeToken = '\u005C' // \u005C

  const starterTokens = groupTokens
    .map((g) => {
      return '\\' + g.start
    })
    .join('')
  const terminatorTokens = groupTokens
    .map((g) => {
      return '\\' + g.end
    })
    .join('')

  // TODO: make this regexp smarter
  const tokensRx = new RegExp(
    `${wordToken}|${digitToken}|${boolToken}|${repToken}|${lnToken}|\\${orToken}`,
    'g'
  )
  const startersRx = new RegExp(`[${starterTokens}]`)
  const terminatorsRx = new RegExp(`[${terminatorTokens}]`)

  const segLog = false

  //console.log(`Pattern: ${pattern}`)

  let segments: Segment[] = []

  let groupStack: { start: string; index: number; segmentId: number }[] = []

  let idCounter = 100
  const nextId = (): number => {
    const next = idCounter + 1
    idCounter++
    return next
  }

  let escaped = false
  let flagged = false
  let plainBuffer = ''

  segLog && console.log('Segments processing')
  for (let pI = 0; pI < pattern.length; pI++) {
    let c = createSegment(pattern[pI], blockType.plain, null, escaped)

    segLog && console.log('---')
    segLog && console.log(`Current, pI ${pI}: \"${c.raw}\"`)

    // next token escaped?
    if (!escaped && c.raw == escapeToken) {
      segLog && console.log(`Escape token, jumping to next iter`)
      escaped = true
      continue
    }

    // flag ahead?
    if (!escaped && c.raw == flagToken) {
      segLog && console.log(`Flag token, jumping to next iter`)
      flagged = true
      continue
    }

    // match starters
    if (!c.escaped && startersRx.test(c.raw)) {
      const id = nextId()
      groupStack.push({ start: c.raw, index: pI, segmentId: id })
      c.type = blockType.group
      c.segmentId = id
      segLog && console.log(`Group starter, ${c.raw}`)
    }
    if (!c.escaped && c.raw == logicGroupTokens.start) {
      const id = nextId()
      groupStack.push({ start: c.raw, index: pI, segmentId: id })
      c.type = blockType.logicGroup
      c.segmentId = id
      segLog && console.log(`Opt starter`)
    }

    // match terminators
    if (
      !c.escaped &&
      (terminatorsRx.test(c.raw) || c.raw == logicGroupTokens.end)
    ) {
      const pair = groupTokens.find((f) => f.end == c.raw)
      const lastGroupChar = groupStack[groupStack.length - 1]
      if (
        pair !== null &&
        pair !== undefined &&
        groupStack.length > 0 &&
        lastGroupChar.start == pair.start
      ) {
        c.segmentId = lastGroupChar.segmentId
        c.type = blockType.group
        groupStack.pop()
        segLog && console.log(`Terminator, ${c.raw}`)
      } else if (lastGroupChar.start == logicGroupTokens.start) {
        c.segmentId = lastGroupChar.segmentId
        c.type = blockType.logicGroup
        groupStack.pop()
        segLog && console.log(`Opt terminator`)
      } else {
        return createResult(
          true,
          true,
          `Incorrectly closed groups! (char:${pI})`
        )
      }
    }

    // match flags
    if (flagged) {
      tokensRx.lastIndex = 0
      if (tokensRx.test(c.raw)) {
        switch (c.raw) {
          case wordToken:
            c.type = blockType.word
            c.raw = `${flagToken}${c.raw}`
            segLog && console.log(`Word token`)
            break
          case digitToken:
            c.type = blockType.digit
            c.raw = `${flagToken}${c.raw}`
            segLog && console.log(`Digit token`)
            break
          case boolToken:
            c.type = blockType.bool
            c.raw = `${flagToken}${c.raw}`
            segLog && console.log(`Bool token`)
            break
          case lnToken:
            c.type = blockType.newline
            c.raw = `\n`
            segLog && console.log(`New line token`)
            break
          case repToken:
            c.type = blockType.repetitive
            c.raw = `${flagToken}${c.raw}`
            segLog && console.log(`Rep token`)
            break
        }
      }
    }

    // or
    if (!c.escaped && c.raw == orToken) {
      c.type = blockType.or
      segLog && console.log(`Or token`)
    }

    // plain
    if (c.type == blockType.plain) {
      plainBuffer += c.raw
      segLog && console.log('Plain to buffer')
      if (escaped) escaped = false
      continue
    } else if (plainBuffer.length > 0) {
      segments.push(createSegment(plainBuffer, blockType.plain, null, false))
      plainBuffer = ''
      segLog && console.log(`Plain end at ${pI - 1}`)
    }

    escaped = false
    flagged = false
    segments.push(c)
  }

  if (plainBuffer.length > 0) {
    segments.push(createSegment(plainBuffer, blockType.plain, null, false))
    plainBuffer = ''
    segLog && console.log(`Plain buffer not empty`)
  }

  // TODO: autocomplete unclosed correct groups
  if (groupStack.length > 0) {
    return createResult(true, false, 'Not properly closed groups!')
  }

  for (let sI = 0; sI < segments.length; sI++) {
    //console.log((terminatorsRx.test(segments[sI+1].raw) || segments[sI+1].raw == logicGroupTokens.end))
    if (
      segments[sI].type == blockType.repetitive &&
      sI < segments.length - 1 &&
      !(
        terminatorsRx.test(segments[sI + 1].raw) ||
        segments[sI + 1].raw == logicGroupTokens.end
      )
    ) {
      return createResult(
        true,
        true,
        `Repeat token set incorrectly! (segm:${sI})`
      )
    }
  }

  segLog && console.log(segments)

  // returns first ocurrence of a type in segments
  const typeWithinGroup = (
    segments: Segment[],
    segmentIndex: number,
    type: blockType
  ): boolean => {
    const pairIndex = segments.findIndex(
      (s, i) =>
        s.segmentId == segments[segmentIndex].segmentId && i > segmentIndex
    )
    if (pairIndex < 0) return false
    const conincidenceIndex = segments.findIndex(
      (s, i) => s.type == type && i < pairIndex
    )
    return conincidenceIndex >= 0
  }

  // hierarchy root
  let rootBlock = createBlock('', '', false, false, false, [])
  const blockStack: Block[] = [rootBlock]
  // control variables
  let inLogicGroup = false
  let currentOption: Block | null = null

  for (let sI = 0; sI < segments.length; sI++) {
    const curS = segments[sI]
    const currentBlock = blockStack[blockStack.length - 1]

    if (curS.type === blockType.logicGroup) {
      if (curS.raw === '<') {
        const newBlock = createBlock(
          '',
          '',
          false,
          typeWithinGroup(segments, sI, blockType.or),
          false,
          []
        )
        currentBlock.children.push(newBlock)
        blockStack.push(newBlock)
        inLogicGroup = true
        currentOption = createBlock('', '', false, false, true, [])
        newBlock.children.push(currentOption)
        blockStack.push(currentOption)
      } else if (curS.raw === '>') {
        while (
          blockStack.length > 1 &&
          !blockStack[blockStack.length - 1].options
        ) {
          blockStack.pop()
        }
        if (blockStack.length > 1) {
          //blockStack[blockStack.length - 1].end = curS.raw;
          blockStack.pop()
        }
        inLogicGroup = false
        currentOption = null
      }
    } else if (curS.type === blockType.or && inLogicGroup) {
      while (
        blockStack.length > 2 &&
        !blockStack[blockStack.length - 2].options
      ) {
        blockStack.pop()
      }
      currentOption = createBlock('', '', false, false, true, [])
      blockStack[blockStack.length - 2].children.push(currentOption)
      blockStack[blockStack.length - 1] = currentOption
    } else if (curS.type === blockType.group) {
      if (startersRx.test(curS.raw)) {
        // ({[
        const newBlock = createBlock(curS.raw, '', false, false, false, [])
        currentBlock.children.push(newBlock)
        blockStack.push(newBlock)
      } else if (terminatorsRx.test(curS.raw)) {
        // ]})
        if (blockStack.length > 1) {
          blockStack[blockStack.length - 1].end = curS.raw
          blockStack.pop()
        }
      }
    } else if (curS.type === blockType.repetitive) {
      currentBlock.repetitive = true
    } else {
      currentBlock.children.push(
        createSegment(curS.raw, curS.type, curS.segmentId, curS.escaped)
      )
    }
  }

  function initializeBlock(block: Block): Block {
    // Initialize children first
    block.children = block.children.map((child) => {
      if (isBlock(child)) {
        return initializeBlock({ ...child })
      } else {
        return initializeSegment({ ...child })
      }
    })

    // Then initialize values based on children
    block.values = block.children.map((child) => {
      if (isBlock(child)) {
        return initializeBlock({ ...child })
      } else {
        return initializeSegment({ ...child })
      }
    })
    return block
  }

  function initializeSegment(segment: Segment): Segment {
    switch (segment.type) {
      case blockType.word:
        segment.value = ''
        break
      case blockType.digit:
        segment.value = 0
        break
      case blockType.bool:
        segment.value = false
        break
      default:
        // For other types, we don't set a value
        break
    }
    return segment
  }

  function isBlock(item: Block | Segment): item is Block {
    return 'children' in item
  }

  rootBlock = initializeBlock(rootBlock)

  return createResult(false, false, '', pattern, rootBlock)
}
