export default function BackButton({ onClick }) {
  return (
    <div className="back-button-row">
      <button type="button" className="back-button" onClick={onClick}>
        Back
      </button>
    </div>
  );
}
