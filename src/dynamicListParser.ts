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
): Segment => {
  let value: string | boolean | number | undefined

  switch (type) {
    case blockType.word:
      value = ''
      break
    case blockType.digit:
      value = 0
      break
    case blockType.bool:
      value = false
      break
    // For other types, value remains undefined
  }

  return {
    raw,
    type,
    segmentId,
    escaped,
    value,
  }
}

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
   * returns true if there is an ocurrence of `type` inside
   * groupIndex.segmentId group
   */
  function typeWithinGroup(
    segments: Segment[],
    groupIndex: number,
    type: blockType
  ): boolean {
    log(
      logType.INFO,
      parserModule.HIER,
      `Looking for type ${type} within group at segment ${groupIndex}`
    )
    const within = segments[groupIndex]
    if (
      within.type !== blockType.group &&
      within.type !== blockType.logicGroup
    ) {
      // segment at groupIndex is not a group
      log(
        logType.WARN,
        parserModule.HIER,
        `Segment is not at group, can't search for type`
      )
      return false
    }

    for (let sI = groupIndex + 1; sI < segments.length; sI++) {
      const segment = segments[sI]

      if (segment.type === within.type) {
        log(logType.INFO, parserModule.HIER, `Same group type found at  ${sI}`)
        if (segment.segmentId === within.segmentId) {
          // the group closed
          log(
            logType.INFO,
            parserModule.HIER,
            `Type ${type} not found in group`
          )
          return false
        } else {
          // new group
          const pairIndex = segments.findIndex(
            (s, i) => s.segmentId === segment.segmentId && i > sI
          )

          if (pairIndex < 0) {
            log(
              logType.WARN,
              parserModule.HIER,
              `Pair not found for group sI: ${sI} within group at segment ${groupIndex}`
            )
            return false // no closing segment
          }
          log(
            logType.INFO,
            parserModule.HIER,
            `Pair of new group found at ${pairIndex}, skipping group at ${sI}`
          )
          // displace to the end of the found group
          sI = pairIndex
        }
      } else {
        // is another type
        if (segment.type === type) {
          // the type we are looking for
          log(logType.INFO, parserModule.HIER, `type ${type} found at sI ${sI}`)
          return true
        }
      }
    }

    // the type wasn't found
    return false
  }

  log(logType.INFO, parserModule.HIER, `Hierarchization process`)

  // hierarchy root
  let rootBlock = createBlock('', '', false, false, false, [], [])
  // control variables
  const blockStack: Block[] = [rootBlock]

  for (let sI = 0; sI < segments.length; sI++) {
    log(logType.INFO, parserModule.HIER, `---`)
    const curSegm = segments[sI]
    const curBlock = blockStack[blockStack.length - 1]

    log(logType.INFO, parserModule.HIER, `Current sI ${sI}:`, curSegm)
    log(
      logType.INFO,
      parserModule.HIER,
      `Current stack count:`,
      blockStack.length
    )

    if (startersRx.test(curSegm.raw)) {
      log(logType.INFO, parserModule.HIER, `Group starter detected`)
      // create new Block
      // set start
      // push Block as child of curBlock
      // push Block to blockStack
      const newGroup = createBlock(curSegm.raw, '', false, false, false, [], [])
      curBlock.children.push(newGroup)
      blockStack.push(newGroup)
    } else if (terminatorsRx.test(curSegm.raw)) {
      log(logType.INFO, parserModule.HIER, `Group terminator detected`)
      // set end of curBlock
      // pop it from blockStack
      curBlock.end = curSegm.raw
      blockStack.pop()
    } else if (curSegm.raw === logicGroupTokens.start) {
      log(logType.INFO, parserModule.HIER, `Logic group starter detected`)
      const orWithin = typeWithinGroup(segments, sI, blockType.or)

      if (orWithin) {
        // this is an options group
        log(logType.INFO, parserModule.HIER, `Creating a new options group`)
        // create new options group
        // push Block as child of curBlock
        // push Block to blockStack
        // create new option Block
        // push Block to previous options group
        // push Block to blockStack
        const newGroup = createBlock('', '', false, true, false, [], [])
        curBlock.children.push(newGroup)
        blockStack.push(newGroup)

        log(logType.INFO, parserModule.HIER, `Creating default option`)

        const newOption = createBlock('', '', false, false, true, [], [])
        newGroup.children.push(newOption)
        blockStack.push(newOption)
      } else {
        // this is a normal logic group
        log(logType.INFO, parserModule.HIER, `Creating basic logic group`)
        // create new Block
        // push Block as child of curBlock
        // push Block to blockStack
        const newGroup = createBlock('', '', false, false, false, [], [])
        curBlock.children.push(newGroup)
        blockStack.push(newGroup)
      }
    } else if (curSegm.raw === logicGroupTokens.end) {
      log(logType.INFO, parserModule.HIER, `Logic group terminator detected`)
      blockStack.pop()
      if (blockStack.length > 1 && blockStack[blockStack.length - 1].options) {
        blockStack.pop()
      }
    } else {
      switch (curSegm.type) {
        case blockType.word:
        case blockType.digit:
        case blockType.bool:
          log(
            logType.INFO,
            parserModule.HIER,
            `Word, Digit or Bool token detected`
          )
          curBlock.children.push(
            createSegment(
              curSegm.raw,
              curSegm.type,
              curSegm.segmentId,
              curSegm.escaped
            )
          )
          break
        case blockType.or:
          log(logType.INFO, parserModule.HIER, `OR token detected`)
          // are there any viable tokens ahead?
          if (
            sI < segments.length - 1 &&
            segments[sI + 1].raw !== logicGroupTokens.end
          ) {
            // pop previous option
            // create new option
            // push new option to the last options block
            // push new option to blockstack
            blockStack.pop()

            log(logType.INFO, parserModule.HIER, `Creating new option`)
            const newOption = createBlock('', '', false, false, true, [], [])

            let stackI = blockStack.length - 1

            while (stackI >= 0) {
              if (stackI == 0)
                return createResult(
                  true,
                  true,
                  'Parent Options block could not be found'
                )

              if (blockStack[stackI].options) {
                blockStack[stackI].children.push(newOption)
                log(
                  logType.INFO,
                  parserModule.HIER,
                  `Parent Options block found`
                )
                break
              }
              stackI--
            }

            blockStack.push(newOption)
          } else {
            log(logType.INFO, parserModule.HIER, `OR token ignored`)
          }
          break
        case blockType.repetitive:
          log(logType.INFO, parserModule.HIER, `Repetitive group detected`)
          curBlock.repetitive = true
          break
        case blockType.plain:
        case blockType.newline:
          log(logType.INFO, parserModule.HIER, `Plain detected`)
          curBlock.children.push(
            createSegment(
              curSegm.raw,
              curSegm.type,
              curSegm.segmentId,
              curSegm.escaped
            )
          )
          break
      }
    }
    log(
      logType.INFO,
      parserModule.HIER,
      `Current stack count after mutation:`,
      blockStack.length
    )
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

  rootBlock = initializeBlock(rootBlock)

  log(logType.INFO, parserModule.HIER, 'Values initialized')

  log(logType.INFO, parserModule.HIER, 'Hierarhy', rootBlock)

  return createResult(false, false, '', pattern, rootBlock)
}
