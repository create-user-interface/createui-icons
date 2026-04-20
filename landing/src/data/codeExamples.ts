import { CDN, VERSION } from '../utils/iconUrl';

export interface CodeTab {
  id: string;
  label: string;
  code: string;
}

const CDN_SCRIPT = `${CDN}/${VERSION}/createui-icons.js`;

export const codeTabs: CodeTab[] = [
  {
    id: 'html',
    label: 'HTML',
    code: `<script src="${CDN_SCRIPT}" defer></` + `script>

<createui-icon name="heart" size="24" stroke="1.5"></createui-icon>
<createui-icon name="arrow-right" aria-label="Next"></createui-icon>`,
  },
  {
    id: 'react',
    label: 'React',
    code: `import '@createui-dev/icons';
import '@createui-dev/icons/types/react';

export function Button() {
  return (
    <button>
      <createui-icon name="heart" size={20} stroke={1.5} />
      Like
    </button>
  );
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    code: `<` + `script setup>
import '@createui-dev/icons';
</` + `script>

<template>
  <button>
    <createui-icon name="heart" :size="20" :stroke="1.5" />
    Like
  </button>
</template>

// vite.config.ts: mark <createui-icon> as a custom element
// vue({ template: { compilerOptions: {
//   isCustomElement: (tag) => tag === 'createui-icon',
// } } })`,
  },
  {
    id: 'svelte',
    label: 'Svelte',
    code: `<` + `script>
  import '@createui-dev/icons';
</` + `script>

<button>
  <createui-icon name="heart" size={20} stroke={1.5} />
  Like
</button>`,
  },
  {
    id: 'solid',
    label: 'SolidJS',
    code: `import '@createui-dev/icons';
import '@createui-dev/icons/types/solid';

export function Button() {
  return (
    <button>
      <createui-icon name="heart" size={20} stroke={1.5} />
      Like
    </button>
  );
}`,
  },
  {
    id: 'css',
    label: 'CSS mask',
    code: `/* Raw URL — for cases where you can't ship JS */
.icon-heart {
  display: inline-block;
  width: 24px;
  height: 24px;
  background-color: currentColor;
  mask: url('${CDN}/${VERSION}/heart.svg?stroke=1.5') no-repeat center / contain;
  -webkit-mask: url('${CDN}/${VERSION}/heart.svg?stroke=1.5') no-repeat center / contain;
}`,
  },
];
