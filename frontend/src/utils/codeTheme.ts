export const DEFAULT_CODE_THEME = 'github-light';
export const CODE_THEME_PREVIEW_SNIPPET = `<config enable="true" mode="preview">
  <!-- 预览当前代码高亮主题 -->
  <rule name="keyword" color="accent">enabled</rule>
  <path value="/workspace/demo" />
</config>`;

const NOTION_LIGHT_THEME = {
  displayName: 'Notion',
  name: 'notion-light',
  type: 'light',
  colors: {
    'editor.background': '#fbfbfa',
    'editor.foreground': '#37352f',
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
      settings: { foreground: '#708090' },
    },
    {
      scope: ['entity.name.tag', 'entity.name.section', 'entity.name.namespace', 'entity.name.type'],
      settings: { foreground: '#905' },
    },
    {
      scope: ['entity.other.attribute-name', 'entity.other.inherited-class'],
      settings: { foreground: '#690' },
    },
    {
      scope: ['meta.tag', 'meta.brace'],
      settings: { foreground: '#905' },
    },
    {
      scope: ['punctuation', 'punctuation.definition.tag'],
      settings: { foreground: '#905' },
    },
    {
      scope: ['string', 'punctuation.definition.string', 'string punctuation.section.embedded source'],
      settings: { foreground: '#0b78b5' },
    },
    {
      scope: ['keyword', 'storage.type', 'storage.modifier'],
      settings: { foreground: '#0b78b5' },
    },
    {
      scope: ['support', 'meta.property-name'],
      settings: { foreground: '#0b78b5' },
    },
    {
      scope: ['variable.other', 'variable.language', 'variable.function', 'variable.argument'],
      settings: { foreground: '#37352f' },
    },
  ],
} as const;

export const CODE_THEME_OPTIONS = [
  { value: 'notion-light', label: 'Notion', description: '贴近 Notion 的浅色代码风格，低饱和但更清楚。' },
  { value: 'github-light', label: 'GitHub Light', description: '当前默认主题，风格克制。' },
  { value: 'github-light-high-contrast', label: 'GitHub Light High Contrast', description: '更高对比度，适合强调标签和属性。' },
  { value: 'light-plus', label: 'Light Plus', description: 'VS Code 风格，颜色更鲜明。' },
  { value: 'vitesse-light', label: 'Vitesse Light', description: '清晰、现代，字符串和关键字区分明显。' },
  { value: 'catppuccin-latte', label: 'Catppuccin Latte', description: '柔和但不发灰，层次更清楚。' },
] as const;

export type CodeThemeOption = (typeof CODE_THEME_OPTIONS)[number];
export type CodeThemeValue = CodeThemeOption['value'];

const CODE_THEME_SET = new Set<string>(CODE_THEME_OPTIONS.map((option) => option.value));

export function normalizeCodeTheme(theme: string | null | undefined): CodeThemeValue {
  if (theme && CODE_THEME_SET.has(theme)) {
    return theme as CodeThemeValue;
  }
  return DEFAULT_CODE_THEME;
}

export function getCodeThemeRegistration(theme: CodeThemeValue) {
  if (theme === 'notion-light') {
    return NOTION_LIGHT_THEME as any;
  }
  return theme;
}

export function resetShikiThemeCache() {
  const globalThisForShiki = globalThis as {
    [key: symbol]: unknown;
  };

  const shikiParserSymbol = Symbol.for('blocknote.shikiParser');
  const shikiHighlighterPromiseSymbol = Symbol.for('blocknote.shikiHighlighterPromise');

  delete globalThisForShiki[shikiParserSymbol];
  delete globalThisForShiki[shikiHighlighterPromiseSymbol];
}
