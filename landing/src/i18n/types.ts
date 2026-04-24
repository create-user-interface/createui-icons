export interface Dictionary {
  meta: {
    title: string;
    description: string;
  };
  header: {
    logo: string;
    switchTo: string;
    githubLabel: string;
  };
  hero: {
    titleLine1: string;
    titleLine2: string;
    subtitleLine1: string;
    subtitleLine2: string;
    weightLabel: string;
    stats: ReadonlyArray<{ value: string; label: string }>;
  };
  weightSpectrum: {
    title: string;
    subtitle: string;
    captionPrefix: string;
  };
  problems: {
    title: string;
    cards: ReadonlyArray<{ title: string; text: string }>;
  };
  howItWorks: {
    title: string;
    nodes: {
      request: string;
      edge: string;
      storage: string;
    };
    geo: {
      title: string;
      text: string;
    };
    cache: {
      title: string;
      textBefore: string;
      textAfter: string;
    };
    browserSupport: {
      title: string;
      text: string;
      browsers: ReadonlyArray<{ name: string; version: string }>;
    };
  };
  integration: {
    title: string;
    subtitle: string;
    copy: string;
    copied: string;
  };
  explorer: {
    title: string;
    searchPlaceholder: string;
    browseAll: string;
    notFound: string;
    browseLucide: string;
    copyUrl: string;
    copiedUrl: string;
    closeLabel: string;
    clearLabel: string;
  };
  performance: {
    title: string;
    subtitle: string;
    metric: string;
    columns: ReadonlyArray<string>;
    rows: ReadonlyArray<{ metric: string; values: ReadonlyArray<string>; highlightLast: boolean }>;
    footnote: string;
  };
  faq: {
    title: string;
    items: ReadonlyArray<{ q: string; a: string }>;
  };
  support: {
    title: string;
    intro: string;
    bmcButton: string;
    cryptoButton: string;
    sync: {
      header: string;
      cdnVersion: string;
      cdnBehind: string;
      npmLatest: string;
      lastSync: string;
      nextSync: string;
      footnote: string;
    };
    crypto: {
      title: string;
      copy: string;
      copied: string;
    };
  };
  footer: {
    attributionBefore: string;
    attributionAfter: string;
    licenseLabel: string;
    changelogLabel: string;
    statusLabel: string;
    statusOk: string;
    statusError: string;
  };
}

export type Lang = 'en' | 'ru';
