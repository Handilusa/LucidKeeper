import { useState } from 'react';
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
  const sorted = [...rows].sort((a, b) => {
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
  const lastPage = Math.max(0, Math.ceil(rows.length / 10) - 1);
  const currentPage = Math.min(page, lastPage);
  return (
    <section className="profile-table-panel" aria-label={name}>
      <div className="table-toolbar">
        <p>
          {pending
            ? 'Loading indexed records…'
            : failed
              ? 'Read unavailable. Values from this source are hidden.'
              : `${rows.length} records in this window`}
        </p>
        <button
          className="button"
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
          Export CSV
        </button>
      </div>
      {failed ? (
        <div className="profile-empty" role="status">
          <h3>Unable to read {name.toLowerCase()}</h3>
          <p>The public service did not return a fresh result.</p>
          <button className="button" onClick={onRetry}>
            Retry {name.toLowerCase()}
          </button>
        </div>
      ) : pending ? (
        <div className="profile-empty" role="status">
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
                        onClick={() => {
                          setSort({
                            index,
                            ascending: sort.index === index ? !sort.ascending : true,
                          });
                          setPage(0);
                        }}
                      >
                        {header}{' '}
                        <span aria-hidden="true">
                          {sort.index === index ? (sort.ascending ? '↑' : '↓') : '↕'}
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
                      <td key={index} className={typeof cell === 'number' ? 'numeric' : undefined}>
                        {typeof cell === 'number' ? numberText(cell, 8) : (cell ?? '—')}
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
                          {row.hash.slice(0, 8)}… ↗
                        </a>
                      ) : (
                        <span>Current read</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-pagination">
            <button
              className="button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </button>
            <span>
              Page {currentPage + 1} of {lastPage + 1}
            </span>
            <button
              className="button"
              disabled={currentPage >= lastPage}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
