import type { JSX } from 'solid-js'
import type { IIconProps } from './icon.js'

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'createui-icon': JSX.HTMLAttributes<HTMLElement> & IIconProps
    }
  }
}

export {}
