import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Expandable Card (badtzUI), adaptado para mostrar os dados completos de uma
 * linha (cliente, factura, pagamento, leitura):
 *  - sem imagem obrigatória;
 *  - `trigger` opcional: se existir, o cartão morfa para o cartão expandido
 *    (layoutId partilhado); se não, abre com um fade/escala (linhas de tabela);
 *  - modo controlado (`open`/`onOpenChange`) ou não controlado;
 *  - renderizado num portal (o conteúdo da página tem transform, o que
 *    quebraria o `position: fixed`).
 */
export function ExpandableCard({
  title,
  description,
  children,
  footer,
  trigger,
  open: openProp,
  onOpenChange,
  className,
  classNameExpanded,
}) {
  const [openInterno, setOpenInterno] = React.useState(false)
  const controlado = openProp !== undefined
  const active = controlado ? openProp : openInterno
  const id = React.useId()
  const cardRef = React.useRef(null)

  const setActive = React.useCallback(
    (valor) => {
      if (!controlado) setOpenInterno(valor)
      onOpenChange?.(valor)
    },
    [controlado, onOpenChange]
  )

  React.useEffect(() => {
    if (!active) return

    const onKeyDown = (event) => {
      if (event.key === "Escape") setActive(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [active, setActive])

  const layoutId = trigger ? `card-${id}` : undefined

  return (
    <>
      {trigger && (
        <motion.div
          layoutId={layoutId}
          role="button"
          tabIndex={0}
          aria-label={`Ver detalhes: ${title}`}
          aria-expanded={active}
          onClick={(event) => {
            // Cliques em links/botões dentro do cartão não o expandem.
            if (event.target.closest("a, button, input, label, [data-no-expand]")) return
            setActive(true)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.target === event.currentTarget) setActive(true)
          }}
          className={cn("cursor-pointer", className)}
        >
          {trigger}
        </motion.div>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {active && (
              <div className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/50 backdrop-blur-md dark:bg-black/60"
                  onClick={() => setActive(false)}
                  aria-hidden="true"
                />
                <motion.div
                  layoutId={layoutId}
                  ref={cardRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`titulo-${id}`}
                  initial={trigger ? undefined : { opacity: 0, scale: 0.96, y: 12 }}
                  animate={trigger ? undefined : { opacity: 1, scale: 1, y: 0 }}
                  exit={trigger ? undefined : { opacity: 0, scale: 0.97, y: 8 }}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className={cn(
                    "relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl",
                    classNameExpanded
                  )}
                >
                  <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
                    <div className="min-w-0">
                      {description && (
                        <p className="text-sm font-medium text-muted-foreground">{description}</p>
                      )}
                      <h3
                        id={`titulo-${id}`}
                        className="mt-0.5 break-words text-xl font-semibold text-foreground sm:text-2xl"
                      >
                        {title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      aria-label="Fechar"
                      title="Fechar"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setActive(false)}
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="min-h-0 flex-1 overflow-y-auto p-5 text-base sm:p-6"
                  >
                    {children}
                  </motion.div>

                  {footer && (
                    <div className="border-t border-border bg-muted/40 p-4 sm:px-6">{footer}</div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
