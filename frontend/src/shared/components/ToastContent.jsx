export default function ToastContent({ message, requestId }) {
  return <div className="notice-content" title={requestId ? `Support reference: ${requestId}` : undefined}>
    <p className="notice-content__message">{message}</p>
  </div>;
}
