import type { Easing } from '../model/types'

// Named preset control points matching CSS spec
const PRESETS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1]
}

// Cubic Bezier via Newton's method.
// Solves for Y given T on a cubic Bezier curve defined by two control points.
function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  // Compute X and Y using the standard cubic Bezier formula:
  // B(t) = 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³  (P0=0, P3=1)
  const ax = 3 * x1 - 3 * x2 + 1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1

  const ay = 3 * y1 - 3 * y2 + 1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1

  // Compute X(t) and its derivative for Newton's method
  const sampleX = (u: number): number => ((ax * u + bx) * u + cx) * u
  const sampleXDerivative = (u: number): number => (3 * ax * u + 2 * bx) * u + cx

  // Solve for u such that X(u) = t using Newton's method (~10 iterations)
  let u = t
  for (let i = 0; i < 10; i++) {
    const x = sampleX(u) - t
    const dx = sampleXDerivative(u)
    if (Math.abs(dx) < 1e-6) break
    u -= x / dx
  }

  // Return Y(u)
  return ((ay * u + by) * u + cy) * u
}

// Closed-form damped oscillation spring.
// Uses angular frequency derived from stiffness/mass and the damping ratio.
// Scaled so f(0)=0 and the settled value approaches 1.
function applySpring(mass: number, stiffness: number, damping: number, progress: number): number {
  if (progress <= 0) return 0
  if (progress >= 1) return 1

  const omega0 = Math.sqrt(stiffness / mass) // natural angular frequency
  const zeta = damping / (2 * Math.sqrt(stiffness * mass)) // damping ratio
  const t = progress

  let value: number
  if (zeta < 1) {
    // Under-damped: oscillates before settling
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta)
    value =
      1 -
      Math.exp(-zeta * omega0 * t) *
        (Math.cos(omegaD * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * t))
  } else if (zeta === 1) {
    // Critically damped
    value = 1 - Math.exp(-omega0 * t) * (1 + omega0 * t)
  } else {
    // Over-damped
    const alpha = omega0 * Math.sqrt(zeta * zeta - 1)
    const r1 = -zeta * omega0 + alpha
    const r2 = -zeta * omega0 - alpha
    value = 1 - (r1 * Math.exp(r2 * t) - r2 * Math.exp(r1 * t)) / (r1 - r2)
  }

  return value
}

export function applyEasing(easing: Easing, progress: number): number {
  if (typeof easing === 'string') {
    const [x1, y1, x2, y2] = PRESETS[easing]
    return cubicBezier(x1, y1, x2, y2, progress)
  }

  if (easing.kind === 'cubic-bezier') {
    return cubicBezier(easing.x1, easing.y1, easing.x2, easing.y2, progress)
  }

  if (easing.kind === 'spring') {
    return applySpring(easing.mass, easing.stiffness, easing.damping, progress)
  }

  // TypeScript exhaustiveness guard
  const _: never = easing
  return _
}
