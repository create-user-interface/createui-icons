import type * as React from 'react'
import type { IIconProps } from './icon'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'createui-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & IIconProps
    }
  }
}

export {}
