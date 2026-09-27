// Variantes partilhadas — usadas nas listas/tabelas em toda a app.
// As linhas/cartões entram com um fade curto de 150ms, todas ao mesmo tempo
// (ao carregar e sempre que os filtros mudam), sem stagger nem deslocamento.
export const listVariants = {
    hidden: {},
    show: {},
};

export const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } },
};
