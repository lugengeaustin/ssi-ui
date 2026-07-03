// Link — compatibility alias for eresearch's barrel, which imports the Calm
// Studio link primitive from "./Link". The canonical implementation now lives
// in ./TextLink; re-export it so `export { TextLink, textLinkClass } from
// "./Link"` (and `TextLinkProps`) keeps resolving after migration to @ssi/ui.
export { TextLink, linkClass, textLinkClass } from "./TextLink";
export type { TextLinkProps } from "./TextLink";
