# @createui-dev/icons

Framework-agnostic icon web component for [Create UI](https://createui.dev). One custom element, ~1.5 kB gzip, 1939 Lucide icons served as CSS-masked SVGs from the CDN.

- **No framework coupling.** Works with React, Solid, Vue, Svelte, Preact, Lit, or plain HTML.
- **No icon bundle.** Icons are fetched lazily from `https://icon.createui.dev`. Unused icons = 0 bytes shipped.
- **Version-pinned.** The package version matches the Lucide version — icons never silently drift between releases.
- **Styled with `currentColor`.** Color, size, and stroke width are all controllable from CSS or attributes.

---

## Install

```sh
npm i @createui-dev/icons
```

Or skip the install entirely and use the CDN:

```html
<script src="https://icon.createui.dev/1.8.0/createui-icons.js"></script>
```

---

## Usage

### Plain HTML / CDN

```html
<script src="https://icon.createui.dev/1.8.0/createui-icons.js"></script>

<createui-icon name="arrow-right" size="24" stroke="1.5"></createui-icon>
<createui-icon name="heart" aria-label="Favorite"></createui-icon>
```

One `<script>` tag registers `<createui-icon>` globally. Works anywhere HTML works — CMS snippets, email templates with inline HTML, MDX, plain `.html` files.

### React

```tsx
import '@createui-dev/icons'
import '@createui-dev/icons/types/react'

export function Button() {
  return <createui-icon name="arrow-right" size={24} stroke={1.5} />
}
```

The `/types/react` import adds JSX typings only — it compiles to an empty module (0 bytes runtime). All standard HTML attributes (`className`, `onClick`, `ref`, `aria-*`) are available.

### Solid

```tsx
import '@createui-dev/icons'
import '@createui-dev/icons/types/solid'

export function Button() {
  return <createui-icon name="check" size={20} />
}
```

### Vue 3

```vue
<script setup>
import '@createui-dev/icons'
</script>

<template>
  <createui-icon name="search" :size="24" />
</template>
```

Vue needs to be told the tag is a custom element, not a Vue component. In `vite.config.ts`:

```ts
vue({
  template: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'createui-icon',
    },
  },
})
```

### Svelte

```svelte
<script>
  import '@createui-dev/icons'
</script>

<createui-icon name="menu" size={24} />
```

Svelte handles custom elements natively — no extra configuration needed.

### Imperative (any framework)

```ts
import { createIcon } from '@createui-dev/icons'

const icon = createIcon('bell', 32, 2)
document.body.appendChild(icon)
```

Or via the CDN global:

```html
<script src="https://icon.createui.dev/1.8.0/createui-icons.js"></script>
<script>
  document.body.appendChild(CreateUIIcons.createIcon('bell', 32, 2))
</script>
```

---

## API

### Attributes

| Attribute         | Type        | Default | Description                                                               |
| ----------------- | ----------- | ------- | ------------------------------------------------------------------------- |
| `name`            | `TIconName` | —       | Lucide icon name in kebab-case (`arrow-right`, `heart`, …). **Required.** |
| `size`            | `number`    | `16`    | Icon size in pixels.                                                      |
| `stroke`          | `number`    | `2`     | Stroke width. Clamped to `0.25–10`, quantized to `0.25` steps.            |
| `aria-label`      | `string`    | —       | When present, the icon is announced by screen readers.                    |
| `aria-labelledby` | `string`    | —       | Same as above, but references an element ID with the label text.          |

### Properties

Attributes are reflected as properties. You can read and write them imperatively:

```ts
const icon = document.querySelector('createui-icon')!
icon.name = 'settings' // autocompletes from TIconName
icon.size = 24
icon.stroke = 1.25
```

### `createIcon(name, size?, stroke?)`

Factory for programmatic creation. Returns a typed `CreateUIIconElement`. Throws if called without a `document` (e.g. SSR).

### Types

```ts
import type { TIconName, IIconProps, CreateUIIconElement } from '@createui-dev/icons'
```

- `TIconName` — union of all valid icon names for this version.
- `IIconProps` — `{ name: TIconName; size?: number; stroke?: number }`.
- `CreateUIIconElement` — DOM element type (extends `HTMLElement`).

---

## Styling

Color follows `currentColor` — style it like any text:

```css
createui-icon {
  color: tomato;
}

.dark createui-icon {
  color: white;
}

button:hover createui-icon {
  color: var(--accent);
}
```

Size can be driven from CSS too:

```css
createui-icon {
  --createui-icon-size: 48px;
}
```

The `size` attribute wins if set on the element directly.

---

## Accessibility

By default icons are decorative: `role="img"` + `aria-hidden="true"`. Screen readers skip them.

Add an `aria-label` (or `aria-labelledby`) when the icon carries meaning on its own:

```html
<!-- Decorative — hidden from screen readers -->
<button>
  <createui-icon name="x"></createui-icon>
  Close
</button>

<!-- Meaningful — announced as "Favorite" -->
<button aria-label="Favorite">
  <createui-icon name="heart"></createui-icon>
</button>

<!-- Standalone -->
<createui-icon name="triangle-alert" aria-label="Warning"></createui-icon>
```

Defaults live in `ElementInternals`, so they don't pollute the host DOM — any explicit `aria-*` attribute you set wins.

---

## Browser support

- Chrome / Edge 90+
- Firefox 126+
- Safari 16.4+

Requires `ElementInternals` and Shadow DOM. CSS `mask-*` properties are shipped with `-webkit-` fallbacks for older Safari.

---

## How it works

When the element is connected, it builds a URL:

```
https://icon.createui.dev/{LUCIDE_VERSION}/{name}.svg?stroke={value}
```

and sets it as a CSS `mask-image`, with `background-color: currentColor` as the fill. Stroke values are quantized client-side (to `0.25` steps) so the CDN cache key stays stable.

Because the Lucide version is baked into the URL, icons from a given `@createui-dev/icons` release always resolve to the same SVGs — immutable, safe to cache forever.

---

## License

MIT
