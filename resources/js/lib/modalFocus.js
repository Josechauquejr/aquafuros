/**
 * Resolve o destino do foco quando Tab tentaria sair de um diálogo modal.
 * Retorna null quando o movimento nativo do browser deve continuar.
 */
export function modalTabTarget({ dialog, active, first, last, backwards }) {
    if (!first) return dialog;
    if (!dialog.contains(active)) return backwards ? last : first;
    if (backwards && (active === first || active === dialog)) return last;
    if (!backwards && (active === last || active === dialog)) return first;
    return null;
}
