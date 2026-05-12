interface CryptoLoadingModalProps {
  headline: string;
  steps: string[];
}

export function CryptoLoadingModal({ headline, steps }: CryptoLoadingModalProps): React.JSX.Element {
  return (
    <div className="crypto-loading" role="status" aria-live="polite">
      <div className="crypto-loading__card">
        <div className="crypto-loading__particles" aria-hidden="true">
          <span>lock</span>
          <span>key</span>
          <span>pkt</span>
          <span>mac</span>
        </div>
        <p className="crypto-loading__headline">{headline}</p>
        <div className="crypto-loading__steps">
          {steps.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
