import { Link } from "@inertiajs/react";
import { useMemo, useRef, useState } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import Pagination from "@/Components/Pagination";
import SecondaryButton from "@/Components/SecondaryButton";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn } from "@/lib/utils";
import BulkBar from "./BulkBar";
import { useEcraGrande } from "./Dropdown";
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
 * Acções de uma linha tal como a página as descreve: os itens com
 * `expandir: true` abrem o cartão expandido em vez de correr um `onClick`.
 */
function resolverAccoes(accao, abrir) {
    if (!accao) return accao;
    const resolver = (item) => (item?.expandir ? { ...item, onClick: abrir } : item);

    return { ...accao, principal: resolver(accao.principal), menu: accao.menu?.map(resolver) };
}

/** Rodapé do cartão expandido: todas as acções da linha como botões com texto. */
function AccoesDoCartao({ accao, fechar }) {
    const itens = [accao.principal, ...(accao.menu ?? [])].filter((item) => item && !item.expandir && !item.abrirCartao);
    if (itens.length === 0) return null;

    const estilo = (tone) =>
        cn(
            "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tone === "danger"
                ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                : "border-border bg-background text-foreground hover:bg-muted",
        );

    return (
        <div className="flex flex-wrap gap-2">
            {itens.map((item) => {
                const Icone = item.icone;
                const conteudo = (
                    <>
                        {Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
                        {item.rotulo}
                    </>
                );

                if (item.disabled) {
                    return (
                        <span
                            key={item.rotulo}
                            title={item.motivo}
                            aria-disabled="true"
                            className={cn(estilo(item.tone), "cursor-not-allowed opacity-50")}
                        >
                            {conteudo}
                        </span>
                    );
                }

                if (item.href) {
                    return (
                        <Link key={item.rotulo} href={item.href} target={item.target} className={estilo(item.tone)}>
                            {conteudo}
                        </Link>
                    );
                }

                return (
                    <button
                        key={item.rotulo}
                        type="button"
                        className={estilo(item.tone)}
                        onClick={() => {
                            fechar();
                            item.onClick?.();
                        }}
                    >
                        {conteudo}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Tabela única das 4 páginas (Clientes, Leituras, Facturas, Pagamentos):
 * barra de ferramentas (pesquisa, período, filtros + chips), ordenação nos
 * cabeçalhos, acções por linha (1 visível + ⋮), selecção em massa, estados
 * vazio/carregamento, e cartões no móvel. Tudo vive na query string.
 *
 * A tabela mostra só o essencial; clicar numa linha (ou cartão) expande um
 * cartão com todos os dados (`detalhe`).
 *
 * - colunas: [{ chave, titulo, ordenavel?, direita?, className?, render(linha) }]
 * - cartao(linha): conteúdo do cartão móvel (sem selecção nem acções)
 * - detalhe: { titulo(linha), descricao?(linha), conteudo(linha) } — cartão expandido
 * - accoes(linha): { principal?, menu? } — ver RowActions; `expandir: true`
 *   num item abre o cartão expandido
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
    detalhe,
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
    const ecraGrande = useEcraGrande();
    const [seleccionados, setSeleccionados] = useState([]);
    const [aberta, setAberta] = useState(null);
    const ultimaAberta = useRef(null);

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

    // Linha com o cartão expandido aberto — lembra a última para o cartão não
    // ficar vazio durante a animação de fecho.
    const linhaAberta = aberta === null ? null : (linhas.find((linha) => linhaId(linha) === aberta) ?? null);
    if (linhaAberta) ultimaAberta.current = linhaAberta;
    const linhaDoCartao = linhaAberta ?? ultimaAberta.current;

    const abrirCartao = (linha) => detalhe && setAberta(linhaId(linha));

    const cliqueNaLinha = (evento, linha) => {
        if (!detalhe || evento.target.closest("a, button, input, label, select, [data-no-expand]")) return;
        abrirCartao(linha);
    };

    const accoesDe = (linha) => resolverAccoes(accoes?.(linha), () => abrirCartao(linha));

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
                    {!ecraGrande && (
                        <div className="space-y-3" aria-busy={carregando}>
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
                                      const accao = accoesDe(linha);
                                      const corpo = (
                                          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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

                                      if (!detalhe) return <div key={id}>{corpo}</div>;

                                      return (
                                          <ExpandableCard
                                              key={id}
                                              trigger={corpo}
                                              title={detalhe.titulo(linha)}
                                              description={detalhe.descricao?.(linha)}
                                              open={aberta === id}
                                              onOpenChange={(valor) => setAberta(valor ? id : null)}
                                              footer={accao && <AccoesDoCartao accao={accao} fechar={() => setAberta(null)} />}
                                          >
                                              {detalhe.conteudo(linha)}
                                          </ExpandableCard>
                                      );
                                  })}
                        </div>
                    )}

                    {/* Tabela — a partir de md */}
                    {ecraGrande && (
                        <AnimatedPanel className="overflow-hidden">
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
                                                  const accao = accoesDe(linha);

                                                  return (
                                                      <tr
                                                          key={id}
                                                          onClick={(evento) => cliqueNaLinha(evento, linha)}
                                                          onKeyDown={(evento) => {
                                                              if (evento.key === "Enter" && evento.target === evento.currentTarget) abrirCartao(linha);
                                                          }}
                                                          tabIndex={detalhe ? 0 : undefined}
                                                          title={detalhe ? "Ver todos os dados" : undefined}
                                                          className={cn(
                                                              "transition hover:bg-slate-50 dark:hover:bg-slate-800/40",
                                                              detalhe && "cursor-pointer focus:outline-none focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/40",
                                                          )}
                                                      >
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
                    )}

                    {/* Cartão expandido das linhas da tabela (no móvel cada cartão tem o seu) */}
                    {ecraGrande && detalhe && linhaDoCartao && (
                        <ExpandableCard
                            open={linhaAberta !== null}
                            onOpenChange={(valor) => !valor && setAberta(null)}
                            title={detalhe.titulo(linhaDoCartao)}
                            description={detalhe.descricao?.(linhaDoCartao)}
                            footer={
                                accoes && (
                                    <AccoesDoCartao accao={accoesDe(linhaDoCartao)} fechar={() => setAberta(null)} />
                                )
                            }
                        >
                            {detalhe.conteudo(linhaDoCartao)}
                        </ExpandableCard>
                    )}

                    <Pagination paginador={paginador} />
                </>
            )}

            {selecao && (
                <BulkBar total={seleccionados.length} acoes={selecao.acoes} ids={seleccionados} onCancelar={limparSelecao} />
            )}
        </div>
    );
}
