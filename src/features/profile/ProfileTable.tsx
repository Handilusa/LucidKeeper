import { useState } from 'react';
import { Download, ExternalLink, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PROJECT } from '@/content/project';
import { exportRows, numberText, type ProfileRow } from './profileData';

export function ProfileTable({
  name,
  headers,
  rows,
  pending,
  failed,
  onRetry,
  account,
}: {
  name: string;
  headers: string[];
  rows: ProfileRow[];
  pending: boolean;
  failed: boolean;
  onRetry: () => void;
  account: string;
}) {
  const [sort, setSort] = useState({ index: 0, ascending: false });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  // Filter rows based on search query (market symbol, tx hash, side, status)
  const filtered = rows.filter((row) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    if (row.hash?.toLowerCase().includes(term)) return true;
    return row.cells.some((cell) => cell !== null && String(cell).toLowerCase().includes(term));
  });

  const sorted = [...filtered].sort((a, b) => {
    const x = a.cells[sort.index];
    const y = b.cells[sort.index];
    const result =
      x === null
        ? 1
        : y === null
          ? -1
          : typeof x === 'number' && typeof y === 'number'
            ? x - y
            : String(x).localeCompare(String(y));
    return sort.ascending ? result : -result;
  });

  const lastPage = Math.max(0, Math.ceil(sorted.length / 10) - 1);
  const currentPage = Math.min(page, lastPage);

  const renderCellContent = (cell: string | number | null, header: string) => {
    if (cell === null || cell === undefined) return <span className="cell-muted">—</span>;
    if (typeof cell === 'number') return numberText(cell, 8);

    const str = String(cell);
    // Badges for Side / Direction
    if (/Side|Direction|Movement|Status/i.test(header)) {
      if (/buy|long|deposit|paid/i.test(str)) {
        return <span className="table-badge badge-buy">{str}</span>;
      }
      if (/sell|short|withdraw|cancelled/i.test(str)) {
        return <span className="table-badge badge-sell">{str}</span>;
      }
      if (/filled|settled|credited/i.test(str)) {
        return <span className="table-badge badge-active">{str}</span>;
      }
      return <span className="table-badge badge-neutral">{str}</span>;
    }

    return str;
  };

  return (
    <section className="profile-table-panel" aria-label={name}>
      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <span className="table-record-count">
            {pending
              ? 'Loading indexed records…'
              : failed
                ? 'Read unavailable. Values from this source are hidden.'
                : `${rows.length} indexed records in window`}
          </span>
          {rows.length > 5 && (
            <input
              type="search"
              className="table-search-input"
              placeholder="Filter records…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              aria-label={`Filter ${name} records`}
            />
          )}
        </div>
        <button
          className="button table-export-btn"
          disabled={!rows.length || failed || pending}
          onClick={() =>
            exportRows(
              headers,
              sorted,
              `LucidKeeper-${name.toLowerCase().replaceAll(' ', '-')}.csv`,
              account
            )
          }
        >
          <Download size={13} className="btn-icon" />
          <span>Export CSV</span>
        </button>
      </div>

      {failed ? (
        <div className="profile-empty" role="status">
          <h3>Unable to read {name.toLowerCase()}</h3>
          <p>The public service did not return a fresh result.</p>
          <button className="button button-primary" onClick={onRetry}>
            Retry {name.toLowerCase()}
          </button>
        </div>
      ) : pending ? (
        <div className="profile-empty" role="status">
          <span className="loading-track" aria-hidden="true" />
          Reading Tokyo history…
        </div>
      ) : !rows.length ? (
        <div className="profile-empty">
          <h3>No {name.toLowerCase()} in this window</h3>
          <p>
            Try a longer window or inspect the account on the explorer. An empty indexer result is
            not proof of no on-chain activity.
          </p>
        </div>
      ) : (
        <>
          <div
            className="profile-table-scroll"
            role="region"
            aria-label={`${name} data, horizontally scrollable`}
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">
                {name}. Click a column heading to sort. All times UTC; all values testnet.
              </caption>
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={header}
                      scope="col"
                      aria-sort={
                        sort.index === index
                          ? sort.ascending
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="th-sort-btn"
                        onClick={() => {
                          setSort({
                            index,
                            ascending: sort.index === index ? !sort.ascending : true,
                          });
                          setPage(0);
                        }}
                      >
                        <span>{header}</span>
                        <span className="th-sort-icon" aria-hidden="true">
                          {sort.index === index ? (
                            sort.ascending ? (
                              <ArrowUp size={11} />
                            ) : (
                              <ArrowDown size={11} />
                            )
                          ) : (
                            <ArrowUpDown size={11} opacity={0.35} />
                          )}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(currentPage * 10, currentPage * 10 + 10).map((row) => (
                  <tr key={row.id}>
                    {row.cells.map((cell, index) => (
                      <td
                        key={index}
                        className={typeof cell === 'number' ? 'numeric' : undefined}
                        data-tone={
                          typeof cell === 'number' &&
                          cell !== 0 &&
                          /PnL|Realized/.test(headers[index])
                            ? cell > 0
                              ? 'positive'
                              : 'negative'
                            : undefined
                        }
                      >
                        {renderCellContent(cell, headers[index])}
                      </td>
                    ))}
                    <td>
                      {row.hash ? (
                        <a
                          className="table-receipt"
                          href={`${PROJECT.explorer}/tx/${row.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Transaction ${row.hash}`}
                        >
                          <span>{row.hash.slice(0, 8)}…</span>
                          <ExternalLink size={10} className="receipt-link-icon" />
                        </a>
                      ) : (
                        <span className="cell-muted">Current read</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-pagination">
            <button
              className="pagination-btn"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <span className="pagination-info">
              Page <strong>{currentPage + 1}</strong> of <strong>{lastPage + 1}</strong>
            </span>
            <button
              className="pagination-btn"
              disabled={currentPage >= lastPage}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
