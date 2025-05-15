// PDF Processing Functions
class PDFProcessor {
    static async mergePDFs(files) {
        const PDFLib = window.PDFLib;
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        for (const file of files) {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }
        
        const mergedPdfFile = await mergedPdf.save();
        return new Blob([mergedPdfFile], { type: 'application/pdf' });
    }

    static downloadPDF(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static updateFileList(files) {
        const fileList = document.getElementById('pdf-file-list');
        if (!fileList) return;

        fileList.innerHTML = '';
        Array.from(files).forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between p-2 border-b';
            li.innerHTML = `
                <span class="flex items-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    ${file.name}
                </span>
                <button class="text-red-500 hover:text-red-700" onclick="this.parentElement.remove()">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            fileList.appendChild(li);
        });
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const pdfMergeForm = document.getElementById('pdf-merge-form');
    if (pdfMergeForm) {
        const fileInput = document.getElementById('pdf-files');
        
        // Update file list when files are selected
        fileInput.addEventListener('change', (e) => {
            PDFProcessor.updateFileList(e.target.files);
        });

        // Handle form submission
        pdfMergeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const files = fileInput.files;
            if (files.length < 2) {
                alert('Please select at least 2 PDF files to merge.');
                return;
            }

            try {
                const mergedPdf = await PDFProcessor.mergePDFs(files);
                PDFProcessor.downloadPDF(mergedPdf, 'merged.pdf');
            } catch (error) {
                console.error('Error merging PDFs:', error);
                alert('An error occurred while merging the PDF files.');
            }
        });
    }
}); 