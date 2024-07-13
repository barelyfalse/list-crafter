# list-crafter
Pattern parser for list formating.

## Instructions
1. Write the pattern.
2. Fill the parsed inputs
3. Enjoy

## Tokens
- Groups: `[]`, `()`, `{}`; escaped: `\[\]`, `\(\)`, `\{\}`
- Logic group: `<>`, escaped `\<\>`
- Special; escaped: `\token`:
  - `-w` (set of characters)
	- `-d` (digits)
	- `-b` (boolean)
  - `-n` (line break)
	- `-r` (repetitive) works inside a logic group only, doesn't work at pos 0 (at the beginning)
	- `|` (or) works inside a logic group only

## Pattern examples
- `-w:[ -w: <-w(-w, -r), |-w, >; -r]`
- `{-w:<-w|-d|-b>, -r}`
- `["-w", -r]`
- `{-w: -w, -r}`

## ToDo
- Better plain text parsing
- Store recent patterns
- Reference