import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  legalDocuments,
  type LegalDocumentId,
} from "../../lib/legalDocuments";
import { analyticsEvents, trackEvent } from "../../lib/analytics/mixpanel";

type LegalDocumentPageProps = {
  documentId: LegalDocumentId;
};

const getLineClassName = (line: string, index: number) => {
  if (index === 0) return "legal-document-body-title";
  if (line.startsWith("제")) return "legal-document-section-title";
  if (line === "부칙") return "legal-document-section-title";
  if (/^\d+\./.test(line)) return "legal-document-list-line";
  if (line.startsWith("* ")) return "legal-document-list-line";
  if (line.includes("\t")) return "legal-document-table-line";
  if (line.startsWith("시행일:")) return "legal-document-effective-line";

  return "legal-document-paragraph";
};

export const LegalDocumentPage = ({
  documentId,
}: LegalDocumentPageProps): JSX.Element => {
  const navigate = useNavigate();
  const document = legalDocuments[documentId];
  const lines = document.body.split("\n");

  useEffect(() => {
    trackEvent(analyticsEvents.PAGE_VIEWED, {
      page: documentId,
    });
  }, [documentId]);

  return (
    <main className="legal-document-page" aria-label={document.title}>
      <header className="legal-document-header">
        <button
          type="button"
          className="legal-document-back-button"
          aria-label="뒤로가기"
          onClick={() => navigate(-1)}
        >
          <svg
            aria-hidden="true"
            className="legal-document-back-icon"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </header>
      <article className="legal-document-content">
        <p className="legal-document-eyebrow">쓴바구니</p>
        <h1 className="legal-document-title">{document.title}</h1>
        <p className="legal-document-effective-date">
          시행일 {document.effectiveDate}
        </p>
        <div className="legal-document-body">
          {lines.map((line, index) =>
            line.trim() ? (
              <p className={getLineClassName(line, index)} key={`${index}-${line}`}>
                {line}
              </p>
            ) : (
              <div className="legal-document-break" key={`break-${index}`} />
            ),
          )}
        </div>
      </article>
    </main>
  );
};
