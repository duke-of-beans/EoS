// index.js
import EyeOfSauronOmniscient from './core/EyeOfSauronOmniscient.js';

export default EyeOfSauronOmniscient;
export { EyeOfSauronOmniscient };

// Optional: move UI-related code to a separate JS file or to your HTML.
export function renderScanResults(report) {
  const resultsContainer = document.getElementById('results');
  if (!resultsContainer) return;
  resultsContainer.innerHTML = '';

  const totalIssues = (report.issuesBySeverity.WARNING || 0) + (report.issuesBySeverity.DANGER || 0);

  if (totalIssues === 0) {
    const banner = document.createElement('div');
    banner.style.padding = '1em';
    banner.style.margin = '1em 0';
    banner.style.backgroundColor = '#2e7d32';
    banner.style.color = 'white';
    banner.style.textAlign = 'center';
    banner.style.borderRadius = '4px';
    banner.textContent = '🎉 No issues found. Your codebase is clean!';
    resultsContainer.appendChild(banner);
    return;
  }

  report.files.forEach((fileData) => {
    if (!fileData.issues || fileData.issues.length === 0) return;

    const toggle = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = fileData.file;
    toggle.appendChild(summary);

    const list = document.createElement('ul');
    fileData.issues.forEach((issue) => {
      const item = document.createElement('li');
      item.textContent = `[${issue.type}] ${issue.message}`;
      list.appendChild(item);
    });

    toggle.appendChild(list);
    resultsContainer.appendChild(toggle);
  });
}
