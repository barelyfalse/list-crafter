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

enum logType {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

enum parserModule {
  SEGM = 'segm',
  HIER = 'hier',
  OTHER = 'other',
}

export function dynamicListParser(
  pattern: string,
  logModules: parserModule[] = []
): ParseResult {
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

  log(logType.INFO, parserModule.OTHER, pattern)

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

  /**
   * Loggin function
   */
  function log(type: logType, module: parserModule, ...args: any[]) {
    // TODO: add log level
    if (logModules.includes(module)) {
      console.log(`[${type.toUpperCase()}] [${module}]:`, ...args)
    }
  }

  log(logType.INFO, parserModule.SEGM, 'Segments processing')
  for (let pI = 0; pI < pattern.length; pI++) {
    let c = createSegment(pattern[pI], blockType.plain, null, escaped)

    log(logType.INFO, parserModule.SEGM, '---')
    log(logType.INFO, parserModule.SEGM, `Current, pI ${pI}: \"${c.raw}\"`)

    // next token escaped?
    if (!escaped && c.raw == escapeToken) {
      log(
        logType.INFO,
        parserModule.SEGM,
        `Escape token, skipping to next iteration`
      )
      escaped = true
      continue
    }

    // flag ahead?
    if (!escaped && c.raw == flagToken) {
      log(
        logType.INFO,
        parserModule.SEGM,
        `Flag token, skipping to next iteration`
      )
      flagged = true
      continue
    }

    // match starters
    if (!c.escaped && startersRx.test(c.raw)) {
      const id = nextId()
      groupStack.push({ start: c.raw, index: pI, segmentId: id })
      c.type = blockType.group
      c.segmentId = id
      log(logType.INFO, parserModule.SEGM, `Group starter detected, ${c.raw}`)
    }
    if (!c.escaped && c.raw == logicGroupTokens.start) {
      const id = nextId()
      groupStack.push({ start: c.raw, index: pI, segmentId: id })
      c.type = blockType.logicGroup
      c.segmentId = id
      log(logType.INFO, parserModule.SEGM, `Logic group start detected`)
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
        log(logType.INFO, parserModule.SEGM, `Terminator detected, ${c.raw}`)
      } else if (lastGroupChar.start == logicGroupTokens.start) {
        c.segmentId = lastGroupChar.segmentId
        c.type = blockType.logicGroup
        groupStack.pop()
        log(logType.INFO, parserModule.SEGM, `Logic group terminator detected`)
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
            log(logType.INFO, parserModule.SEGM, `Word token detected`)
            break
          case digitToken:
            c.type = blockType.digit
            c.raw = `${flagToken}${c.raw}`
            log(logType.INFO, parserModule.SEGM, `Digit token detected`)
            break
          case boolToken:
            c.type = blockType.bool
            c.raw = `${flagToken}${c.raw}`
            log(logType.INFO, parserModule.SEGM, `Bool token detected`)
            break
          case lnToken:
            c.type = blockType.newline
            c.raw = `\n`
            log(logType.INFO, parserModule.SEGM, `New line token detected`)
            break
          case repToken:
            c.type = blockType.repetitive
            c.raw = `${flagToken}${c.raw}`
            log(logType.INFO, parserModule.SEGM, `Repetition token detected`)
            break
        }
      }
    }

    // or
    if (!c.escaped && c.raw == orToken) {
      c.type = blockType.or
      log(logType.INFO, parserModule.SEGM, `OR token detected`)
    }

    // plain
    if (c.type == blockType.plain) {
      plainBuffer += c.raw
      log(
        logType.INFO,
        parserModule.SEGM,
        `Plain appended to buffer, skipping to next iteration`
      )
      if (escaped) escaped = false
      continue
    } else if (plainBuffer.length > 0) {
      segments.push(createSegment(plainBuffer, blockType.plain, null, false))
      plainBuffer = ''
      log(
        logType.INFO,
        parserModule.SEGM,
        `pI not plain, appendig plain buffer segment`
      )
    }

