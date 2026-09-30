import { useMemo, useState } from "react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import Pagination from "@/Components/Pagination";
import SecondaryButton from "@/Components/SecondaryButton";
import AnimatedButton from "@/Components/AnimatedButton";
import { cn } from "@/lib/utils";
import BulkBar from "./BulkBar";
import RowActions from "./RowActions";
import SortableHeader from "./SortableHeader";
import Toolbar, { chipsActivos } from "./Toolbar";
import useTableState from "./useTableState";

const checkboxClasses =
    "h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900";

function Barra({ className }) {
    return <div className={cn("h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800", className)} />;
}

/**
 * Tabela única das 4 páginas (Clientes, Leituras, Facturas, Pagamentos):
 * barra de ferramentas (pesquisa, período, filtros + chips), ordenação nos
 * cabeçalhos, acções por linha (1 visível + ⋮), selecção em massa, estados
 * vazio/carregamento, e cartões no móvel. Tudo vive na query string.
 *
 * - colunas: [{ chave, titulo, ordenavel?, direita?, className?, render(linha) }]
 * - cartao(linha): conteúdo do cartão móvel (sem selecção nem acções)
 * - accoes(linha): { principal?, menu? } — ver RowActions
 * - selecao: { acoes: [{ rotulo, icone, href?(ids), target?, onClick?(ids, limpar) }] }
 * - vazio: { mensagem, mensagemFiltrada?, accao?: { rotulo, icone, onClick, disabled } }
 * - filtrosConfig: [{ chave, rotulo, tipo: "select"|"checkbox"|"oculto", opcoes?, padrao }]
 *   ("oculto": só aparece como chip, sem controlo no painel — ex.: drill-down)
 * - padroes: valores assumidos pelo servidor quando o parâmetro não vem
 */
