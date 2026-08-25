'use strict';

const state = {
  sourcePath: '',
  destination: '',
  files: [],
  selected: new Set(),
  busy: false,
  job: null
};

const $ = (selector) => document.querySelector(selector);
const sourceInput = $('#source-path');
const scanButton = $('#scan-button');
const cancelButton = $('#cancel-button');
const progressPanel = $('#progress-panel');
const progressBar = $('#progress-bar');
const progressLabel = $('#progress-label');
const progressPercent = $('#progress-percent');
const progressDetail = $('#progress-detail');
const resultCount = $('#result-count');
const resultsBody = $('#results-body');
const selectAll = $('#select-all');
const selectAllCheck = $('#select-all-check');
const chooseDestination = $('#choose-destination');
const recoveryPanel = $('#recovery-panel');
const selectedCount = $('#selected-count');
const destinationLabel = $('#destination-label');
const recoverButton = $('#recover-button');
const status = $('#status');
const filterPanel = $('#filter-panel');
const searchFilter = $('#search-filter');
const typeFilter = $('#type-filter');
const confidenceFilter = $('#confidence-filter');
const minSizeFilter = $('#min-size-filter');
const maxSizeFilter = $('#max-size-filter');
const filterSummary = $('#filter-summary');

function setStatus(message, tone = '') {
  status.textContent = message || '';
  status.className = `status ${tone}`.trim();
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = value;
  let unit = -1;
  while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit += 1; }
  return `${amount.toFixed(amount >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatOffset(value) {
  return `0x${Number(value).toString(16).toUpperCase().padStart(10, '0')}`;
}

function setStep(number) {
  document.querySelectorAll('.step').forEach((step) => step.classList.toggle('active', Number(step.dataset.step) <= number));
}

function setProgress(percent, label, detail) {
  const safePercent = Math.max(0, Math.min(100, percent || 0));
  progressBar.style.width = `${safePercent}%`;
  progressPercent.textContent = `${Math.round(safePercent)}%`;
  progressLabel.textContent = label;
  progressDetail.textContent = detail;
}

function setBusy(busy, job = null) {
  state.busy = busy;
  state.job = job;
  scanButton.disabled = busy;
  sourceInput.disabled = busy;
  cancelButton.disabled = !busy;
  progressPanel.classList.toggle('hidden', !busy);
  if (!busy) { scanButton.textContent = 'Start scan'; sourceInput.disabled = false; }
  else scanButton.textContent = job === 'recovery' ? 'Recovering…' : 'Scanning…';
}

function fileType(file) {
  return String(file.extension || `.${file.kind || 'unknown'}`).toLowerCase();
}

function getVisibleFiles() {
  const query = searchFilter.value.trim().toLowerCase();
  const type = typeFilter.value;
  const confidence = confidenceFilter.value;
  const minKB = Number.parseFloat(minSizeFilter.value);
  const maxKB = Number.parseFloat(maxSizeFilter.value);
  const hasMin = Number.isFinite(minKB) && minKB >= 0;
  const hasMax = Number.isFinite(maxKB) && maxKB >= 0;
  return state.files.filter((file) => {
    const searchable = `${file.name} ${file.kind} ${file.mime} ${file.extension}`.toLowerCase();
    const sizeKB = file.size / 1024;
    return (!query || searchable.includes(query)) &&
      (type === 'all' || fileType(file) === type) &&
      (confidence === 'all' || file.confidence === confidence) &&
      (!hasMin || sizeKB >= minKB) &&
      (!hasMax || sizeKB <= maxKB);
  });
}

function populateTypeFilter() {
  const current = typeFilter.value || 'all';
  const types = [...new Set(state.files.map(fileType))].sort();
  typeFilter.innerHTML = '<option value="all">All types</option>' + types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type.toUpperCase())}</option>`).join('');
  typeFilter.value = types.includes(current) ? current : 'all';
}