    escaped = false
    flagged = false
    log(logType.INFO, parserModule.SEGM, `Appending segment`)
    segments.push(c)
  }

  log(logType.INFO, parserModule.SEGM, `Segmentation iteration ended`)
  log(logType.INFO, parserModule.SEGM, `---`)

  if (plainBuffer.length > 0) {
    segments.push(createSegment(plainBuffer, blockType.plain, null, false))
    plainBuffer = ''
    log(
      logType.INFO,
      parserModule.SEGM,
      `Plain buffer not empty, appending last segment`
    )
  }

  // TODO: autocomplete unclosed correct groups
  if (groupStack.length > 0) {
    log(
      logType.WARN,
      parserModule.SEGM,
      `Not properly closed groups!`,
      segments
    )
    return createResult(true, false, 'Not properly closed groups!')
  } else {
    log(logType.INFO, parserModule.SEGM, `All groups closed properly`)
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
      log(
        logType.ERROR,
        parserModule.SEGM,
        `Repeat token set incorrectly! (segm:${sI})`,
        segments
      )
      return createResult(true, true, `Repeat token set incorrectly!`)
    } else if (segments[sI].type == blockType.repetitive) {
      log(
        logType.INFO,
        parserModule.SEGM,
        `Repetition token placed correctly (seg: ${sI})`
      )
    }
  }

  log(logType.INFO, parserModule.SEGM, 'Segments', segments)

  /**
   * returns first ocurrence of a type in segments
   */
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

  log(logType.INFO, parserModule.HIER, `Hierarchization process`)

  // hierarchy root
  let rootBlock = createBlock('', '', false, false, false, [])
  // control variables
  const blockStack: Block[] = [rootBlock]
  let inLogicGroup = false
  let currentOption: Block | null = null

  // process each segment
  for (let sI = 0; sI < segments.length; sI++) {
    log(logType.INFO, parserModule.HIER, `---`)
    const curS = segments[sI]
    const currentBlock = blockStack[blockStack.length - 1]
    log(logType.INFO, parserModule.HIER, 'current segment', curS)

    // segment a logic group?
    if (curS.type === blockType.logicGroup) {
      log(logType.INFO, parserModule.HIER, 'Logic group detected')
      // starting logic group?
      if (curS.raw === '<') {
        log(logType.INFO, parserModule.HIER, 'Opening logic group')
        // opening new group
        const newBlock = createBlock(
          '',
          '',
          false,
          typeWithinGroup(segments, sI, blockType.or), // check if any or tokens inside the group
          false,
          []
        )
        currentBlock.children.push(newBlock)
        blockStack.push(newBlock)
        // setting controls for new current
        inLogicGroup = true
        currentOption = createBlock('', '', false, false, true, [])
        newBlock.children.push(currentOption)
        blockStack.push(currentOption)
      } else if (curS.raw === '>') {
        log(logType.INFO, parserModule.HIER, 'Closing logic group')
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
      log(logType.INFO, parserModule.HIER, `OR detected inside logic group`)
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
        log(logType.INFO, parserModule.HIER, 'Starting new group')
        const newBlock = createBlock(curS.raw, '', false, false, false, [])
        currentBlock.children.push(newBlock)
        blockStack.push(newBlock)
      } else if (terminatorsRx.test(curS.raw)) {
        // ]})
        if (blockStack.length > 1) {
          log(
            logType.INFO,
            parserModule.HIER,
            'Closing group, removing it from the stack'
          )
          blockStack[blockStack.length - 1].end = curS.raw
          blockStack.pop()
        }
      }
    } else if (curS.type === blockType.repetitive) {
      log(logType.INFO, parserModule.HIER, 'Setting repetitive block')
      currentBlock.repetitive = true
    } else {
      log(logType.INFO, parserModule.HIER, 'Plain segment added')
      currentBlock.children.push(
        createSegment(curS.raw, curS.type, curS.segmentId, curS.escaped)
      )
    }
  }

  /**
   *
   * @param item Block or Segment type
   * @returns childrens if its block
   */
  function isBlock(item: Block | Segment): item is Block {
    return 'children' in item
  }

  function initializeBlock(block: Block): Block {
    // children initialization
    block.children = block.children.map((child) => {
      if (isBlock(child)) {
        return initializeBlock({ ...child })
      } else {
        return initializeSegment({ ...child })
      }
    })

    // values initialization
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
        break
    }
    return segment
  }

  log(logType.INFO, parserModule.HIER, 'Values initialized')

  rootBlock = initializeBlock(rootBlock)

  return createResult(false, false, '', pattern, rootBlock)
}
