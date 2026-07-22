// Renders a receipt DOM node to a PNG and triggers a download. html2canvas is
// imported lazily so it stays out of the initial bundle (only the receipt view needs it).
export async function downloadReceiptPng(node, filename = 'azcuts-receipt.png') {
  if (!node) return false;
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true,
    logging: false,
  });
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
