import { action, observable } from "mobx";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { normalizeUnfurlUrl } from "@shared/utils/urls";
import stores from "~/stores";
import HoverPreview from "~/components/HoverPreview";
import env from "~/env";

/**
 * Options for the HoverPreviews extension.
 */
interface HoverPreviewsOptions {
  /** Delay in milliseconds before the target is considered "hovered" and the preview is shown. */
  delay: number;
}

/**
 * Returns whether the pointer is still over an element or its descendants.
 *
 * @param element - Hover target element.
 * @return True when the element matches :hover.
 */
function isPointerStillOverElement(element: HTMLElement): boolean {
  return element.matches(":hover");
}

export default class HoverPreviews extends Extension<HoverPreviewsOptions> {
  state: {
    activeLinkElement: HTMLElement | null;
    unfurlId: string | null;
    dataLoading: boolean;
    closeRequested: boolean;
  } = observable({
    activeLinkElement: null,
    unfurlId: null,
    dataLoading: false,
    closeRequested: false,
  });

  get defaultOptions(): HoverPreviewsOptions {
    return {
      delay: 600,
    };
  }

  get name() {
    return "hover-previews";
  }

  get allowInReadOnly() {
    return true;
  }

  get plugins() {
    const isHoverTarget = (target: Element | null, _view: EditorView) =>
      target instanceof HTMLElement &&
      this.editor.elementRef.current?.contains(target);

    let hoveringTimeout: ReturnType<typeof setTimeout>;

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mouseover: (view: EditorView, event: MouseEvent) => {
              const target = (event.target as HTMLElement)?.closest(
                ".use-hover-preview"
              );

              if (!isHoverTarget(target, view)) {
                return false;
              }

              clearTimeout(hoveringTimeout);
              this.state.closeRequested = false;

              const element = target as HTMLElement;
              const rawUrl =
                element.getAttribute("href") || element.dataset.url;

              if (!rawUrl) {
                return false;
              }

              const unfurlUrl = normalizeUnfurlUrl(
                rawUrl.startsWith("/") ? `${env.URL}${rawUrl}` : rawUrl
              );
              const documentId = parseDocumentSlug(window.location.pathname);

              hoveringTimeout = setTimeout(
                action(async () => {
                  if (!isPointerStillOverElement(element)) {
                    return;
                  }

                  const cached = stores.unfurls.get(unfurlUrl);

                  if (cached?.data) {
                    this.state.activeLinkElement = element;
                    this.state.unfurlId = unfurlUrl;
                    this.state.dataLoading = false;
                    return;
                  }

                  this.state.dataLoading = true;

                  const unfurl = await stores.unfurls.fetchUnfurl({
                    url: unfurlUrl,
                    documentId,
                  });

                  if (!isPointerStillOverElement(element)) {
                    this.state.dataLoading = false;
                    return;
                  }

                  if (unfurl?.data) {
                    this.state.activeLinkElement = element;
                    this.state.unfurlId = unfurlUrl;
                  } else {
                    this.state.activeLinkElement = null;
                    this.state.unfurlId = null;
                  }

                  this.state.dataLoading = false;
                }),
                this.options.delay
              );

              return false;
            },
            mouseout: action((view: EditorView, event: MouseEvent) => {
              const target = (event.target as HTMLElement)?.closest(
                ".use-hover-preview"
              );

              if (!isHoverTarget(target, view)) {
                return false;
              }

              const related = event.relatedTarget;

              if (related instanceof Node && target?.contains(related)) {
                return false;
              }

              clearTimeout(hoveringTimeout);
              this.state.closeRequested = true;

              return false;
            }),
          },
        },
      }),
    ];
  }

  widget = () => (
    <HoverPreview
      element={this.state.activeLinkElement}
      unfurlId={this.state.unfurlId}
      dataLoading={this.state.dataLoading}
      closeRequested={this.state.closeRequested}
      onCancelClose={action(() => {
        this.state.closeRequested = false;
      })}
      onClose={action(() => {
        this.state.activeLinkElement = null;
        this.state.unfurlId = null;
        this.state.dataLoading = false;
        this.state.closeRequested = false;
      })}
    />
  );
}
