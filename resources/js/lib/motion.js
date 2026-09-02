// Variantes de stagger partilhadas — usadas nas listas/tabelas em toda a
// app para as linhas/cartões entrarem em sequência (ao carregar e sempre
// que os filtros mudam), em vez de aparecerem estáticas.
export const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.035 } },
};

export const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};
