export interface LinkTarget {
  k: "w" | "c";
  v: string;
  l: number;
}

export interface LinkResolver {
  /** maximal-munch segmentation of a prose string */
  segment(text: string): Array<{ text: string; target?: LinkTarget }>;
  char(han: string): LinkTarget | undefined;
}

export interface RenderCtx {
  resolver: LinkResolver;
  hrefBase: string;
  self?: { v: string; l: number };
}