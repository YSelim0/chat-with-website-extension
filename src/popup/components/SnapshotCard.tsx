import editIconUrl from '../../assets/icons/edit.svg';
import refreshIconUrl from '../../assets/icons/refresh.svg';
import type { SnapshotSummary } from '../../types/page-context';
import { getSnapshotHelpText } from '../utils/popup-helpers';

export function SnapshotCard({
  activeHostname,
  activeSnapshot,
  errorMessage,
  isRefreshingContext,
  isUsingLiveSnapshot,
  latestSnapshot,
  snapshotAction,
  onOpenProviderSettings,
  onRefreshContext,
}: {
  activeHostname: string | null;
  activeSnapshot: SnapshotSummary | null;
  errorMessage: string | null;
  isRefreshingContext: boolean;
  isUsingLiveSnapshot: boolean;
  latestSnapshot: SnapshotSummary | null;
  snapshotAction: 'refresh' | 'setup' | null;
  onOpenProviderSettings: () => void;
  onRefreshContext: () => void;
}) {
  return (
    <section className="card card--accent-soft snapshot-card">
      <div className="snapshot-card__header">
        <div>
          <h2>Page snapshot</h2>
          <p className="helper-text helper-text--tight">
            {isUsingLiveSnapshot ? 'Live page context' : 'Archived snapshot'}
          </p>
        </div>
        <button
          className="button button--secondary"
          disabled={isRefreshingContext}
          onClick={onRefreshContext}
          type="button"
        >
          <img
            alt=""
            aria-hidden="true"
            className="button-icon"
            src={refreshIconUrl}
          />
          {isRefreshingContext ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {activeSnapshot ? (
        <div className="snapshot-meta">
          <p className="helper-text helper-text--body">
            {activeSnapshot.title}
          </p>
          <p className="helper-text helper-text--tight">
            {activeSnapshot.chunkCount} chunks · {activeSnapshot.textLength}{' '}
            characters
          </p>
          <p className="helper-text helper-text--tight">
            Extracted at {new Date(activeSnapshot.extractedAt).toLocaleString()}
          </p>
          {latestSnapshot && !isUsingLiveSnapshot ? (
            <p className="helper-text helper-text--tight">
              A newer live snapshot exists for {latestSnapshot.hostname}.
              Refresh to switch.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="empty-state-block">
          <p className="helper-text helper-text--body">
            {getSnapshotHelpText(errorMessage, activeHostname)}
          </p>
          <div className="empty-state-actions">
            {snapshotAction === 'refresh' ? (
              <button
                className="button button--secondary"
                disabled={isRefreshingContext}
                onClick={onRefreshContext}
                type="button"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="button-icon"
                  src={refreshIconUrl}
                />
                Retry scan
              </button>
            ) : null}
            {snapshotAction === 'setup' ? (
              <button
                className="button button--secondary"
                onClick={onOpenProviderSettings}
                type="button"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="button-icon"
                  src={editIconUrl}
                />
                Change model
              </button>
            ) : null}
            {!snapshotAction ? (
              <button
                className="button button--secondary"
                disabled={isRefreshingContext}
                onClick={onRefreshContext}
                type="button"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="button-icon"
                  src={refreshIconUrl}
                />
                Scan page
              </button>
            ) : null}
          </div>
        </div>
      )}

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
    </section>
  );
}