function refreshSelectionUI() {
  const count = state.selected.size;
  const visible = getVisibleFiles();
  const visibleSelected = visible.filter((file) => state.selected.has(file.id)).length;
  selectedCount.textContent = String(count);
  selectAll.disabled = visible.length === 0 || state.busy;
  selectAllCheck.disabled = visible.length === 0 || state.busy;
  chooseDestination.disabled = count === 0 || state.busy;
  recoverButton.disabled = count === 0 || !state.destination || state.busy;
  selectAll.textContent = visible.length > 0 && visibleSelected === visible.length ? 'Clear visible' : 'Select visible';
  selectAllCheck.checked = visible.length > 0 && visibleSelected === visible.length;
  recoveryPanel.classList.toggle('hidden', count === 0);
}

function renderResults() {
  const visible = getVisibleFiles();
  resultCount.textContent = String(visible.length);
  filterSummary.textContent = `Showing ${visible.length} of ${state.files.length} file${state.files.length === 1 ? '' : 's'}`;
  filterPanel.classList.toggle('hidden', state.files.length === 0);
  if (!state.files.length) {
    resultsBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-illustration">⌁</div><strong>No recognizable file fragments found</strong><span>Try a disk image or raw device with administrator/root permission.</span></td></tr>';
    refreshSelectionUI();
    return;
  }
  if (!visible.length) {
    resultsBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-illustration">⌕</div><strong>No files match these filters</strong><span>Adjust the filters or clear them to see all scan results.</span></td></tr>';
    refreshSelectionUI();
    return;
  }
  resultsBody.innerHTML = visible.map((file) => `
    <tr data-id="${escapeHtml(file.id)}">
      <td class="check-col"><input class="file-check" type="checkbox" data-id="${escapeHtml(file.id)}" ${state.selected.has(file.id) ? 'checked' : ''} aria-label="Select ${escapeHtml(file.name)}" /></td>
      <td><span class="file-name">${escapeHtml(file.name)}</span></td>
      <td><span class="file-kind">${escapeHtml(file.kind)}</span></td>
      <td><span class="offset">${formatOffset(file.offset)}</span></td>
      <td>${formatBytes(file.size)}</td>
      <td><span class="confidence ${file.confidence === 'low' ? 'low' : ''}">${escapeHtml(file.confidence)}</span></td>
    </tr>`).join('');
  resultsBody.querySelectorAll('.file-check').forEach((checkbox) => checkbox.addEventListener('change', () => {
    if (checkbox.checked) state.selected.add(checkbox.dataset.id); else state.selected.delete(checkbox.dataset.id);
    refreshSelectionUI();
  }));
  refreshSelectionUI();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderSources(sources) {
  const sourceList = $('#source-list');
  if (!sources.length) {
    sourceList.innerHTML = '<div class="empty-small">No sources detected. Enter a path manually.</div>';
    return;
  }
  sourceList.innerHTML = sources.map((source) => `<button class="source-option" data-path="${escapeHtml(source.path)}"><span class="source-icon">▣</span><span><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.path)}${source.requiresAdmin ? ' · admin/root may be required' : ''}</small></span></button>`).join('');
  sourceList.querySelectorAll('.source-option').forEach((button) => button.addEventListener('click', () => {
    sourceInput.value = button.dataset.path;
    state.sourcePath = button.dataset.path;
    setStatus('Source selected. Start a read-only scan when ready.');
  }));
}

async function loadSources() {
  try { renderSources(await window.recoveryAPI.listSources()); }
  catch { renderSources([]); }
}

async function startScan() {
  const source = sourceInput.value.trim();
  if (!source) { setStatus('Enter or choose a source path first.', 'error'); sourceInput.focus(); return; }
  state.sourcePath = source;
  state.destination = '';
  state.files = [];
  state.selected.clear();
  searchFilter.value = '';
  typeFilter.value = 'all';
  confidenceFilter.value = 'all';
  minSizeFilter.value = '';
  maxSizeFilter.value = '';
  destinationLabel.textContent = 'Choose a separate destination folder before starting.';
  renderResults();
  setStep(1);
  setBusy(true, 'scan');
  setProgress(0, 'Preparing read-only scan…', 'The source will not be modified');
  setStatus('Reading source. Large devices can take a while.');
  try {
    const files = await window.recoveryAPI.startScan(source);
    state.files = files;
    populateTypeFilter();
    renderResults();
    setStep(files.length ? 2 : 1);
    setProgress(100, 'Scan complete', `${files.length} recognizable fragment${files.length === 1 ? '' : 's'} found`);
    setStatus(files.length ? 'Review the results, filter them if needed, and select the files you want to recover.' : 'No recognizable file fragments were found.', files.length ? '' : 'error');
  } catch (error) {
    setStatus(error.message || 'The scan could not be completed.', 'error');
  } finally { setBusy(false); }
}

async function chooseRecoveryDestination() {
  if (!state.selected.size) return;
  const destination = await window.recoveryAPI.chooseDestination();
  if (!destination) return;
  state.destination = destination;
  destinationLabel.textContent = `Destination: ${destination}`;
  refreshSelectionUI();
  setStep(3);
  setStatus('Destination selected. Recovery will create new files there without overwriting existing files.');
}

async function startRecovery() {
  const items = state.files.filter((file) => state.selected.has(file.id));
  if (!items.length || !state.destination) return;
  setBusy(true, 'recovery');
  setProgress(0, 'Recovering selected files…', `Writing to ${state.destination}`);
  setStatus('Restoring copies to the destination folder.');
  try {
    const recovered = await window.recoveryAPI.startRecovery({ sourcePath: state.sourcePath, destination: state.destination, items });
    setProgress(100, 'Recovery complete', `${recovered.length} file${recovered.length === 1 ? '' : 's'} written successfully`);
    setStatus(`Recovery complete. ${recovered.length} file${recovered.length === 1 ? '' : 's'} were written to the destination.`, 'success');
    if (recovered.length) await window.recoveryAPI.openLocation(recovered[0].outputPath);
  } catch (error) {
    setStatus(error.message || 'Recovery could not be completed.', 'error');
  } finally { setBusy(false); }
}

scanButton.addEventListener('click', startScan);
sourceInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') startScan(); });
$('#refresh-sources').addEventListener('click', loadSources);
cancelButton.addEventListener('click', () => window.recoveryAPI.cancelJob());
selectAll.addEventListener('click', () => {
  const visible = getVisibleFiles();
  const allVisibleSelected = visible.length > 0 && visible.every((file) => state.selected.has(file.id));
  visible.forEach((file) => { if (allVisibleSelected) state.selected.delete(file.id); else state.selected.add(file.id); });
  renderResults();
});
selectAllCheck.addEventListener('change', () => {
  const visible = getVisibleFiles();
  visible.forEach((file) => { if (selectAllCheck.checked) state.selected.add(file.id); else state.selected.delete(file.id); });
  renderResults();
});
chooseDestination.addEventListener('click', chooseRecoveryDestination);
recoverButton.addEventListener('click', startRecovery);
[searchFilter, typeFilter, confidenceFilter, minSizeFilter, maxSizeFilter].forEach((control) => control.addEventListener('input', renderResults));
[typeFilter, confidenceFilter].forEach((control) => control.addEventListener('change', renderResults));
$('#clear-filters').addEventListener('click', () => {
  searchFilter.value = '';
  typeFilter.value = 'all';
  confidenceFilter.value = 'all';
  minSizeFilter.value = '';
  maxSizeFilter.value = '';
  renderResults();
});

window.recoveryAPI.onScanProgress((progress) => {
  const percent = progress.totalBytes ? (progress.bytesRead / progress.totalBytes) * 100 : 0;
  setProgress(percent, 'Scanning source…', `${formatBytes(progress.bytesRead)} read · ${progress.found || 0} candidate${progress.found === 1 ? '' : 's'}`);
});
window.recoveryAPI.onRecoveryProgress((progress) => {
  const percent = progress.total ? ((progress.current + (progress.bytesWritten ? .5 : 0)) / progress.total) * 100 : 0;
  setProgress(percent, 'Recovering selected files…', progress.file ? `Writing ${progress.file}` : 'Preparing files');
});
window.recoveryAPI.onScanError((payload) => setStatus(payload.message, 'error'));
window.recoveryAPI.onRecoveryError((payload) => setStatus(payload.message, 'error'));
window.recoveryAPI.onRecoveryComplete(() => refreshSelectionUI());

(async function init() {
  try {
    const info = await window.recoveryAPI.getAppInfo();
    $('#platform-badge').textContent = `${info.platform} · ${info.arch}`;
    $('#app-version').textContent = info.version;
  } catch { /* The static UI remains usable if app metadata is unavailable. */ }
  await loadSources();
})();