export default function DataTable({
    rota,
    filtros,
    padroes,
    paginador,
    colunas,
    cartao,
    linhaId = (linha) => linha.id,
    placeholder = "Pesquisar…",
    periodo = false,
    filtrosConfig = [],
    accoes,
    rotuloAccoes,
    selecao,
    vazio,
}) {
    const estado = useTableState({ rota, filtros, padroes });
    const { carregando, navegar, ordenar, setSearch } = estado;
    const linhas = paginador.data;
    const [seleccionados, setSeleccionados] = useState([]);

    const colunasOrdenaveis = useMemo(() => colunas.filter((coluna) => coluna.ordenavel), [colunas]);
    const chips = chipsActivos({ filtrosConfig, filtros, padroes, periodo });
    const temFiltros = chips.length > 0 || Boolean(estado.search);

    const idsVisiveis = linhas.map(linhaId);
    const todosSeleccionados = idsVisiveis.length > 0 && idsVisiveis.every((id) => seleccionados.includes(id));

    const alternar = (id) =>
        setSeleccionados((anterior) => (anterior.includes(id) ? anterior.filter((x) => x !== id) : [...anterior, id]));
    const alternarTodos = () =>
        setSeleccionados((anterior) =>
            todosSeleccionados
                ? anterior.filter((id) => !idsVisiveis.includes(id))
                : [...new Set([...anterior, ...idsVisiveis])],
        );
    const limparSelecao = () => setSeleccionados([]);

    const limparFiltros = () => {
        const alteracoes = { search: "" };
        chips.forEach((chip) => Object.assign(alteracoes, chip.limpar));
        setSearch("");
        navegar(alteracoes);
    };

    const nColunasTabela = colunas.length + (selecao ? 1 : 0) + (accoes ? 1 : 0);
    const VazioIcone = vazio?.accao?.icone;

    return (
        <div className="space-y-4">
            <AnimatedPanel className="p-4">
                <Toolbar
                    estado={estado}
                    filtros={filtros}
                    padroes={padroes}
                    placeholder={placeholder}
                    periodo={periodo}
                    filtrosConfig={filtrosConfig}
                    colunasOrdenaveis={colunasOrdenaveis}
                />
            </AnimatedPanel>

            {linhas.length === 0 && !carregando ? (
                <AnimatedPanel>
                    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {temFiltros
                                ? (vazio?.mensagemFiltrada ?? "Nenhum resultado para os filtros seleccionados.")
                                : (vazio?.mensagem ?? "Ainda não há registos.")}
                        </p>
                        {temFiltros ? (
                            <SecondaryButton type="button" onClick={limparFiltros}>
                                Limpar filtros
                            </SecondaryButton>
                        ) : (
                            vazio?.accao && (
                                <AnimatedButton variant="primary" onClick={vazio.accao.onClick} disabled={vazio.accao.disabled}>
                                    {VazioIcone && <VazioIcone className="h-4 w-4" aria-hidden="true" />}
                                    {vazio.accao.rotulo}
                                </AnimatedButton>
                            )
                        )}
                    </div>
                </AnimatedPanel>
            ) : (
                <>
                    {/* Cartões — móvel (<md): não há cabeçalhos, a ordenação está no painel de Filtros */}
                    <div className="space-y-3 md:hidden" aria-busy={carregando}>
                        {carregando
                            ? [0, 1, 2].map((i) => (
                                  <div
                                      key={i}
                                      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                                  >
                                      <Barra className="w-2/3" />
                                      <Barra className="w-1/2" />
                                      <Barra className="w-1/3" />
                                  </div>
                              ))
                            : linhas.map((linha) => {
                                  const id = linhaId(linha);
                                  const accao = accoes?.(linha);

                                  return (
                                      <div
                                          key={id}
                                          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                      >
                                          {selecao && (
                                              <input
                                                  type="checkbox"
                                                  checked={seleccionados.includes(id)}
                                                  onChange={() => alternar(id)}
                                                  className={cn(checkboxClasses, "mt-1")}
                                                  aria-label="Seleccionar linha"
                                              />
                                          )}
                                          <div className="min-w-0 flex-1">{cartao(linha)}</div>
                                          {accao && <RowActions {...accao} rotuloMenu={rotuloAccoes?.(linha)} />}
                                      </div>
                                  );
                              })}
                    </div>

                    {/* Tabela — a partir de md */}
                    <AnimatedPanel className="hidden overflow-hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm" aria-busy={carregando}>
                                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                                    <tr>
                                        {selecao && (
                                            <th scope="col" className="w-10 px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={todosSeleccionados}
                                                    onChange={alternarTodos}
                                                    className={checkboxClasses}
                                                    aria-label="Seleccionar todas as linhas visíveis"
                                                />
                                            </th>
                                        )}
                                        {colunas.map((coluna) => (
                                            <SortableHeader
                                                key={coluna.chave}
                                                coluna={coluna}
                                                sort={filtros.sort}
                                                dir={filtros.dir}
                                                onOrdenar={ordenar}
                                            />
                                        ))}
                                        {accoes && (
                                            <th
                                                scope="col"
                                                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                                            >
                                                Acções
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {carregando
                                        ? [0, 1, 2, 3, 4].map((i) => (
                                              <tr key={i}>
                                                  {Array.from({ length: nColunasTabela }).map((_, c) => (
                                                      <td key={c} className="px-4 py-4">
                                                          <Barra className={c % 2 ? "w-1/2" : "w-3/4"} />
                                                      </td>
                                                  ))}
                                              </tr>
                                          ))
                                        : linhas.map((linha) => {
                                              const id = linhaId(linha);
                                              const accao = accoes?.(linha);

                                              return (
                                                  <tr key={id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                      {selecao && (
                                                          <td className="px-4 py-3.5">
                                                              <input
                                                                  type="checkbox"
                                                                  checked={seleccionados.includes(id)}
                                                                  onChange={() => alternar(id)}
                                                                  className={checkboxClasses}
                                                                  aria-label="Seleccionar linha"
                                                              />
                                                          </td>
                                                      )}
                                                      {colunas.map((coluna) => (
                                                          <td
                                                              key={coluna.chave}
                                                              className={cn(
                                                                  "px-4 py-3.5 text-slate-700 dark:text-slate-300",
                                                                  coluna.direita && "text-right",
                                                                  coluna.className,
                                                              )}
                                                          >
                                                              {coluna.render(linha)}
                                                          </td>
                                                      ))}
                                                      {accoes && (
                                                          <td className="px-4 py-2">
                                                              {accao && <RowActions {...accao} rotuloMenu={rotuloAccoes?.(linha)} />}
                                                          </td>
                                                      )}
                                                  </tr>
                                              );
                                          })}
                                </tbody>
                            </table>
                        </div>
                    </AnimatedPanel>

                    <Pagination paginador={paginador} />
                </>
            )}

            {selecao && (
                <BulkBar total={seleccionados.length} acoes={selecao.acoes} ids={seleccionados} onCancelar={limparSelecao} />
            )}
        </div>
    );
}
