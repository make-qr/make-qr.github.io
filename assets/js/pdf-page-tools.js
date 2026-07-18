(() => {
    'use strict';

    if (window.__makeQrPdfPageToolsLoaded) return;
    window.__makeQrPdfPageToolsLoaded = true;

    const TOOL_CONFIG = {
        split: {
            action: 'Split PDF',
            selection: false
        },
        rotate: {
            action: 'Download rotated PDF',
            selection: true,
            selectLabel: 'Rotate'
        },
        delete: {
            action: 'Delete selected pages',
            selection: true,
            selectLabel: 'Delete'
        },
        extract: {
            action: 'Extract selected pages',
            selection: true,
            selectLabel: 'Extract'
        },
        organize: {
            action: 'Download organized PDF',
            selection: false
        }
    };

    class PdfPageTools {
        constructor(root) {
            this.root = root;
            this.mode = root.dataset.pdfTool;
            this.config = TOOL_CONFIG[this.mode];
            this.file = null;
            this.bytes = null;
            this.pdfJsDocument = null;
            this.pages = [];
            this.resultUrls = [];
            this.idCounter = 0;
            this.draggedPageId = null;
            this.busy = false;

            this.elements = {
                dropZone: root.querySelector('[data-role="drop-zone"]'),
                fileInput: root.querySelector('[data-role="file-input"]'),
                workspace: root.querySelector('[data-role="workspace"]'),
                summary: root.querySelector('[data-role="summary"]'),
                toolbar: root.querySelector('[data-role="toolbar"]'),
                modeControls: root.querySelector('[data-role="mode-controls"]'),
                pageGrid: root.querySelector('[data-role="page-grid"]'),
                processButton: root.querySelector('[data-action="process"]'),
                resetButton: root.querySelector('[data-action="reset"]'),
                progress: root.querySelector('[data-role="progress"]'),
                progressBar: root.querySelector('[data-role="progress-bar"]'),
                progressText: root.querySelector('[data-role="progress-text"]'),
                error: root.querySelector('[data-role="error"]'),
                status: root.querySelector('[data-role="status"]'),
                results: root.querySelector('[data-role="results"]'),
                resultList: root.querySelector('[data-role="result-list"]')
            };

            if (!this.config) {
                this.showError('Unknown PDF tool.');
                return;
            }
            this.initialize();
        }

        initialize() {
            if (!window.pdfjsLib || !window.PDFLib) {
                this.showError('PDF libraries could not be loaded. Check your connection and refresh the page.');
                return;
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

            this.elements.processButton.textContent = this.config.action;
            this.bindUpload();
            this.bindActions();
            this.renderModeControls();
            this.renderToolbar();
        }

        bindUpload() {
            const { dropZone, fileInput } = this.elements;
            dropZone.addEventListener('click', event => {
                if (!event.target.closest('label')) fileInput.click();
            });
            dropZone.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInput.click();
                }
            });
            ['dragenter', 'dragover'].forEach(type => {
                dropZone.addEventListener(type, event => {
                    event.preventDefault();
                    dropZone.classList.add('dragover');
                });
            });
            ['dragleave', 'drop'].forEach(type => {
                dropZone.addEventListener(type, event => {
                    event.preventDefault();
                    dropZone.classList.remove('dragover');
                });
            });
            dropZone.addEventListener('drop', event => this.openFile(event.dataTransfer.files[0]));
            fileInput.addEventListener('change', event => {
                this.openFile(event.target.files[0]);
                event.target.value = '';
            });
        }

        bindActions() {
            this.elements.processButton.addEventListener('click', () => this.process());
            this.elements.resetButton.addEventListener('click', () => this.reset());
            window.addEventListener('pagehide', () => this.releaseResources(), { once: true });
        }

        async openFile(file) {
            if (!file || this.busy) return;
            this.hideError();

            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                this.showError('Please choose a PDF file.');
                return;
            }

            this.setBusy(true, 'Reading PDF…');
            this.releaseDocument();
            this.clearResults();

            try {
                const bytes = await file.arrayBuffer();
                const signature = new TextDecoder('latin1').decode(bytes.slice(0, 5));
                if (signature !== '%PDF-') throw new Error('INVALID_PDF');

                const pdfJsDocument = await pdfjsLib.getDocument({
                    data: new Uint8Array(bytes.slice(0))
                }).promise;

                this.file = file;
                this.bytes = bytes;
                this.pdfJsDocument = pdfJsDocument;
                this.pages = Array.from({ length: pdfJsDocument.numPages }, (_, index) => ({
                    id: this.nextId(),
                    sourceIndex: index,
                    rotation: 0,
                    selected: this.mode === 'extract',
                    thumbnail: null
                }));

                if (pdfJsDocument.numPages > 500 || file.size > 150 * 1024 * 1024) {
                    this.setStatus('Large PDF detected. Processing speed depends on your device memory.');
                } else {
                    this.setStatus(`${file.name} loaded.`);
                }

                this.render();
                await this.renderThumbnails();
            } catch (error) {
                console.error('Unable to open PDF:', error);
                this.releaseDocument();
                const message = error?.name === 'PasswordException'
                    ? 'Password-protected PDFs are not supported in this browser-only tool.'
                    : 'This PDF could not be opened. It may be damaged, incomplete, or password-protected.';
                this.showError(message);
            } finally {
                this.setBusy(false);
                this.render();
            }
        }

        async renderThumbnails() {
            for (let index = 0; index < this.pages.length; index++) {
                if (!this.pdfJsDocument) return;
                this.updateProgress(index, this.pages.length, 'Creating page previews');
                try {
                    const page = await this.pdfJsDocument.getPage(this.pages[index].sourceIndex + 1);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = Math.min(0.3, 160 / baseViewport.width);
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.ceil(viewport.width);
                    canvas.height = Math.ceil(viewport.height);
                    await page.render({
                        canvasContext: canvas.getContext('2d'),
                        viewport
                    }).promise;
                    this.pages[index].thumbnail = canvas.toDataURL('image/jpeg', 0.75);
                    this.updatePageThumbnail(this.pages[index]);
                } catch (error) {
                    console.warn(`Unable to render page ${index + 1}`, error);
                }
            }
            this.updateProgress(this.pages.length, this.pages.length, 'Page previews ready');
            this.elements.progress.hidden = true;
        }

        render() {
            const hasFile = Boolean(this.file);
            this.elements.workspace.hidden = !hasFile;
            this.elements.processButton.disabled = !hasFile || this.busy || !this.isValidAction();
            this.elements.resetButton.disabled = !hasFile || this.busy;

            if (!hasFile) return;

            const selected = this.pages.filter(page => page.selected).length;
            const rotationCount = this.pages.filter(page => page.rotation !== 0).length;
            let detail = `${this.pages.length} pages`;
            if (this.mode === 'delete') detail += ` · ${selected} selected for deletion`;
            if (this.mode === 'extract') detail += ` · ${selected} selected for extraction`;
            if (this.mode === 'rotate') detail += ` · ${selected} selected · ${rotationCount} rotated`;
            this.elements.summary.textContent =
                `${this.file.name} · ${this.formatSize(this.file.size)} · ${detail}`;

            this.renderPages();
        }

        renderPages() {
            this.elements.pageGrid.replaceChildren();

            this.pages.forEach((page, index) => {
                const card = document.createElement('article');
                card.className = `pdf-page-card${page.selected ? ' is-selected' : ''}`;
                card.dataset.pageId = page.id;
                card.setAttribute('role', 'listitem');
                if (this.mode === 'organize') {
                    card.draggable = true;
                    this.bindDrag(card);
                }

                if (this.config.selection) {
                    const label = document.createElement('label');
                    label.className = 'pdf-page-select';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = page.selected;
                    checkbox.setAttribute(
                        'aria-label',
                        `${this.config.selectLabel} page ${page.sourceIndex + 1}`
                    );
                    checkbox.addEventListener('change', () => {
                        page.selected = checkbox.checked;
                        this.clearResults();
                        this.render();
                    });
                    label.append(checkbox, document.createTextNode(` ${this.config.selectLabel}`));
                    card.append(label);
                }

                const frame = document.createElement('div');
                frame.className = 'pdf-thumbnail-frame';
                frame.dataset.thumbnailFor = page.id;
                if (page.thumbnail) frame.append(this.createThumbnail(page));

                const pageLabel = document.createElement('div');
                pageLabel.className = 'pdf-page-label';
                pageLabel.textContent = this.mode === 'organize'
                    ? `Position ${index + 1} · Original page ${page.sourceIndex + 1}`
                    : `Page ${page.sourceIndex + 1}`;

                card.append(frame, pageLabel);

                if (this.mode === 'rotate' || this.mode === 'organize') {
                    card.append(this.createPageActions(page, index));
                }

                this.elements.pageGrid.append(card);
            });
        }

        createThumbnail(page) {
            const image = document.createElement('img');
            image.className = 'pdf-thumbnail';
            image.src = page.thumbnail;
            image.alt = `Preview of original page ${page.sourceIndex + 1}`;
            image.style.transform = `rotate(${page.rotation}deg)`;
            return image;
        }

        updatePageThumbnail(page) {
            const frame = this.elements.pageGrid.querySelector(
                `[data-thumbnail-for="${page.id}"]`
            );
            if (frame && page.thumbnail) frame.replaceChildren(this.createThumbnail(page));
        }

        createPageActions(page, index) {
            const actions = document.createElement('div');
            actions.className = 'pdf-page-actions';
            actions.append(
                this.actionButton('↶', 'Rotate page left', () => this.rotatePage(page.id, -90)),
                this.actionButton('↷', 'Rotate page right', () => this.rotatePage(page.id, 90))
            );

            if (this.mode === 'organize') {
                actions.append(
                    this.actionButton('⧉', 'Duplicate page', () => this.duplicatePage(page.id)),
                    this.actionButton('←', 'Move page left', () => this.movePage(index, index - 1)),
                    this.actionButton('→', 'Move page right', () => this.movePage(index, index + 1)),
                    this.actionButton('✕', 'Remove page', () => this.removePage(page.id), true)
                );
            } else {
                actions.append(
                    this.actionButton('0°', 'Reset page rotation', () => this.resetPageRotation(page.id))
                );
            }
            return actions;
        }

        actionButton(text, label, handler, danger = false) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = text;
            button.setAttribute('aria-label', label);
            if (danger) button.classList.add('danger');
            button.addEventListener('click', handler);
            return button;
        }

        renderToolbar() {
            const toolbar = this.elements.toolbar;
            toolbar.replaceChildren();

            if (this.config.selection) {
                [
                    ['All', () => this.selectBy(() => true)],
                    ['None', () => this.selectBy(() => false)],
                    ['Odd', page => (page.sourceIndex + 1) % 2 === 1],
                    ['Even', page => (page.sourceIndex + 1) % 2 === 0],
                    ['Invert', page => !page.selected]
                ].forEach(([label, predicate]) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = label;
                    button.addEventListener('click', () => this.selectBy(predicate));
                    toolbar.append(button);
                });
            }

            if (this.mode === 'rotate') {
                const left = document.createElement('button');
                left.type = 'button';
                left.textContent = 'Rotate selected left';
                left.addEventListener('click', () => this.rotateSelected(-90));
                const right = document.createElement('button');
                right.type = 'button';
                right.textContent = 'Rotate selected right';
                right.addEventListener('click', () => this.rotateSelected(90));
                const reset = document.createElement('button');
                reset.type = 'button';
                reset.textContent = 'Reset rotations';
                reset.addEventListener('click', () => {
                    this.pages.forEach(page => { page.rotation = 0; });
                    this.clearResults();
                    this.render();
                });
                toolbar.append(left, right, reset);
            }

            if (!toolbar.children.length) toolbar.hidden = true;
        }

        renderModeControls() {
            const container = this.elements.modeControls;
            container.replaceChildren();

            if (this.mode !== 'split') {
                container.hidden = true;
                return;
            }

            container.hidden = false;
            const grid = document.createElement('div');
            grid.className = 'pdf-control-grid';

            const strategy = this.createControl('Split method', 'select', 'splitStrategy');
            [
                ['Every page', 'every-page'],
                ['Every N pages', 'every-n'],
                ['Custom page groups', 'custom']
            ].forEach(([label, value]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                strategy.input.append(option);
            });

            const everyN = this.createControl('Pages per output file', 'number', 'splitEvery');
            everyN.input.min = '1';
            everyN.input.value = '2';
            everyN.wrapper.hidden = true;

            const groups = this.createControl(
                'Custom groups — one output per line, e.g. 1-3,5',
                'textarea',
                'splitGroups'
            );
            groups.input.placeholder = '1-3\n4-6\n7-end';
            groups.wrapper.hidden = true;

            strategy.input.addEventListener('change', () => {
                everyN.wrapper.hidden = strategy.input.value !== 'every-n';
                groups.wrapper.hidden = strategy.input.value !== 'custom';
                this.clearResults();
                this.render();
            });
            [everyN.input, groups.input].forEach(input => {
                input.addEventListener('input', () => {
                    this.clearResults();
                    this.render();
                });
            });

            grid.append(strategy.wrapper, everyN.wrapper, groups.wrapper);
            container.append(grid);
        }

        createControl(labelText, type, name) {
            const wrapper = document.createElement('label');
            wrapper.className = 'pdf-control';
            wrapper.append(document.createTextNode(labelText));
            const input = document.createElement(type === 'select' ? 'select' : type === 'textarea' ? 'textarea' : 'input');
            if (type !== 'select' && type !== 'textarea') input.type = type;
            input.name = name;
            wrapper.append(input);
            return { wrapper, input };
        }

        selectBy(predicate) {
            this.pages.forEach(page => { page.selected = Boolean(predicate(page)); });
            this.clearResults();
            this.render();
        }

        rotateSelected(delta) {
            this.pages.filter(page => page.selected).forEach(page => {
                page.rotation = this.normalizeRotation(page.rotation + delta);
            });
            this.clearResults();
            this.render();
        }

        rotatePage(pageId, delta) {
            const page = this.pages.find(item => item.id === pageId);
            if (!page) return;
            page.rotation = this.normalizeRotation(page.rotation + delta);
            if (this.mode === 'rotate') page.selected = true;
            this.clearResults();
            this.render();
        }

        resetPageRotation(pageId) {
            const page = this.pages.find(item => item.id === pageId);
            if (!page) return;
            page.rotation = 0;
            this.clearResults();
            this.render();
        }

        duplicatePage(pageId) {
            const index = this.pages.findIndex(page => page.id === pageId);
            if (index < 0) return;
            this.pages.splice(index + 1, 0, {
                ...this.pages[index],
                id: this.nextId()
            });
            this.clearResults();
            this.render();
        }

        removePage(pageId) {
            if (this.pages.length <= 1) {
                this.showError('A PDF must contain at least one page.');
                return;
            }
            this.pages = this.pages.filter(page => page.id !== pageId);
            this.clearResults();
            this.render();
        }

        movePage(from, to) {
            if (to < 0 || to >= this.pages.length || from === to) return;
            const [page] = this.pages.splice(from, 1);
            this.pages.splice(to, 0, page);
            this.clearResults();
            this.render();
        }

        bindDrag(card) {
            card.addEventListener('dragstart', event => {
                this.draggedPageId = card.dataset.pageId;
                event.dataTransfer.effectAllowed = 'move';
                card.classList.add('dragging');
            });
            card.addEventListener('dragover', event => {
                event.preventDefault();
                card.classList.add('dragover');
            });
            card.addEventListener('dragleave', () => card.classList.remove('dragover'));
            card.addEventListener('drop', event => {
                event.preventDefault();
                const targetId = card.dataset.pageId;
                const from = this.pages.findIndex(page => page.id === this.draggedPageId);
                const to = this.pages.findIndex(page => page.id === targetId);
                card.classList.remove('dragover');
                this.movePage(from, to);
            });
            card.addEventListener('dragend', () => {
                this.draggedPageId = null;
                card.classList.remove('dragging');
                card.classList.remove('dragover');
            });
        }

        isValidAction() {
            if (!this.file || !this.pages.length) return false;
            if (this.mode === 'delete') {
                const selected = this.pages.filter(page => page.selected).length;
                return selected > 0 && selected < this.pages.length;
            }
            if (this.mode === 'extract') return this.pages.some(page => page.selected);
            if (this.mode === 'rotate') return this.pages.some(page => page.rotation !== 0);
            if (this.mode === 'split') {
                try {
                    return this.buildSplitGroups().length > 0;
                } catch {
                    return false;
                }
            }
            return true;
        }

        async process() {
            if (!this.isValidAction() || this.busy) return;
            this.hideError();
            this.clearResults();
            this.setBusy(true, 'Creating high-quality PDF…');

            try {
                const plans = this.buildOutputPlans();
                for (let index = 0; index < plans.length; index++) {
                    this.updateProgress(index, plans.length, 'Creating output files');
                    const output = await this.createOutput(plans[index]);
                    this.addResult(output, plans[index].filename);
                }
                this.updateProgress(plans.length, plans.length, 'Files ready');
                this.elements.results.hidden = false;
                this.setStatus(`${plans.length} PDF file${plans.length === 1 ? '' : 's'} ready to download.`);
            } catch (error) {
                console.error('Unable to process PDF:', error);
                this.showError(error.message?.startsWith('Page range')
                    ? error.message
                    : 'The PDF could not be processed on this device. Try a smaller or standard PDF.');
            } finally {
                this.setBusy(false);
                this.render();
            }
        }

        buildOutputPlans() {
            const baseName = this.sanitizeFilename(this.file.name.replace(/\.pdf$/i, ''));

            if (this.mode === 'split') {
                return this.buildSplitGroups().map((indices, index) => ({
                    pages: indices.map(sourceIndex => ({ sourceIndex, rotation: 0 })),
                    filename: `${baseName}-part-${index + 1}.pdf`
                }));
            }

            let outputPages;
            let suffix;
            if (this.mode === 'delete') {
                outputPages = this.pages.filter(page => !page.selected);
                suffix = 'pages-removed';
            } else if (this.mode === 'extract') {
                outputPages = this.pages.filter(page => page.selected);
                suffix = 'extracted';
            } else if (this.mode === 'rotate') {
                outputPages = this.pages;
                suffix = 'rotated';
            } else {
                outputPages = this.pages;
                suffix = 'organized';
            }

            return [{
                pages: outputPages.map(page => ({
                    sourceIndex: page.sourceIndex,
                    rotation: page.rotation
                })),
                filename: `${baseName}-${suffix}.pdf`
            }];
        }

        buildSplitGroups() {
            if (!this.pages.length) return [];
            const strategy = this.root.querySelector('[name="splitStrategy"]')?.value || 'every-page';
            const pageCount = this.pages.length;

            if (strategy === 'every-page') {
                return Array.from({ length: pageCount }, (_, index) => [index]);
            }

            if (strategy === 'every-n') {
                const every = Number.parseInt(this.root.querySelector('[name="splitEvery"]').value, 10);
                if (!Number.isInteger(every) || every < 1) throw new Error('Page range: enter a valid number of pages per file.');
                const groups = [];
                for (let index = 0; index < pageCount; index += every) {
                    groups.push(Array.from(
                        { length: Math.min(every, pageCount - index) },
                        (_, offset) => index + offset
                    ));
                }
                return groups;
            }

            const value = this.root.querySelector('[name="splitGroups"]').value.trim();
            if (!value) return [];
            return value
                .split(/\n+/)
                .map(line => this.parseRange(line, pageCount));
        }

        parseRange(value, pageCount) {
            const result = [];
            const seen = new Set();
            const normalized = value.replace(/[–—]/g, '-').replace(/\bend\b/gi, String(pageCount));

            for (const token of normalized.split(',')) {
                const part = token.trim();
                if (!part) continue;
                const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
                if (!match) throw new Error(`Page range "${part}" is invalid.`);
                const start = Number(match[1]);
                const end = Number(match[2] || match[1]);
                if (start < 1 || end < start || end > pageCount) {
                    throw new Error(`Page range "${part}" must be between 1 and ${pageCount}.`);
                }
                for (let page = start; page <= end; page++) {
                    if (!seen.has(page)) {
                        seen.add(page);
                        result.push(page - 1);
                    }
                }
            }
            if (!result.length) throw new Error('Page range cannot be empty.');
            return result;
        }

        async createOutput(plan) {
            const sourcePdf = await PDFLib.PDFDocument.load(this.bytes.slice(0), {
                ignoreEncryption: true
            });
            const outputPdf = await PDFLib.PDFDocument.create();
            const indices = plan.pages.map(page => page.sourceIndex);
            const copiedPages = await outputPdf.copyPages(sourcePdf, indices);

            copiedPages.forEach((page, index) => {
                const delta = plan.pages[index].rotation;
                if (delta) {
                    const original = page.getRotation().angle || 0;
                    page.setRotation(PDFLib.degrees(this.normalizeRotation(original + delta)));
                }
                outputPdf.addPage(page);
            });
            return outputPdf.save();
        }

        addResult(bytes, filename) {
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            this.resultUrls.push(url);

            const item = document.createElement('div');
            item.className = 'pdf-result-item';
            const details = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = filename;
            const size = document.createElement('div');
            size.className = 'pdf-summary';
            size.textContent = this.formatSize(blob.size);
            details.append(name, size);

            const link = document.createElement('a');
            link.className = 'pdf-button pdf-button--success';
            link.href = url;
            link.download = filename;
            link.textContent = 'Download free';
            item.append(details, link);
            this.elements.resultList.append(item);
        }

        setBusy(busy, message = '') {
            this.busy = busy;
            this.elements.fileInput.disabled = busy;
            this.elements.progress.hidden = !busy;
            if (message) this.setStatus(message);
            this.render();
        }

        updateProgress(completed, total, label) {
            const percent = total ? Math.round((completed / total) * 100) : 0;
            this.elements.progress.hidden = false;
            this.elements.progressBar.style.width = `${percent}%`;
            this.elements.progressBar.parentElement.setAttribute('aria-valuenow', String(percent));
            this.elements.progressText.textContent = `${label}: ${percent}%`;
        }

        reset() {
            this.releaseDocument();
            this.clearResults();
            this.pages = [];
            this.file = null;
            this.bytes = null;
            this.elements.workspace.hidden = true;
            this.elements.processButton.disabled = true;
            this.elements.resetButton.disabled = true;
            this.elements.progress.hidden = true;
            this.elements.fileInput.value = '';
            this.hideError();
            this.setStatus('Ready for another PDF.');
        }

        releaseDocument() {
            if (this.pdfJsDocument) this.pdfJsDocument.destroy().catch(() => {});
            this.pdfJsDocument = null;
        }

        clearResults() {
            this.resultUrls.forEach(url => URL.revokeObjectURL(url));
            this.resultUrls = [];
            this.elements.resultList.replaceChildren();
            this.elements.results.hidden = true;
        }

        releaseResources() {
            this.releaseDocument();
            this.clearResults();
        }

        showError(message) {
            this.elements.error.textContent = message;
            this.elements.error.hidden = false;
            this.setStatus(message);
        }

        hideError() {
            this.elements.error.hidden = true;
        }

        setStatus(message) {
            this.elements.status.textContent = message;
        }

        normalizeRotation(value) {
            return ((value % 360) + 360) % 360;
        }

        nextId() {
            this.idCounter += 1;
            return `pdf-page-${this.idCounter}`;
        }

        sanitizeFilename(value) {
            return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim() || 'document';
        }

        formatSize(bytes) {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.pdf-tool-root[data-pdf-tool]').forEach(root => {
            if (!root.dataset.initialized) {
                root.dataset.initialized = 'true';
                new PdfPageTools(root);
            }
        });
    });
})();
