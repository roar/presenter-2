import type { PathPolylinePoint } from './pathPolylineLayout'

type Command = {
  code: string
  values: number[]
}

export function sampleSvgPathPolyline(pathData: string): PathPolylinePoint[] | null {
  const commands = parseSvgPath(pathData)
  if (commands.length === 0) {
    return null
  }

  const points: PathPolylinePoint[] = []
  let current: PathPolylinePoint = { x: 0, y: 0 }
  let subpathStart: PathPolylinePoint = { x: 0, y: 0 }

  for (const command of commands) {
    switch (command.code) {
      case 'M': {
        current = { x: command.values[0], y: command.values[1] }
        subpathStart = current
        points.push(current)
        break
      }
      case 'L': {
        current = { x: command.values[0], y: command.values[1] }
        points.push(current)
        break
      }
      case 'C': {
        const start = current
        const control1 = { x: command.values[0], y: command.values[1] }
        const control2 = { x: command.values[2], y: command.values[3] }
        const end = { x: command.values[4], y: command.values[5] }
        const samples = Math.max(
          12,
          Math.ceil(
            approximateDistance(start, control1) +
              approximateDistance(control1, control2) +
              approximateDistance(control2, end)
          ) / 12
        )

        for (let index = 1; index <= samples; index += 1) {
          const t = index / samples
          points.push(sampleCubicBezier(start, control1, control2, end, t))
        }

        current = end
        break
      }
      case 'Z': {
        if (current.x !== subpathStart.x || current.y !== subpathStart.y) {
          points.push(subpathStart)
        }
        current = subpathStart
        break
      }
      default:
        return null
    }
  }

  return points
}

function parseSvgPath(pathData: string): Command[] {
  const tokens = tokenize(pathData)
  const commands: Command[] = []
  let index = 0
  let currentCode = ''
  let currentPoint = { x: 0, y: 0 }
  let subpathStart = { x: 0, y: 0 }

  while (index < tokens.length) {
    const token = tokens[index]
    if (isCommandToken(token)) {
      currentCode = token
      index += 1
    } else if (!currentCode) {
      return []
    }

    switch (currentCode) {
      case 'M':
      case 'm': {
        const values = readNumbers(tokens, index, 2)
        if (!values) return []
        index += 2
        currentPoint =
          currentCode === 'm'
            ? { x: currentPoint.x + values[0], y: currentPoint.y + values[1] }
            : { x: values[0], y: values[1] }
        subpathStart = currentPoint
        commands.push({ code: 'M', values: [currentPoint.x, currentPoint.y] })
        currentCode = currentCode === 'm' ? 'l' : 'L'
        break
      }
      case 'L':
      case 'l': {
        const values = readNumbers(tokens, index, 2)
        if (!values) return []
        index += 2
        currentPoint =
          currentCode === 'l'
            ? { x: currentPoint.x + values[0], y: currentPoint.y + values[1] }
            : { x: values[0], y: values[1] }
        commands.push({ code: 'L', values: [currentPoint.x, currentPoint.y] })
        break
      }
      case 'C':
      case 'c': {
        const values = readNumbers(tokens, index, 6)
        if (!values) return []
        index += 6
        const absolute =
          currentCode === 'c'
            ? [
                currentPoint.x + values[0],
                currentPoint.y + values[1],
                currentPoint.x + values[2],
                currentPoint.y + values[3],
                currentPoint.x + values[4],
                currentPoint.y + values[5]
              ]
            : values
        currentPoint = { x: absolute[4], y: absolute[5] }
        commands.push({ code: 'C', values: absolute })
        break
      }
      case 'Z':
      case 'z': {
        commands.push({ code: 'Z', values: [] })
        currentPoint = subpathStart
        currentCode = ''
        break
      }
      default:
        return []
    }
  }

  return commands
}

function tokenize(pathData: string): string[] {
  return pathData.match(/[AaCcHhLlMmQqSsTtVvZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []
}

function isCommandToken(token: string): boolean {
  return /^[AaCcHhLlMmQqSsTtVvZz]$/.test(token)
}

function readNumbers(tokens: string[], startIndex: number, count: number): number[] | null {
  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    const token = tokens[startIndex + index]
    if (!token || isCommandToken(token)) {
      return null
    }
    values.push(Number(token))
  }
  return values
}

function sampleCubicBezier(
  start: PathPolylinePoint,
  control1: PathPolylinePoint,
  control2: PathPolylinePoint,
  end: PathPolylinePoint,
  t: number
): PathPolylinePoint {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t

  return {
    x: mt2 * mt * start.x + 3 * mt2 * t * control1.x + 3 * mt * t2 * control2.x + t2 * t * end.x,
    y: mt2 * mt * start.y + 3 * mt2 * t * control1.y + 3 * mt * t2 * control2.y + t2 * t * end.y
  }
}

function approximateDistance(left: PathPolylinePoint, right: PathPolylinePoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}
