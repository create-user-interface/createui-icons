import { LUCIDE_VERSION } from './version'
import type { TIconName } from './icon-names.types'

export type { TIconName }
export { LUCIDE_VERSION }

export interface IIconProps {
  name: TIconName
  size?: number
  stroke?: number
}

export interface CreateUIIconElement extends HTMLElement {
  name: TIconName
  size: number
  stroke: number
}

const BASE_URL = 'https://icon.createui.dev'
const STROKE_MIN = 0.25
const STROKE_MAX = 10
const STROKE_STEP = 0.25
const STROKE_DEFAULT = 2
const SIZE_DEFAULT = 16
const NAME_PATTERN = /^[a-z0-9-]+$/

function validateSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    console.warn(
      `<createui-icon>: invalid size "${value}" (expected positive finite number) — falling back to ${SIZE_DEFAULT}`,
    )
    return SIZE_DEFAULT
  }
  return value
}

function quantizeStroke(value: number): number {
  if (!Number.isFinite(value)) {
    console.warn(
      `<createui-icon>: invalid stroke "${value}" (expected finite number) — falling back to ${STROKE_DEFAULT}`,
    )
    return STROKE_DEFAULT
  }
  const clamped = Math.max(STROKE_MIN, Math.min(STROKE_MAX, value))
  return Math.round(clamped / STROKE_STEP) * STROKE_STEP
}

function buildUrl(name: string, stroke: number): string {
  return `${BASE_URL}/${LUCIDE_VERSION}/${name}.svg?stroke=${stroke}`
}

export function createIcon(
  name: TIconName,
  size: number = SIZE_DEFAULT,
  stroke: number = STROKE_DEFAULT,
): CreateUIIconElement {
  if (typeof document === 'undefined') {
    throw new Error('<createui-icon>: createIcon() requires a browser environment')
  }
  const el = document.createElement('createui-icon')
  el.setAttribute('name', name)
  el.setAttribute('size', String(size))
  el.setAttribute('stroke', String(stroke))
  return el
}

if (typeof customElements !== 'undefined') {
  const OBSERVED = ['name', 'size', 'stroke', 'aria-label', 'aria-labelledby'] as const
  type ObservedAttribute = (typeof OBSERVED)[number]

  const HOST_STYLES = `
:host {
  display: inline-block;
  width: var(--createui-icon-size, ${SIZE_DEFAULT}px);
  height: var(--createui-icon-size, ${SIZE_DEFAULT}px);
  background-color: currentColor;
  -webkit-mask-image: var(--createui-icon-mask, none);
  mask-image: var(--createui-icon-mask, none);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  vertical-align: middle;
  flex-shrink: 0;
}
:host(:not([name])),
:host([name=""]) {
  display: none;
}
`

  class CreateUIIcon extends HTMLElement {
    static observedAttributes = OBSERVED

    private internals: ElementInternals
    private firstConnected = false

    constructor() {
      super()
      this.internals = this.attachInternals()
      this.internals.role = 'img'
      this.updateA11y()

      const shadow = this.attachShadow({ mode: 'open' })
      const style = document.createElement('style')
      style.textContent = HOST_STYLES
      shadow.appendChild(style)
    }

    get name(): TIconName {
      return (this.getAttribute('name') ?? '') as TIconName
    }
    set name(value: TIconName) {
      this.setAttribute('name', value)
    }

    get size(): number {
      const attr = this.getAttribute('size')
      return attr == null ? SIZE_DEFAULT : Number(attr)
    }
    set size(value: number) {
      this.setAttribute('size', String(value))
    }

    get stroke(): number {
      const attr = this.getAttribute('stroke')
      return attr == null ? STROKE_DEFAULT : Number(attr)
    }
    set stroke(value: number) {
      this.setAttribute('stroke', String(value))
    }

    connectedCallback() {
      this.firstConnected = true
      this.render()
    }

    attributeChangedCallback(name: ObservedAttribute) {
      if (name === 'aria-label' || name === 'aria-labelledby') {
        this.updateA11y()
        return
      }
      if (this.firstConnected) this.render()
    }

    private updateA11y() {
      const hasLabel =
        this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')
      this.internals.ariaHidden = hasLabel ? null : 'true'
    }

    private render() {
      const name = this.getAttribute('name')
      if (!name) return
      if (!NAME_PATTERN.test(name)) {
        console.warn(`<createui-icon>: invalid name "${name}" (allowed: a-z, 0-9, hyphen)`)
        return
      }
      const size = validateSize(Number(this.getAttribute('size') ?? SIZE_DEFAULT))
      const stroke = quantizeStroke(Number(this.getAttribute('stroke') ?? STROKE_DEFAULT))
      const src = buildUrl(name, stroke)

      this.style.setProperty('--createui-icon-size', `${size}px`)
      this.style.setProperty('--createui-icon-mask', `url('${src}')`)
    }
  }

  customElements.define('createui-icon', CreateUIIcon)
}

declare global {
  interface HTMLElementTagNameMap {
    'createui-icon': CreateUIIconElement
  }
}
