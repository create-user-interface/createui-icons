export interface Dictionary {
  meta: {
    title: string;
    description: string;
  };
  header: {
    logo: string;
    switchTo: string;
  };
  hero: {
    titleLine1: string;
    titleLine2: string;
    subtitleLine1: string;
    subtitleLine2: string;
    weightLabel: string;
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
    metric: string;
    rows: ReadonlyArray<{ metric: string; lucide: string; createui: string }>;
  };
  support: {
    title: string;
    description: string;
    progressLabel: string;
    recommended: string;
    caffeinePitch: {
      line1: string;
      line2: string;
    };
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
  };
}

export type Lang = 'en' | 'ru';
