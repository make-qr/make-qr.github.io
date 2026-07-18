(() => {
    'use strict';

    const { PDFDocument, degrees } = PDFLib;
    const ACCEPTED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

    class MergePdfApp {
        constructor() {
            this.documents = [];
            this.pages = [];
            this.mode = 'file';
            this.mergedBytes = null;
            this.previewDocument = null;
            this.previewUrl = null;
            this.currentPreviewPage = 1;
            this.draggedId = null;
            this.idCounter = 0;

            this.elements = {
                dropZone: document.getElementById('dropZone'),
                fileInput: document.getElementById('fileInput'),
                workspace: document.getElementById('fileList'),
                fileView: document.getElementById('pdfList'),
                pageView: document.getElementById('pageList'),
                fileCount: document.getElementById('fileCount'),
                pageCount: document.getElementById('pageCount'),
                selectedCount: document.getElementById('selectedCount'),
                fileModeBtn: document.getElementById('fileModeBtn'),
                pageModeBtn: document.getElementById('pageModeBtn'),
                mergeBtn: document.getElementById('mergeBtn'),
                downloadBtn: document.getElementById('downloadBtn'),
                clearBtn: document.getElementById('clearBtn'),
                outputFilename: document.getElementById('outputFilename'),
                settings: document.getElementById('pdfSettings'),
                progressContainer: document.getElementById('progressContainer'),
                progressBar: document.getElementById('progressBar'),
                progressText: document.getElementById('progressText'),
                errorContainer: document.getElementById('errorContainer'),
                errorMessage: document.getElementById('errorMessage'),
                status: document.getElementById('mergeStatus'),
                previewContainer: document.getElementById('previewContainer'),
                previewCanvas: document.getElementById('previewCanvas'),
                currentPage: document.getElementById('currentPage'),
                totalPages: document.getElementById('totalPages'),
                pdfInfo: document.getElementById('pdfInfo'),
                prevPageBtn: document.getElementById('prevPageBtn'),
                nextPageBtn: document.getElementById('nextPageBtn')
            };

            this.initialize();
        }

        initialize() {
            if (!window.pdfjsLib || !window.PDFLib) {
                this.showError('PDF libraries failed to load. Please refresh the page.');
                return;
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

            this.bindUploadEvents();
            this.elements.fileModeBtn.addEventListener('click', () => this.switchMode('file'));
            this.elements.pageModeBtn.addEventListener('click', () => this.switchMode('page'));
            this.elements.mergeBtn.addEventListener('click', () => this.merge());
            this.elements.downloadBtn.addEventListener('click', () => this.download());
            this.elements.clearBtn.addEventListener('click', () => this.clear());
            this.elements.prevPageBtn.addEventListener('click', () => this.changePreviewPage(-1));
            this.elements.nextPageBtn.addEventListener('click', () => this.changePreviewPage(1));
        }

        bindUploadEvents() {
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
                    dropZone.classList.add('active');
                });
            });
            ['dragleave', 'drop'].forEach(type => {
                dropZone.addEventListener(type, event => {
                    event.preventDefault();
                    dropZone.classList.remove('active');
                });
            });
            dropZone.addEventListener('drop', event => this.addFiles([...event.dataTransfer.files]));
            fileInput.addEventListener('change', event => {
                this.addFiles([...event.target.files]);
                event.target.value = '';
            });
        }

        async addFiles(files) {
            this.hideError();
            const supported = files.filter(file =>
                ACCEPTED_TYPES.has(file.type) ||
                /\.(pdf|jpe?g|png)$/i.test(file.name)
            );

            if (!supported.length) {
                this.showError('Please choose PDF, JPG, or PNG files.');
                return;
            }

            const unique = supported.filter(file =>
                !this.documents.some(item =>
                    item.file.name === file.name &&
                    item.file.size === file.size &&
                    item.file.lastModified === file.lastModified
                )
            );

            if (!unique.length) {
                this.showError('Those files are already in the list.');
                return;
            }

            this.setBusy(true, 'Reading files…');
            const failures = [];

            for (let index = 0; index < unique.length; index++) {
                const file = unique[index];
                this.updateProgress(index, unique.length);
                try {
                    await this.processFile(file);
                } catch (error) {
                    console.error(`Unable to read ${file.name}:`, error);
                    failures.push(file.name);
                }
            }

            this.updateProgress(unique.length, unique.length);
            this.setBusy(false);
            this.invalidateResult();
            this.render();

            if (failures.length) {
                this.showError(`Unable to read: ${failures.join(', ')}. The file may be damaged or password-protected.`);
            } else {
                this.setStatus(`${unique.length} file${unique.length === 1 ? '' : 's'} added.`);
            }
        }

        async processFile(file) {
            const bytes = await file.arrayBuffer();
            const extension = file.name.split('.').pop().toLowerCase();
            const kind = file.type === 'application/pdf' || extension === 'pdf' ? 'pdf' : 'image';
            const documentData = {
                id: this.nextId('document'),
                file,
                bytes,
                kind,
                imageFormat: extension === 'png' || file.type === 'image/png' ? 'png' : 'jpg',
                pages: []
            };

            if (kind === 'pdf') {
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) });
                const pdf = await loadingTask.promise;

                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                    const page = await pdf.getPage(pageNumber);
                    const viewport = page.getViewport({ scale: 1 });
                    const thumbnail = await this.renderPdfThumbnail(page);
                    documentData.pages.push(this.createPage(documentData, {
                        sourcePageIndex: pageNumber - 1,
                        label: `Page ${pageNumber}`,
                        thumbnail,
                        width: viewport.width,
                        height: viewport.height
                    }));
                }
                await pdf.destroy();
            } else {
                const imageInfo = await this.readImage(file);
                documentData.pages.push(this.createPage(documentData, {
                    sourcePageIndex: 0,
                    label: 'Image',
                    thumbnail: imageInfo.url,
                    width: imageInfo.width,
                    height: imageInfo.height
                }));
            }

            this.documents.push(documentData);
            this.pages.push(...documentData.pages);
        }

        createPage(documentData, data) {
            return {
                id: this.nextId('page'),
                documentId: documentData.id,
                kind: documentData.kind,
                sourcePageIndex: data.sourcePageIndex,
                label: data.label,
                thumbnail: data.thumbnail,
                width: data.width,
                height: data.height,
                rotation: 0,
                selected: true
            };
        }

        async renderPdfThumbnail(page) {
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = Math.min(0.35, 180 / baseViewport.width);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport
            }).promise;
            return canvas.toDataURL('image/jpeg', 0.8);
        }

        readImage(file) {
            return new Promise((resolve, reject) => {
                const url = URL.createObjectURL(file);
                const image = new Image();
                image.onload = () => {
                    resolve({ url, width: image.naturalWidth, height: image.naturalHeight });
                };
                image.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Invalid image'));
                };
                image.src = url;
            });
        }

        switchMode(mode) {
            this.mode = mode;
            const isFileMode = mode === 'file';
            this.elements.fileModeBtn.classList.toggle('active', isFileMode);
            this.elements.pageModeBtn.classList.toggle('active', !isFileMode);
            this.elements.fileModeBtn.setAttribute('aria-selected', String(isFileMode));
            this.elements.pageModeBtn.setAttribute('aria-selected', String(!isFileMode));
            this.elements.fileView.classList.toggle('hidden', !isFileMode);
            this.elements.pageView.classList.toggle('hidden', isFileMode);
        }

        render() {
            this.renderDocuments();
            this.renderPages();

            const hasContent = this.documents.length > 0;
            this.elements.workspace.classList.toggle('hidden', !hasContent);
            this.elements.settings.classList.toggle('hidden', !hasContent);
            this.elements.mergeBtn.classList.toggle('hidden', !hasContent);
            this.elements.clearBtn.classList.toggle('hidden', !hasContent);
            this.elements.fileCount.textContent = this.documents.length;
            this.elements.pageCount.textContent = this.pages.length;
            this.elements.selectedCount.textContent = this.pages.filter(page => page.selected).length;
            this.elements.mergeBtn.disabled = !this.pages.some(page => page.selected);
            this.switchMode(this.mode);
        }

        renderDocuments() {
            const container = this.elements.fileView;
            container.replaceChildren();

            this.documents.forEach(documentData => {
                const card = document.createElement('article');
                card.className = 'pdf-card';
                card.draggable = true;
                card.dataset.id = documentData.id;

                const preview = this.createThumbnail(documentData.pages[0]);
                const content = document.createElement('div');
                content.className = 'pdf-card-content';

                const title = document.createElement('h4');
                title.className = 'pdf-card-title';
                title.textContent = documentData.file.name;
                title.title = documentData.file.name;

                const details = document.createElement('p');
                details.className = 'pdf-card-details';
                details.textContent =
                    `${this.formatFileSize(documentData.file.size)} · ${documentData.pages.length} page${documentData.pages.length === 1 ? '' : 's'}`;

                const actions = document.createElement('div');
                actions.className = 'pdf-card-actions';
                actions.append(
                    this.createActionButton('↻ Rotate all', () => this.rotateDocument(documentData.id)),
                    this.createActionButton('✕ Remove', () => this.removeDocument(documentData.id), true)
                );

                content.append(title, details, actions);
                card.append(preview, content);
                this.bindSortableCard(card, 'document');
                container.append(card);
            });
        }

        renderPages() {
            const container = this.elements.pageView;
            container.replaceChildren();

            this.pages.forEach((page, index) => {
                const documentData = this.getDocument(page.documentId);
                const card = document.createElement('article');
                card.className = `page-card${page.selected ? '' : ' page-card-unselected'}`;
                card.draggable = true;
                card.dataset.id = page.id;

                const checkboxLabel = document.createElement('label');
                checkboxLabel.className = 'page-select';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = page.selected;
                checkbox.addEventListener('change', () => {
                    page.selected = checkbox.checked;
                    this.invalidateResult();
                    this.render();
                });
                checkboxLabel.append(checkbox, document.createTextNode(' Include'));

                const preview = this.createThumbnail(page);
                const title = document.createElement('h4');
                title.className = 'page-card-title';
                title.textContent = `${index + 1}. ${documentData.file.name} — ${page.label}`;
                title.title = title.textContent;

                const actions = document.createElement('div');
                actions.className = 'page-card-actions';
                actions.append(
                    this.createActionButton('↻', () => this.rotatePage(page.id), false, 'Rotate page'),
                    this.createActionButton('⧉', () => this.duplicatePage(page.id), false, 'Duplicate page'),
                    this.createActionButton('✕', () => this.removePage(page.id), true, 'Remove page')
                );

                card.append(checkboxLabel, preview, title, actions);
                this.bindSortableCard(card, 'page');
                container.append(card);
            });
        }

        createThumbnail(page) {
            const wrapper = document.createElement('div');
            wrapper.className = 'pdf-thumbnail-container';
            const image = document.createElement('img');
            image.className = 'pdf-thumbnail';
            image.src = page.thumbnail;
            image.alt = '';
            image.style.transform = `rotate(${page.rotation}deg)`;
            wrapper.append(image);
            return wrapper;
        }

        createActionButton(text, handler, danger = false, label = text) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `page-action-btn${danger ? ' danger' : ''}`;
            button.textContent = text;
            button.setAttribute('aria-label', label);
            button.addEventListener('click', event => {
                event.stopPropagation();
                handler();
            });
            return button;
        }

        bindSortableCard(card, type) {
            card.addEventListener('dragstart', event => {
                this.draggedId = card.dataset.id;
                event.dataTransfer.effectAllowed = 'move';
                card.classList.add('dragging');
            });
            card.addEventListener('dragover', event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                card.classList.add('drag-over');
            });
            card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
            card.addEventListener('drop', event => {
                event.preventDefault();
                card.classList.remove('drag-over');
                const targetId = card.dataset.id;
                if (this.draggedId && this.draggedId !== targetId) {
                    type === 'document'
                        ? this.reorderDocuments(this.draggedId, targetId)
                        : this.reorderPages(this.draggedId, targetId);
                }
            });
            card.addEventListener('dragend', () => {
                this.draggedId = null;
                card.classList.remove('dragging');
                card.classList.remove('drag-over');
            });
        }

        reorderDocuments(sourceId, targetId) {
            this.moveItem(this.documents, sourceId, targetId);
            const pageGroups = new Map(this.documents.map(item => [item.id, []]));
            this.pages.forEach(page => pageGroups.get(page.documentId)?.push(page));
            this.pages = this.documents.flatMap(item => pageGroups.get(item.id));
            this.invalidateResult();
            this.render();
        }

        reorderPages(sourceId, targetId) {
            this.moveItem(this.pages, sourceId, targetId);
            this.invalidateResult();
            this.render();
        }

        moveItem(items, sourceId, targetId) {
            const sourceIndex = items.findIndex(item => item.id === sourceId);
            const targetIndex = items.findIndex(item => item.id === targetId);
            if (sourceIndex < 0 || targetIndex < 0) return;
            const [item] = items.splice(sourceIndex, 1);
            items.splice(targetIndex, 0, item);
        }

        rotateDocument(documentId) {
            this.pages
                .filter(page => page.documentId === documentId)
                .forEach(page => { page.rotation = (page.rotation + 90) % 360; });
            this.invalidateResult();
            this.render();
        }

        rotatePage(pageId) {
            const page = this.pages.find(item => item.id === pageId);
            if (!page) return;
            page.rotation = (page.rotation + 90) % 360;
            this.invalidateResult();
            this.render();
        }

        duplicatePage(pageId) {
            const index = this.pages.findIndex(item => item.id === pageId);
            if (index < 0) return;
            const copy = { ...this.pages[index], id: this.nextId('page') };
            this.pages.splice(index + 1, 0, copy);
            this.invalidateResult();
            this.render();
        }

        removePage(pageId) {
            this.pages = this.pages.filter(page => page.id !== pageId);
            const activeDocumentIds = new Set(this.pages.map(page => page.documentId));
            const removedDocuments = this.documents.filter(item => !activeDocumentIds.has(item.id));
            removedDocuments.forEach(item => this.releaseDocumentResources(item));
            this.documents = this.documents.filter(item => activeDocumentIds.has(item.id));
            this.invalidateResult();
            this.render();
        }

        removeDocument(documentId) {
            const documentData = this.getDocument(documentId);
            if (documentData) this.releaseDocumentResources(documentData);
            this.documents = this.documents.filter(item => item.id !== documentId);
            this.pages = this.pages.filter(page => page.documentId !== documentId);
            this.invalidateResult();
            this.render();
        }

        async merge() {
            const selectedPages = this.pages.filter(page => page.selected);
            if (!selectedPages.length) {
                this.showError('Select at least one page to create a PDF.');
                return;
            }

            this.hideError();
            this.invalidateResult();
            this.setBusy(true, 'Creating PDF…');

            try {
                const output = await PDFDocument.create();
                const sourcePdfCache = new Map();
                const imageCache = new Map();

                for (let index = 0; index < selectedPages.length; index++) {
                    const pageData = selectedPages[index];
                    const documentData = this.getDocument(pageData.documentId);
                    this.updateProgress(index, selectedPages.length);

                    if (pageData.kind === 'pdf') {
                        let sourcePdf = sourcePdfCache.get(documentData.id);
                        if (!sourcePdf) {
                            sourcePdf = await PDFDocument.load(documentData.bytes.slice(0), {
                                ignoreEncryption: true
                            });
                            sourcePdfCache.set(documentData.id, sourcePdf);
                        }
                        const [copiedPage] = await output.copyPages(sourcePdf, [pageData.sourcePageIndex]);
                        const originalAngle = copiedPage.getRotation().angle || 0;
                        copiedPage.setRotation(degrees((originalAngle + pageData.rotation) % 360));
                        output.addPage(copiedPage);
                    } else {
                        let image = imageCache.get(documentData.id);
                        if (!image) {
                            image = documentData.imageFormat === 'png'
                                ? await output.embedPng(documentData.bytes)
                                : await output.embedJpg(documentData.bytes);
                            imageCache.set(documentData.id, image);
                        }
                        this.addImagePage(output, image, pageData);
                    }
                }

                this.updateProgress(selectedPages.length, selectedPages.length);
                this.mergedBytes = await output.save();
                await this.showPreview();
                this.elements.downloadBtn.classList.remove('hidden');
                this.setStatus(`PDF ready: ${selectedPages.length} page${selectedPages.length === 1 ? '' : 's'}.`);
            } catch (error) {
                console.error('Unable to merge files:', error);
                this.showError(`Unable to create the PDF. ${error.message}`);
            } finally {
                this.setBusy(false);
                this.render();
            }
        }

        addImagePage(output, image, pageData) {
            const maxDimension = 1200;
            const scale = Math.min(1, maxDimension / Math.max(pageData.width, pageData.height));
            const width = pageData.width * scale;
            const height = pageData.height * scale;
            const rotation = pageData.rotation % 360;
            const isSideways = rotation === 90 || rotation === 270;
            const page = output.addPage(isSideways ? [height, width] : [width, height]);

            const options = { width, height, rotate: degrees(rotation) };
            if (rotation === 90) {
                options.x = height;
                options.y = 0;
            } else if (rotation === 180) {
                options.x = width;
                options.y = height;
            } else if (rotation === 270) {
                options.x = 0;
                options.y = width;
            } else {
                options.x = 0;
                options.y = 0;
            }
            page.drawImage(image, options);
        }

        async showPreview() {
            this.revokePreviewUrl();
            const blob = new Blob([this.mergedBytes], { type: 'application/pdf' });
            this.previewUrl = URL.createObjectURL(blob);
            this.previewDocument = await pdfjsLib.getDocument({ url: this.previewUrl }).promise;
            this.currentPreviewPage = 1;
            this.elements.totalPages.textContent = this.previewDocument.numPages;
            this.elements.pdfInfo.textContent =
                `Size: ${this.formatFileSize(blob.size)}, Pages: ${this.previewDocument.numPages}`;
            this.elements.previewContainer.classList.remove('hidden');
            await this.renderPreviewPage();
        }

        async renderPreviewPage() {
            if (!this.previewDocument) return;
            const page = await this.previewDocument.getPage(this.currentPreviewPage);
            const baseViewport = page.getViewport({ scale: 1 });
            const availableWidth = Math.max(
                280,
                this.elements.previewCanvas.parentElement.clientWidth - 32
            );
            const viewport = page.getViewport({
                scale: Math.min(1.5, availableWidth / baseViewport.width)
            });
            const canvas = this.elements.previewCanvas;
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport
            }).promise;

            this.elements.currentPage.textContent = this.currentPreviewPage;
            this.elements.prevPageBtn.disabled = this.currentPreviewPage <= 1;
            this.elements.nextPageBtn.disabled =
                this.currentPreviewPage >= this.previewDocument.numPages;
        }

        changePreviewPage(delta) {
            if (!this.previewDocument) return;
            const next = this.currentPreviewPage + delta;
            if (next < 1 || next > this.previewDocument.numPages) return;
            this.currentPreviewPage = next;
            this.renderPreviewPage();
        }

        download() {
            if (!this.mergedBytes) {
                this.showError('Create the merged PDF before downloading.');
                return;
            }
            const blob = new Blob([this.mergedBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            let filename = this.elements.outputFilename.value.trim() || 'merged-document.pdf';
            if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';
            link.href = url;
            link.download = filename;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        clear() {
            this.documents.forEach(item => this.releaseDocumentResources(item));
            this.documents = [];
            this.pages = [];
            this.elements.fileInput.value = '';
            this.elements.outputFilename.value = 'merged-document.pdf';
            this.invalidateResult();
            this.hideError();
            this.setStatus('All files cleared.');
            this.render();
        }

        invalidateResult() {
            this.mergedBytes = null;
            this.previewDocument = null;
            this.revokePreviewUrl();
            this.elements.downloadBtn.classList.add('hidden');
            this.elements.previewContainer.classList.add('hidden');
        }

        releaseDocumentResources(documentData) {
            if (documentData.kind === 'image' && documentData.pages[0]?.thumbnail) {
                URL.revokeObjectURL(documentData.pages[0].thumbnail);
            }
        }

        revokePreviewUrl() {
            if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = null;
        }

        getDocument(id) {
            return this.documents.find(item => item.id === id);
        }

        nextId(prefix) {
            this.idCounter += 1;
            return `${prefix}-${this.idCounter}`;
        }

        setBusy(busy, message = '') {
            this.elements.progressContainer.classList.toggle('hidden', !busy);
            this.elements.mergeBtn.disabled = busy || !this.pages.some(page => page.selected);
            this.elements.fileInput.disabled = busy;
            if (message) this.setStatus(message);
        }

        updateProgress(completed, total) {
            const percent = total ? Math.round((completed / total) * 100) : 0;
            this.elements.progressBar.style.width = `${percent}%`;
            this.elements.progressText.textContent = `${percent}% (${completed}/${total})`;
        }

        showError(message) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorContainer.classList.remove('hidden');
            this.setStatus(message);
        }

        hideError() {
            this.elements.errorContainer.classList.add('hidden');
        }

        setStatus(message) {
            this.elements.status.textContent = message;
        }

        formatFileSize(bytes) {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
    }

    document.addEventListener('DOMContentLoaded', () => new MergePdfApp());
})();
