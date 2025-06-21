class ArtisticImageProcessor {
    constructor() {
        this.files = [];
        this.results = [];
        this.currentMode = 'convert';
        this.isProcessing = false;
        this.watermarkCanvas = null;
        this.watermarkMask = [];
        this.watermarkMaskHistory = [];
        this.isDrawing = false;
        this.currentImage = null; // Stores image for interactive editing (watermark/crop)
        
        // Cropping related properties
        this.cropCanvas = null;
        this.cropSelection = null;
        this.isDragging = false;
        this.dragType = null; // 'move', 'resize-tl', 'resize-tr', 'resize-bl', 'resize-br'
        this.dragStart = { x: 0, y: 0 };
        this.currentCropImage = null; // Stores image for interactive cropping
        this.manualCropParams = null; // Stores parameters set by manual crop selection
    }

    init() {
        try {
            this.setupEventListeners();
            this.setupDragAndDrop();
            this.setupRangeInputs();
            this.setupArtisticAnimations();
            this.setupDragAndDropReorder(); // Initialize drag-and-drop for batch operation reordering
            console.log('🎨 Loki\'s Digital Atelier 初始化成功！');
        } catch (error) {
            console.error('Loki\'s Digital Atelier 初始化失败:', error);
            // 确保这里能给用户一个可见的提示
            const errorDiv = document.createElement('div');
            errorDiv.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
            errorDiv.textContent = '应用初始化失败，请检查浏览器控制台（F12）了解详情。';
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }

    setupArtisticAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        });

        document.querySelectorAll('.morandi-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }

    setupEventListeners() {
        const getElement = (id) => {
            const el = document.getElementById(id);
            if (!el) {
                console.warn(`DOM element with ID '${id}' not found. Functionality relying on it might be affected.`);
            }
            return el;
        };

        // Tab switching
        ['convert', 'compress', 'resize', 'watermark', 'filter', 'background', 'splice', 'analyze'].forEach(mode => {
            const tabElement = getElement(mode + 'Tab');
            if (tabElement) {
                tabElement.addEventListener('click', () => this.switchTab(mode));
            }
        });

        // File selection
        const fileInput = getElement('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        const uploadButton = document.querySelector('#uploadArea button'); 
        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                const fi = getElement('fileInput');
                if (fi) fi.click();
            });
        }

        // Clear files
        const clearFilesBtn = getElement('clearFiles');
        if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', () => this.clearFiles());
        }

        // Individual process buttons
        const processButtons = [
            { id: 'startConvert', mode: 'convert' },
            { id: 'startCompress', mode: 'compress' },
            { id: 'startResize', mode: 'resize' },
            { id: 'startWatermark', mode: 'watermark' },
            { id: 'startFilter', mode: 'filter' },
            { id: 'startBackground', mode: 'background' },
            { id: 'startSplice', mode: 'splice' },
            { id: 'startAnalyze', mode: 'analyze' }
        ];
        
        processButtons.forEach(({ id, mode }) => {
            const button = getElement(id);
            if (button) {
                button.addEventListener('click', () => this.startProcessing(mode));
            }
        });

        // Batch operations
        const batchAllBtn = getElement('batchAll');
        if (batchAllBtn) {
            batchAllBtn.addEventListener('click', () => this.openBatchSelectModal());
        }
        
        const previewBatchBtn = getElement('previewBatch');
        if (previewBatchBtn) {
            previewBatchBtn.addEventListener('click', () => this.previewBatch());
        }
        
        const resetAllBtn = getElement('resetAll');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => this.resetAllSettings());
        }

        // Result actions
        const downloadAllBtn = getElement('downloadAll');
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', () => this.downloadAll());
        }
        
        const clearResultsBtn = getElement('clearResults');
        if (clearResultsBtn) {
            clearResultsBtn.addEventListener('click', () => this.clearResults());
        }

        // Filter presets
        document.querySelectorAll('.filter-preset').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyFilterPreset(e.target.dataset.filter));
        });

        // Mode-specific input updates
        const resizeModeSelect = getElement('resizeMode');
        if (resizeModeSelect) {
            resizeModeSelect.addEventListener('change', () => this.updateResizeInputs());
        }
        
        const watermarkTypeSelect = getElement('watermarkType');
        if (watermarkTypeSelect) {
            watermarkTypeSelect.addEventListener('change', () => this.updateWatermarkInputs());
        }
        
        // New functionality event listeners (using querySelectorAll for robustness)
        document.querySelectorAll('input[name="resizeType"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateResizeTypeInputs());
        });
        document.querySelectorAll('input[name="cropMode"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateCropModeInputs());
        });
        document.querySelectorAll('input[name="watermarkAction"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateWatermarkActionInputs());
        });
        document.querySelectorAll('input[name="removeMethod"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateRemoveMethodInputs());
        });
        const backgroundTypeSelect = getElement('backgroundType');
        if (backgroundTypeSelect) {
            backgroundTypeSelect.addEventListener('change', () => this.updateBackgroundInputs());
        }
        
        const spliceModeSelect = getElement('spliceMode');
        if (spliceModeSelect) {
            spliceModeSelect.addEventListener('change', () => this.updateSpliceInputs());
        }
        
        // Watermark brush/mask events
        const clearMaskBtn = getElement('clearMask');
        if (clearMaskBtn) {
            clearMaskBtn.addEventListener('click', () => this.clearWatermarkMask());
        }
        
        const previewRemovalBtn = getElement('previewRemoval');
        if (previewRemovalBtn) {
            previewRemovalBtn.addEventListener('click', () => this.previewWatermarkRemoval());
        }
        
        const undoMaskBtn = getElement('undoMask');
        if (undoMaskBtn) {
            undoMaskBtn.addEventListener('click', () => this.undoWatermarkMask());
        }
        
        // Color preset buttons
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bgColor1 = getElement('backgroundColor1');
                if (bgColor1) bgColor1.value = e.target.dataset.color;
            });
        });
        
        // Crop events
        const aspectRatioSelect = getElement('aspectRatioConstraint');
        if (aspectRatioSelect) {
            aspectRatioSelect.addEventListener('change', () => this.updateAspectRatioInputs());
        }
        
        const resetCropBtn = getElement('resetCropSelection');
        if (resetCropBtn) {
            resetCropBtn.addEventListener('click', () => this.resetCropSelection());
        }
        
        const previewCropBtn = getElement('previewCrop');
        if (previewCropBtn) {
            previewCropBtn.addEventListener('click', () => this.previewCropSelection());
        }
        
        const applyCropBtn = getElement('applyCropSelection');
        if (applyCropBtn) {
            applyCropBtn.addEventListener('click', () => this.applyCropSelection());
        }
    }

    setupDragAndDrop() {
        const area = document.getElementById('uploadArea');
        if (!area) return;
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            this.addFiles(files);
        });
    }

    setupDragAndDropReorder() {
        const list = document.getElementById('batchOperationList');
        if (!list) {
            console.warn("Batch operation list for reordering not found.");
            return;
        }

        let draggedItem = null;

        list.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('draggable-item')) {
                draggedItem = e.target;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedItem.dataset.operation); 
                e.target.classList.add('dragging');
            }
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            const target = e.target.closest('.draggable-item');
            if (target && target !== draggedItem) {
                const rect = target.getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                if (offsetY < rect.height / 2) {
                    list.insertBefore(draggedItem, target);
                } else {
                    list.insertBefore(draggedItem, target.nextSibling);
                }
            }
        });

        list.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });
    }

    setupRangeInputs() {
        const rangeInputs = [
            { input: 'jpegQuality', output: 'qualityValue' },
            { input: 'customQuality', output: 'customQualityValue' },
            { input: 'watermarkOpacity', output: 'opacityValue', multiply: 100 },
            { input: 'brightness', output: 'brightnessValue' },
            { input: 'contrast', output: 'contrastValue' },
            { input: 'saturation', output: 'saturationValue' },
            { input: 'blur', output: 'blurValue' },
            { input: 'repairStrength', output: 'repairValue' },
            { input: 'manualRepairStrength', output: 'manualRepairValue' },
            { input: 'brushSize', output: 'brushSizeValue', suffix: 'px' },
            { input: 'colorCount', output: 'colorCountValue', suffix: ' 种颜色' }
        ];

        rangeInputs.forEach(({ input, output, multiply = 1, suffix = '' }) => {
            const inputEl = document.getElementById(input);
            const outputEl = document.getElementById(output);
            if (inputEl && outputEl) {
                inputEl.addEventListener('input', () => {
                    outputEl.textContent = Math.round(inputEl.value * multiply) + suffix;
                });
            }
        });
    }

    switchTab(mode) {
        this.currentMode = mode;
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeTab = document.getElementById(mode + 'Tab');
        if (activeTab) activeTab.classList.add('active');

        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
        const activePanel = document.getElementById(mode + 'Panel');
        if (activePanel) activePanel.classList.remove('hidden');
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        this.addFiles(files);
    }

    addFiles(files) {
        this.files.push(...files);
        this.updateUI();
        this.renderFileList();
    }

    clearFiles() {
        this.files = [];
        this.updateUI();
        this.renderFileList();
    }

    renderFileList() {
        const fileList = document.getElementById('fileList');
        const fileItems = document.getElementById('fileItems');
        const fileCount = document.getElementById('fileCount');

        if (!fileList || !fileItems || !fileCount) {
            console.warn("File list UI elements not found.");
            return;
        }

        if (this.files.length === 0) {
            fileList.classList.add('hidden');
            return;
        }

        fileList.classList.remove('hidden');
        fileCount.textContent = this.files.length;

        fileItems.innerHTML = '';
        this.files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item p-4 flex items-center justify-between relative';
            
            const sizeText = this.formatFileSize(file.size);
            item.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 bg-gradient-to-br from-macaron-lavender to-macaron-mint rounded-xl flex items-center justify-center shadow-sm">
                        <svg class="w-5 h-5 text-morandi-deep" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3  6z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div>
                        <div class="font-medium text-sm text-morandi-deep">${file.name}</div>
                        <div class="text-xs text-morandi-shadow">${sizeText}</div>
                    </div>
                </div>
                <button onclick="app.removeFile(${index})" class="text-morandi-clay hover:text-red-500 text-sm font-medium transition-colors px-3 py-1 rounded-lg">
                    删除
                </button>
            `;
            fileItems.appendChild(item);
        });
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.updateUI();
        this.renderFileList();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateUI() {
        const hasFiles = this.files.length > 0;
        const buttons = [
            'startConvert', 'startCompress', 'startResize', 
            'startWatermark', 'startFilter', 'startBackground',
            'startSplice', 'startAnalyze', 'batchAll', 'previewBatch'
        ];
        
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = !hasFiles || this.isProcessing;
            }
        });
    }

    updateResizeInputs() {
        const mode = document.getElementById('resizeMode');
        const widthInput = document.getElementById('targetWidth');
        const heightInput = document.getElementById('targetHeight');
        
        if (!mode || !widthInput || !heightInput) return;

        switch(mode.value) {
            case 'percentage':
                widthInput.placeholder = '50 (表示50%)';
                heightInput.disabled = true;
                break;
            case 'width':
                widthInput.placeholder = '800';
                heightInput.disabled = true;
                break;
            case 'height':
                widthInput.disabled = true;
                heightInput.placeholder = '600';
                break;
            case 'fixed':
                widthInput.disabled = false;
                heightInput.disabled = false;
                widthInput.placeholder = '800';
                heightInput.placeholder = '600';
                break;
        }
    }

    updateWatermarkInputs() {
        const typeSelect = document.getElementById('watermarkType');
        const textOptions = document.getElementById('textWatermarkOptions');
        
        if (!typeSelect || !textOptions) return;
        textOptions.style.display = typeSelect.value === 'text' ? 'block' : 'none';
    }

    updateResizeTypeInputs() {
        const resizeTypeRadio = document.querySelector('input[name="resizeType"]:checked');
        const resizeOptions = document.getElementById('resizeOptions');
        const cropOptions = document.getElementById('cropOptions');

        if (!resizeTypeRadio || !resizeOptions || !cropOptions) return;
        
        if (resizeTypeRadio.value === 'resize') {
            resizeOptions.style.display = 'grid';
            cropOptions.style.display = 'none';
        } else {
            resizeOptions.style.display = 'none';
            cropOptions.style.display = 'block';
            this.setupCropCanvas();
        }
    }

    updateCropModeInputs() {
        const cropModeRadio = document.querySelector('input[name="cropMode"]:checked');
        const manualOptions = document.getElementById('manualCropOptions');
        const presetOptions = document.getElementById('presetCropOptions');

        if (!cropModeRadio || !manualOptions || !presetOptions) return;
        
        if (cropModeRadio.value === 'manual') {
            manualOptions.style.display = 'block';
            presetOptions.style.display = 'none';
            this.setupCropCanvas();
        } else {
            manualOptions.style.display = 'none';
            presetOptions.style.display = 'block';
        }
    }

    updateAspectRatioInputs() {
        const aspectRatioSelect = document.getElementById('aspectRatioConstraint');
        const customInputs = document.getElementById('customRatioInputs');
        
        if (!aspectRatioSelect || !customInputs) return;

        if (aspectRatioSelect.value === 'custom') {
            customInputs.style.display = 'block';
        } else {
            customInputs.style.display = 'none';
        }
        
        if (this.cropSelection) {
            this.updateCropConstraints();
        }
    }

    updateWatermarkActionInputs() {
        const watermarkActionRadio = document.querySelector('input[name="watermarkAction"]:checked');
        const addOptions = document.getElementById('addWatermarkOptions');
        const removeOptions = document.getElementById('removeWatermarkOptions');

        if (!watermarkActionRadio || !addOptions || !removeOptions) return;
        
        if (watermarkActionRadio.value === 'add') {
            addOptions.style.display = 'block';
            removeOptions.style.display = 'none';
        } else {
            addOptions.style.display = 'none';
            removeOptions.style.display = 'block';
            this.setupWatermarkCanvas();
        }
    }

    updateRemoveMethodInputs() {
        const removeMethodRadio = document.querySelector('input[name="removeMethod"]:checked');
        const autoOptions = document.getElementById('autoRemoveOptions');
        const manualOptions = document.getElementById('manualRemoveOptions');

        if (!removeMethodRadio || !autoOptions || !manualOptions) return;
        
        if (removeMethodRadio.value === 'auto') {
            autoOptions.style.display = 'block';
            manualOptions.style.display = 'none';
        } else {
            autoOptions.style.display = 'none';
            manualOptions.style.display = 'block';
            this.setupWatermarkCanvas();
        }
    }

    setupWatermarkCanvas() {
        setTimeout(() => {
            if (this.files.length > 0) {
                this.loadImageForWatermarkEditing(this.files[0]);
            }
        }, 100);
    }

    setupCropCanvas() {
        setTimeout(() => {
            if (this.files.length > 0) {
                this.loadImageForCropEditing(this.files[0]);
            }
        }, 100);
    }

    async loadImageForCropEditing(file) {
        const canvas = document.getElementById('cropPreview');
        const placeholder = document.getElementById('cropPlaceholder');
        
        if (!canvas || !placeholder) return;
        
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
            const maxWidth = 600;
            const maxHeight = 400;
            let { width, height } = this.calculateDisplaySize(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight); 
            
            canvas.width = width;
            canvas.height = height;
            canvas.style.display = 'block';
            placeholder.style.display = 'none';
            
            ctx.drawImage(img, 0, 0, width, height);
            
            this.currentCropImage = {
                originalImg: img,
                canvas: canvas,
                ctx: ctx,
                scaleX: width / img.naturalWidth,
                scaleY: height / img.naturalHeight,
                displayWidth: width,
                displayHeight: height
            };
            
            const defaultWidth = Math.min(200, width * 0.5);
            const defaultHeight = Math.min(150, height * 0.5);
            this.cropSelection = {
                x: (width - defaultWidth) / 2,
                y: (height - defaultHeight) / 2,
                width: defaultWidth,
                height: defaultHeight
            };
            
            this.setupCropCanvasEvents();
            this.drawCropSelection();
            this.updateCropDisplay();
            this.updateCropButtons();
        };
        
        img.onerror = (e) => {
            console.error("Error loading image for crop editing:", e, file);
            placeholder.style.display = 'block';
            canvas.style.display = 'none';
            alert('无法加载图片进行裁剪编辑，请确保图片有效且未受CORS限制。');
        };
        img.src = URL.createObjectURL(file);
    }

    setupCropCanvasEvents() {
        const canvas = this.currentCropImage.canvas;
        
        canvas.addEventListener('mousedown', (e) => this.startCropDrag(e));
        canvas.addEventListener('mousemove', (e) => this.handleCropDrag(e));
        canvas.addEventListener('mouseup', () => this.stopCropDrag());
        canvas.addEventListener('mouseout', () => this.stopCropDrag());
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });
    }

    startCropDrag(e) {
        if (!this.cropSelection || !this.currentCropImage) return;
        
        const rect = this.currentCropImage.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.currentCropImage.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.currentCropImage.canvas.height / rect.height);
        
        this.dragStart = { x, y };
        this.dragType = this.getCropDragType(x, y);
        this.isDragging = true;
        
        this.updateCursorStyle(this.dragType);
    }

    handleCropDrag(e) {
        if (!this.cropSelection || !this.isDragging || !this.currentCropImage) return;
        
        const rect = this.currentCropImage.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.currentCropImage.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.currentCropImage.canvas.height / rect.height);
        
        const deltaX = x - this.dragStart.x;
        const deltaY = y - this.dragStart.y;
        
        const newSelection = { ...this.cropSelection };
        
        switch (this.dragType) {
            case 'move':
                newSelection.x = Math.max(0, Math.min(this.currentCropImage.displayWidth - newSelection.width, this.cropSelection.x + deltaX));
                newSelection.y = Math.max(0, Math.min(this.currentCropImage.displayHeight - newSelection.height, this.cropSelection.y + deltaY));
                break;
            case 'resize-tl':
                this.resizeSelection(newSelection, deltaX, deltaY, 'tl');
                break;
            case 'resize-tr':
                this.resizeSelection(newSelection, deltaX, deltaY, 'tr');
                break;
            case 'resize-bl':
                this.resizeSelection(newSelection, deltaX, deltaY, 'bl');
                break;
            case 'resize-br':
                this.resizeSelection(newSelection, deltaX, deltaY, 'br');
                break;
            default:
                this.updateCursorStyle(this.getCropDragType(x,y));
                return;
        }
        
        this.applyCropConstraints(newSelection);
        
        this.cropSelection = newSelection;
        this.dragStart = { x, y };
        
        this.drawCropSelection();
        this.updateCropDisplay();
    }

    stopCropDrag() {
        this.isDragging = false;
        this.dragType = null;
        this.updateCursorStyle('default');
    }

    getCropDragType(x, y) {
        if (!this.cropSelection) return 'default';
        
        const sel = this.cropSelection;
        const handleSize = 8;
        
        if (this.isInHandle(x, y, sel.x, sel.y, handleSize)) return 'resize-tl';
        if (this.isInHandle(x, y, sel.x + sel.width, sel.y, handleSize)) return 'resize-tr';
        if (this.isInHandle(x, y, sel.x, sel.y + sel.height, handleSize)) return 'resize-bl';
        if (this.isInHandle(x, y, sel.x + sel.width, sel.y + sel.height, handleSize)) return 'resize-br';
        
        if (x >= sel.x && x <= sel.x + sel.width && y >= sel.y && y <= sel.y + sel.height) {
            return 'move';
        }
        
        return 'default';
    }

    isInHandle(x, y, handleX, handleY, size) {
        return x >= handleX - size/2 && x <= handleX + size/2 && 
               y >= handleY - size/2 && y <= handleY + size/2;
    }

    updateCursorStyle(dragType) {
        const canvas = this.currentCropImage?.canvas;
        if (!canvas) return;
        const cursors = {
            'default': 'default',
            'move': 'move',
            'resize-tl': 'nw-resize',
            'resize-tr': 'ne-resize',
            'resize-bl': 'sw-resize',
            'resize-br': 'se-resize'
        };
        canvas.style.cursor = cursors[dragType] || 'default';
    }

    resizeSelection(selection, deltaX, deltaY, corner) {
        const minWidth = parseInt(document.getElementById('minCropWidth')?.value || '20');
        const minHeight = parseInt(document.getElementById('minCropHeight')?.value || '20');
        
        if (!this.currentCropImage) return;

        const maxDisplayWidth = this.currentCropImage.displayWidth;
        const maxDisplayHeight = this.currentCropImage.displayHeight;
        
        let newX = selection.x;
        let newY = selection.y;
        let newWidth = selection.width;
        let newHeight = selection.height;

        switch (corner) {
            case 'tl':
                newX = Math.max(0, selection.x + deltaX);
                newY = Math.max(0, selection.y + deltaY);
                newWidth = selection.width - (newX - selection.x);
                newHeight = selection.height - (newY - selection.y);
                break;
            case 'tr':
                newWidth = Math.max(minWidth, selection.width + deltaX);
                newY = Math.max(0, selection.y + deltaY);
                newHeight = selection.height - (newY - selection.y);
                newX = selection.x; 
                break;
            case 'bl':
                newX = Math.max(0, selection.x + deltaX);
                newWidth = selection.width - (newX - selection.x);
                newHeight = Math.max(minHeight, selection.height + deltaY);
                newY = selection.y; 
                break;
            case 'br':
                newWidth = Math.max(minWidth, selection.width + deltaX);
                newHeight = Math.max(minHeight, selection.height + deltaY);
                newX = selection.x;
                newY = selection.y;
                break;
        }

        newX = Math.min(newX, maxDisplayWidth - newWidth);
        newY = Math.min(newY, maxDisplayHeight - newHeight);
        newWidth = Math.min(newWidth, maxDisplayWidth - newX);
        newHeight = Math.min(newHeight, maxDisplayHeight - newY);

        if (newWidth < minWidth) newWidth = minWidth;
        if (newHeight < minHeight) newHeight = minHeight;

        if (newWidth >= minWidth && newHeight >= minHeight) {
            selection.x = newX;
            selection.y = newY;
            selection.width = newWidth;
            selection.height = newHeight;
        }
    }


    applyCropConstraints(selection) {
        const constraintSelect = document.getElementById('aspectRatioConstraint');
        if (!constraintSelect) return;
        const constraint = constraintSelect.value;
        
        if (constraint === 'free') return;
        
        let ratio = 1;
        
        switch (constraint) {
            case '1:1': ratio = 1; break;
            case '4:3': ratio = 4/3; break;
            case '3:2': ratio = 3/2; break;
            case '16:9': ratio = 16/9; break;
            case '9:16': ratio = 9/16; break;
            case 'custom':
                const customW = parseFloat(document.getElementById('customRatioW')?.value || '1');
                const customH = parseFloat(document.getElementById('customRatioH')?.value || '1');
                if (customH === 0) { console.warn("Custom aspect ratio height is zero, defaulting to 1."); ratio = customW; }
                else ratio = customW / customH;
                break;
        }
        
        const currentRatio = selection.width / selection.height;
        if (currentRatio > ratio) { 
            selection.width = this.roundToNearestPixel(selection.height * ratio);
        } else if (currentRatio < ratio) { 
            selection.height = this.roundToNearestPixel(selection.width / ratio);
        }

        if (selection.x + selection.width > this.currentCropImage.displayWidth) {
            selection.width = this.currentCropImage.displayWidth - selection.x;
            selection.height = this.roundToNearestPixel(selection.width / ratio);
        }
        if (selection.y + selection.height > this.currentCropImage.displayHeight) {
            selection.height = this.currentCropImage.displayHeight - selection.y;
            selection.width = this.roundToNearestPixel(selection.height * ratio);
        }

        const minWidth = parseInt(document.getElementById('minCropWidth')?.value || '20');
        const minHeight = parseInt(document.getElementById('minCropHeight')?.value || '20');
        if (selection.width < minWidth) {
            selection.width = minWidth;
            selection.height = this.roundToNearestPixel(minWidth / ratio);
        }
        if (selection.height < minHeight) {
            selection.height = minHeight;
            selection.width = this.roundToNearestPixel(minHeight * ratio);
        }
    }

    roundToNearestPixel(value) {
        return Math.round(value);
    }

    updateCropConstraints() {
        if (!this.cropSelection) return;
        
        this.applyCropConstraints(this.cropSelection);
        this.drawCropSelection();
        this.updateCropDisplay();
    }

    drawCropSelection() {
        if (!this.currentCropImage || !this.cropSelection) return;
        
        const ctx = this.currentCropImage.ctx;
        const img = this.currentCropImage.originalImg;
        
        ctx.clearRect(0, 0, this.currentCropImage.displayWidth, this.currentCropImage.displayHeight);
        ctx.drawImage(img, 0, 0, this.currentCropImage.displayWidth, this.currentCropImage.displayHeight);
        
        const sel = this.cropSelection;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.currentCropImage.displayWidth, sel.y); 
        ctx.fillRect(0, sel.y, sel.x, sel.height); 
        ctx.fillRect(sel.x + sel.width, sel.y, this.currentCropImage.displayWidth - sel.x - sel.width, sel.height); 
        ctx.fillRect(0, sel.y + sel.height, this.currentCropImage.displayWidth, this.currentCropImage.displayHeight - sel.y - sel.height); 
        
        ctx.strokeStyle = '#4A7C7E';
        ctx.lineWidth = 2;
        ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
        
        const handleSize = 8;
        ctx.fillStyle = '#4A7C7E';
        
        this.drawHandle(ctx, sel.x, sel.y, handleSize);
        this.drawHandle(ctx, sel.x + sel.width, sel.y, handleSize);
        this.drawHandle(ctx, sel.x, sel.y + sel.height, handleSize);
        this.drawHandle(ctx, sel.x + sel.width, sel.y + sel.height, handleSize);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(sel.x + sel.width / 3, sel.y);
        ctx.lineTo(sel.x + sel.width / 3, sel.y + sel.height);
        ctx.moveTo(sel.x + sel.width * 2 / 3, sel.y);
        ctx.lineTo(sel.x + sel.width * 2 / 3, sel.y + sel.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(sel.x, sel.y + sel.height / 3);
        ctx.lineTo(sel.x + sel.width, sel.y + sel.height / 3);
        ctx.moveTo(sel.x, sel.y + sel.height * 2 / 3);
        ctx.lineTo(sel.x + sel.width, sel.y + sel.height * 2 / 3);
        ctx.stroke();
    }

    drawHandle(ctx, x, y, size) {
        ctx.fillRect(x - size/2, y - size/2, size, size);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - size/2, y - size/2, size, size);
    }

    updateCropDisplay() {
        const displayCropX = document.getElementById('displayCropX');
        const displayCropY = document.getElementById('displayCropY');
        const displayCropWidth = document.getElementById('displayCropWidth');
        const displayCropHeight = document.getElementById('displayCropHeight');

        if (!this.cropSelection || !this.currentCropImage || !displayCropX || !displayCropY || !displayCropWidth || !displayCropHeight) return;
        
        const realX = Math.round(this.cropSelection.x / this.currentCropImage.scaleX);
        const realY = Math.round(this.cropSelection.y / this.currentCropImage.scaleY);
        const realWidth = Math.round(this.cropSelection.width / this.currentCropImage.scaleX);
        const realHeight = Math.round(this.cropSelection.height / this.currentCropImage.scaleY);
        
        displayCropX.textContent = realX;
        displayCropY.textContent = realY;
        displayCropWidth.textContent = realWidth;
        displayCropHeight.textContent = realHeight;
    }

    updateCropButtons() {
        const hasSelection = this.cropSelection && this.currentCropImage;
        const resetBtn = document.getElementById('resetCropSelection');
        const previewBtn = document.getElementById('previewCrop');
        const applyBtn = document.getElementById('applyCropSelection');

        if (resetBtn) resetBtn.disabled = !hasSelection;
        if (previewBtn) previewBtn.disabled = !hasSelection;
        if (applyBtn) applyBtn.disabled = !hasSelection;
    }

    resetCropSelection() {
        if (!this.currentCropImage) return;
        
        const defaultWidth = Math.min(200, this.currentCropImage.displayWidth * 0.5);
        const defaultHeight = Math.min(150, this.currentCropImage.displayHeight * 0.5);
        this.cropSelection = {
            x: (this.currentCropImage.displayWidth - defaultWidth) / 2,
            y: (this.currentCropImage.displayHeight - defaultHeight) / 2,
            width: defaultWidth,
            height: defaultHeight
        };
        
        this.drawCropSelection();
        this.updateCropDisplay();
    }

    async previewCropSelection() {
        if (!this.cropSelection || !this.currentCropImage) return;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="max-w-4xl w-full mx-4">
                <div class="morandi-card rounded-3xl overflow-hidden shadow-2xl">
                    <div class="p-6 border-b border-morandi-cloud">
                        <div class="flex justify-between items-center">
                            <h3 class="serif-font text-xl font-medium text-morandi-deep">✂️ 裁剪预览效果</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                                    class="text-morandi-shadow hover:text-morandi-deep transition-colors p-2">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="text-center">
                                <h4 class="text-sm font-medium text-morandi-deep mb-3">原始图像（含选择框）</h4>
                                <div class="bg-gray-100 rounded-xl p-4">
                                    <canvas id="cropPreviewOriginal" class="max-w-full rounded-lg"></canvas>
                                </div>
                            </div>
                            <div class="text-center">
                                <h4 class="text-sm font-medium text-morandi-deep mb-3">裁剪后效果</h4>
                                <div class="bg-gray-100 rounded-xl p-4">
                                    <canvas id="cropPreviewResult" class="max-w-full rounded-lg"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="mt-6 text-center text-sm text-morandi-shadow">
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>起始X: <strong>${Math.round(this.cropSelection.x / this.currentCropImage.scaleX)}</strong></div>
                                <div>起始Y: <strong>${Math.round(this.cropSelection.y / this.currentCropImage.scaleY)}</strong></div>
                                <div>宽度: <strong>${Math.round(this.cropSelection.width / this.currentCropImage.scaleX)}</strong></div>
                                <div>高度: <strong>${Math.round(this.cropSelection.height / this.currentCropImage.scaleY)}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const originalCanvas = document.getElementById('cropPreviewOriginal');
        const originalCtx = originalCanvas?.getContext('2d');
        if (originalCanvas && originalCtx && this.currentCropImage) {
            originalCanvas.width = this.currentCropImage.displayWidth;
            originalCanvas.height = this.currentCropImage.displayHeight;
            originalCtx.drawImage(this.currentCropImage.canvas, 0, 0);
        }
        
        await this.generateCropPreview();
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async generateCropPreview() {
        const resultCanvas = document.getElementById('cropPreviewResult');
        if (!resultCanvas || !this.currentCropImage || !this.cropSelection) return;
        const resultCtx = resultCanvas.getContext('2d');
        
        const realX = this.cropSelection.x / this.currentCropImage.scaleX;
        const realY = this.cropSelection.y / this.currentCropImage.scaleY;
        const realWidth = this.cropSelection.width / this.currentCropImage.scaleX;
        const realHeight = this.cropSelection.height / this.currentCropImage.scaleY;
        
        resultCanvas.width = realWidth;
        resultCanvas.height = realHeight;
        
        resultCtx.drawImage(
            this.currentCropImage.originalImg,
            realX, realY, realWidth, realHeight,
            0, 0, realWidth, realHeight
        );
    }

    applyCropSelection() {
        if (!this.cropSelection || !this.currentCropImage) return;
        
        const realX = Math.round(this.cropSelection.x / this.currentCropImage.scaleX);
        const realY = Math.round(this.cropSelection.y / this.currentCropImage.scaleY);
        const realWidth = Math.round(this.cropSelection.width / this.currentCropImage.scaleX);
        const realHeight = Math.round(this.cropSelection.height / this.currentCropImage.scaleY);
        
        this.manualCropParams = {
            x: realX,
            y: realY,
            width: realWidth,
            height: realHeight
        };
        
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 z-50 morandi-card rounded-2xl p-4 shadow-2xl transform translate-x-full transition-transform duration-500';
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-br from-morandi-sage to-van-gogh-blue rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <div>
                    <div class="font-medium text-morandi-deep">裁剪区域已设置</div>
                    <div class="text-xs text-morandi-shadow">${realWidth}×${realHeight} 从 (${realX}, ${realY})</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(full)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    async loadImageForWatermarkEditing(file) {
        const canvas = document.getElementById('watermarkPreview');
        const placeholder = document.getElementById('canvasPlaceholder');
        const ctx = canvas?.getContext('2d');
        
        if (!canvas || !placeholder || !ctx) return;
        
        const img = new Image();
        img.onload = () => {
            const maxWidth = 600;
            const maxHeight = 400;
            let { width, height } = this.calculateDisplaySize(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight); 
            
            canvas.width = width;
            canvas.height = height;
            canvas.style.display = 'block';
            placeholder.style.display = 'none';
            
            ctx.drawImage(img, 0, 0, width, height);
            
            this.currentImage = {
                originalImg: img,
                canvas: canvas,
                ctx: ctx,
                scaleX: width / img.naturalWidth,
                scaleY: height / img.naturalHeight,
                displayWidth: width,
                displayHeight: height
            };
            
            this.watermarkMask = [];
            this.watermarkMaskHistory = [];
            
            this.setupCanvasEvents();
            
            const clearMaskBtn = document.getElementById('clearMask');
            const previewRemovalBtn = document.getElementById('previewRemoval');
            if (clearMaskBtn) clearMaskBtn.disabled = false;
            if (previewRemovalBtn) previewRemovalBtn.disabled = false;
        };
        
        img.onerror = (e) => {
            console.error("Error loading image for watermark editing:", e, file);
            placeholder.style.display = 'block';
            canvas.style.display = 'none';
            alert('无法加载图片进行水印编辑，请确保图片有效且未受CORS限制。');
        };
        img.src = URL.createObjectURL(file);
    }

    calculateDisplaySize(origWidth, origHeight, maxWidth, maxHeight) {
        const ratio = Math.min(maxWidth / origWidth, maxHeight / origHeight);
        return {
            width: Math.round(origWidth * ratio),
            height: Math.round(origHeight * ratio)
        };
    }

    setupCanvasEvents() {
        const canvas = this.currentImage?.canvas;
        if (!canvas) return;
        
        canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        canvas.addEventListener('mousemove', (e) => this.draw(e));
        canvas.addEventListener('mouseup', () => this.stopDrawing());
        canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });
    }

    startDrawing(e) {
        this.isDrawing = true;
        
        this.watermarkMaskHistory.push([...this.watermarkMask]);
        const undoBtn = document.getElementById('undoMask');
        if (undoBtn) undoBtn.disabled = false;
        
        this.draw(e);
    }

    draw(e) {
        if (!this.isDrawing || !this.currentImage) return;
        
        const canvas = this.currentImage.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const brushSize = parseInt(document.getElementById('brushSize')?.value || '15');
        
        this.watermarkMask.push({
            x: x,
            y: y,
            size: brushSize
        });
        
        const ctx = this.currentImage.ctx;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        const previewBtn = document.getElementById('previewRemoval');
        const clearBtn = document.getElementById('clearMask');
        if (previewBtn) previewBtn.disabled = this.watermarkMask.length === 0;
        if (clearBtn) clearBtn.disabled = this.watermarkMask.length === 0;
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    clearWatermarkMask() {
        if (!this.currentImage) return;
        
        this.watermarkMask = [];
        this.watermarkMaskHistory = [];
        
        const ctx = this.currentImage.ctx;
        const img = this.currentImage.originalImg;
        ctx.clearRect(0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        ctx.drawImage(img, 0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        
        const previewBtn = document.getElementById('previewRemoval');
        const clearBtn = document.getElementById('clearMask');
        const undoBtn = document.getElementById('undoMask');
        if (previewBtn) previewBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        if (undoBtn) undoBtn.disabled = true;
    }

    undoWatermarkMask() {
        if (this.watermarkMaskHistory.length === 0) return;
        
        this.watermarkMask = this.watermarkMaskHistory.pop();
        
        this.redrawWatermarkCanvas();
        
        const undoBtn = document.getElementById('undoMask');
        const previewBtn = document.getElementById('previewRemoval');
        const clearBtn = document.getElementById('clearMask');
        if (undoBtn) undoBtn.disabled = this.watermarkMaskHistory.length === 0;
        if (previewBtn) previewBtn.disabled = this.watermarkMask.length === 0;
        if (clearBtn) clearBtn.disabled = this.watermarkMask.length === 0;
    }

    redrawWatermarkCanvas() {
        if (!this.currentImage) return;
        
        const ctx = this.currentImage.ctx;
        const img = this.currentImage.originalImg;
        
        ctx.clearRect(0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        ctx.drawImage(img, 0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff6b6b';
        this.watermarkMask.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.size / 2, 0, 2 * Math.PI);
            ctx.fill();
        });
        ctx.globalAlpha =1.0;
    }

    async previewWatermarkRemoval() {
        if (!this.currentImage || this.watermarkMask.length === 0) return;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="max-w-4xl w-full mx-4">
                <div class="morandi-card rounded-3xl overflow-hidden shadow-2xl">
                    <div class="p-6 border-b border-morandi-cloud">
                        <div class="flex justify-between items-center">
                            <h3 class="serif-font text-xl font-medium text-morandi-deep">🎯 去水印预览效果</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                                    class="text-morandi-shadow hover:text-morandi-deep transition-colors p-2">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="text-center">
                                <h4 class="text-sm font-medium text-morandi-deep mb-3">原始图像（含涂抹标记）</h4>
                                <div class="bg-gray-100 rounded-xl p-4">
                                    <canvas id="previewOriginal" class="max-w-full rounded-lg"></canvas>
                                </div>
                            </div>
                            <div class="text-center">
                                <h4 class="text-sm font-medium text-morandi-deep mb-3">去水印效果预览</h4>
                                <div class="bg-gray-100 rounded-xl p-4">
                                    <canvas id="previewProcessed" class="max-w-full rounded-lg"></canvas>
                                </div>
                                <div id="previewProcessing" class="mt-4 text-sm text-morandi-shadow">
                                    <div class="animate-pulse">🔄 正在处理中...</div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-6 text-center">
                            <p class="text-sm text-morandi-shadow">预览效果仅供参考，实际处理效果可能有所差异</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const originalCanvas = document.getElementById('previewOriginal');
        const originalCtx = originalCanvas?.getContext('2d');
        if (originalCanvas && originalCtx && this.currentImage) {
            originalCanvas.width = this.currentImage.displayWidth;
            originalCanvas.height = this.currentImage.displayHeight;
            originalCtx.drawImage(this.currentImage.canvas, 0, 0);
        }
        
        await this.processWatermarkRemovalPreview();
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async processWatermarkRemovalPreview() {
        const processedCanvas = document.getElementById('previewProcessed');
        const processingDiv = document.getElementById('previewProcessing');
        if (!processedCanvas || !processingDiv || !this.currentImage) return;

        const processedCtx = processedCanvas.getContext('2d');
        
        processedCanvas.width = this.currentImage.displayWidth;
        processedCanvas.height = this.currentImage.displayHeight;
        
        processedCtx.drawImage(this.currentImage.originalImg, 0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        
        const algorithm = document.getElementById('repairAlgorithm')?.value;
        const strength = parseInt(document.getElementById('manualRepairStrength')?.value || '7');
        
        const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
        
        processingDiv.innerHTML = '<div class="animate-pulse">🔄 正在应用修复算法...</div>';
        
        await this.sleep(500);
        
        for (const maskPoint of this.watermarkMask) {
            this.applyRepairToRegion(imageData, maskPoint, algorithm, strength);
        }
        
        processedCtx.putImageData(imageData, 0, 0);
        processingDiv.innerHTML = '<div class="text-green-600">✅ 处理完成</div>';
    }

    applyRepairToRegion(imageData, maskPoint, algorithm, strength) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        const centerX = Math.round(maskPoint.x);
        const centerY = Math.round(maskPoint.y);
        const radius = Math.round(maskPoint.size / 2);
        
        switch (algorithm) {
            case 'inpaint':
                this.applyInpaintRepair(data, width, height, centerX, centerY, radius, strength);
                break;
            case 'blur':
                this.applyBlurRepair(data, width, height, centerX, centerY, radius, strength);
                break;
            case 'clone':
                this.applyCloneRepair(data, width, height, centerX, centerY, radius, strength);
                break;
            case 'patch':
                this.applyPatchRepair(data, width, height, centerX, centerY, radius, strength);
                break;
        }
    }

    applyInpaintRepair(data, width, height, centerX, centerY, radius, strength) {
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (distance > radius) continue;
                
                const avgColor = this.getWeightedAverageColor(data, width, height, x, y, radius * 1.5, strength);
                const index = (y * width + x) * 4;
                
                const alpha = Math.max(0, 1 - distance / radius); 
                data[index] = data[index] * (1 - alpha) + avgColor.r * alpha;
                data[index + 1] = data[index + 1] * (1 - alpha) + avgColor.g * alpha;
                data[index + 2] = data[index + 2] * (1 - alpha) + avgColor.b * alpha;
            }
        }
    }

    applyBlurRepair(data, width, height, centerX, centerY, radius, strength) {
        const originalData = new Uint8ClampedArray(data); 
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (distance > radius) continue;
                
                const blurredColor = this.getGaussianBlurColor(originalData, width, height, x, y, strength);
                const index = (y * width + x) * 4;
                
                const alpha = Math.max(0, 1 - distance / radius);
                data[index] = data[index] * (1 - alpha) + blurredColor.r * alpha;
                data[index + 1] = data[index + 1] * (1 - alpha) + blurredColor.g * alpha;
                data[index + 2] = data[index + 2] * (1 - alpha) + blurredColor.b * alpha;
            }
        }
    }

    applyCloneRepair(data, width, height, centerX, centerY, radius, strength) {
        const sourceRadius = radius * 2; 
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (distance > radius) continue;
                
                const sourcePixel = this.findNearestSourcePixel(data, width, height, x, y, sourceRadius);
                if (sourcePixel) {
                    const index = (y * width + x) * 4;
                    const alpha = Math.max(0, 1 - distance / radius) * (strength / 10); 
                    
                    data[index] = data[index] * (1 - alpha) + sourcePixel.r * alpha;
                    data[index + 1] = data[index + 1] * (1 - alpha) + sourcePixel.g * alpha;
                    data[index + 2] = data[index + 2] * (1 - alpha) + sourcePixel.b * alpha;
                }
            }
        }
    }

    applyPatchRepair(data, width, height, centerX, centerY, radius, strength) {
        this.applyInpaintRepair(data, width, height, centerX, centerY, radius, strength * 0.6);
        this.applyBlurRepair(data, width, height, centerX, centerY, radius * 0.8, strength * 0.4);
    }

    getWeightedAverageColor(data, width, height, centerX, centerY, sampleRadius, strength) {
        let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
        
        for (let y = centerY - sampleRadius; y <= centerY + sampleRadius; y++) {
            for (let x = centerX - sampleRadius; x <= centerX + sampleRadius; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (distance > sampleRadius) continue;
                
                const weight = Math.exp(-distance * distance / (sampleRadius * sampleRadius / 4));
                const index = (y * width + x) * 4;
                
                totalR += data[index] * weight;
                totalG += data[index + 1] * weight;
                totalB += data[index + 2] * weight;
                totalWeight += weight;
            }
        }
        
        return {
            r: totalWeight > 0 ? totalR / totalWeight : 0,
            g: totalWeight > 0 ? totalG / totalWeight : 0,
            b: totalWeight > 0 ? totalB / totalWeight : 0
        };
    }

    getGaussianBlurColor(data, width, height, centerX, centerY, strength) {
        const blurRadius = Math.max(1, strength);
        let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
        
        for (let y = centerY - blurRadius; y <= centerY + blurRadius; y++) {
            for (let x = centerX - blurRadius; x <= centerX + blurRadius; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                const weight = Math.exp(-distance * distance / (2 * blurRadius * blurRadius));
                const index = (y * width + x) * 4;
                
                totalR += data[index] * weight;
                totalG += data[index + 1] * weight;
                totalB += data[index + 2] * weight;
                totalWeight += weight;
            }
        }
        
        return {
            r: totalWeight > 0 ? totalR / totalWeight : 0,
            g: totalWeight > 0 ? totalG / totalWeight : 0,
            b: totalWeight > 0 ? totalB / totalWeight : 0
        };
    }

    findNearestSourcePixel(data, width, height, targetX, targetY, searchRadius) {
        for (let radius = 1; radius <= searchRadius; radius++) {
            for (let angle = 0; angle < 360; angle += 45) { 
                const radians = angle * Math.PI / 180;
                const x = Math.round(targetX + radius * Math.cos(radians));
                const y = Math.round(targetY + radius * Math.sin(radians));
                
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const index = (y * width + x) * 4;
                    if (data[index+3] === 255) { 
                        return {
                            r: data[index],
                            g: data[index + 1],
                            b: data[index + 2]
                        };
                    }
                }
            }
        }
        return null;
    }

    updateBackgroundInputs() {
        const typeSelect = document.getElementById('backgroundType');
        const solidOptions = document.getElementById('solidColorOptions');
        const gradientOptions = document.getElementById('gradientOptions');
        
        if (!typeSelect || !solidOptions || !gradientOptions) return;

        if (typeSelect.value === 'gradient') {
            solidOptions.style.display = 'none';
            gradientOptions.style.display = 'block';
        } else {
            solidOptions.style.display = 'block';
            gradientOptions.style.display = 'none';
        }
    }

    updateSpliceInputs() {
        const spliceModeSelect = document.getElementById('spliceMode');
        const gridOptions = document.getElementById('gridOptions');
        
        if (!spliceModeSelect || !gridOptions) return;
        gridOptions.style.display = spliceModeSelect.value === 'grid' ? 'block' : 'none';
    }

    applyFilterPreset(preset) {
        const presets = {
            none: { brightness: 100, contrast: 100, saturation: 100, blur: 0 },
            grayscale: { brightness: 100, contrast: 110, saturation: 0, blur: 0 },
            sepia: { brightness: 110, contrast: 90, saturation: 80, blur: 0 },
            vintage: { brightness: 90, contrast: 120, saturation: 70, blur: 1 }
        };

        const values = presets[preset];
        if (values) {
            Object.keys(values).forEach(key => {
                const input = document.getElementById(key);
                const output = document.getElementById(key + 'Value');
                if (input && output) {
                    input.value = values[key];
                    output.textContent = values[key] + (key === 'blur' ? 'px' : '%');
                }
            });
        }
    }

    async startProcessing(mode) {
        if (mode === 'splice') {
            if (this.files.length < 2) {
                alert('图像拼接需要至少2张图片');
                return;
            }
            return this.processSplice();
        }
        
        if (this.isProcessing || this.files.length === 0) return;

        this.isProcessing = true;
        this.showProgress();
        
        const results = [];
        const totalFiles = this.files.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = this.files[i];
            const progress = ((i + 1) / totalFiles) * 100;
            
            this.updateProgress(progress, `正在处理: ${file.name}`, i + 1, 0, totalFiles - i - 1);
            
            try {
                await this.sleep(500 + Math.random() * 1000); 
                const result = await this.processFile(file, mode);
                results.push(result);
            } catch (error) {
                console.error(`Error processing file ${file.name} in mode ${mode}:`, error);
                results.push({
                    originalName: file.name,
                    processedName: `${file.name.split('.')[0]}_error.${file.type ? file.type.split('/')[1] : 'unknown'}`,
                    originalUrl: URL.createObjectURL(file),
                    processedUrl: '#',
                    type: mode,
                    size: file.size,
                    format: file.type ? file.type.split('/')[1] : 'unknown',
                    error: `处理失败: ${error.message || '未知错误'}`
                });
            }
        }

        this.results.push(...results);
        this.showResults();
        this.hideProgress();
        this.isProcessing = false;
        this.updateUI();
    }

    openBatchSelectModal() {
        const modal = document.getElementById('batchSelectModal');
        if (modal) modal.classList.remove('hidden');
    }

    closeBatchSelectModal() {
        const modal = document.getElementById('batchSelectModal');
        if (modal) modal.classList.add('hidden');
    }

    async confirmBatchOperations() {
        this.closeBatchSelectModal();
        
        const selectedOperations = [];
        const operationListItems = document.querySelectorAll('#batchOperationList .draggable-item');
        operationListItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                selectedOperations.push(checkbox.value);
            }
        });

        if (selectedOperations.length === 0) {
            alert('请至少选择一个批量操作项。');
            return;
        }
        
        if (this.isProcessing || this.files.length === 0) {
            console.warn("Batch processing already in progress or no files selected.");
            return;
        }

        this.isProcessing = true;
        this.showProgress();
        
        const finalResults = []; 
        const totalFiles = this.files.length;
        const operations = selectedOperations; 

        // Handle 'splice' as a special case if it's in the batch and needs to combine all files.
        // If it's a per-file splice, it will be handled by processFile like others.
        // Here, we assume 'splice' means combining ALL current files, and it's a *terminal* operation.
        const isSpliceInBatchAndMultiFile = operations.includes('splice') && this.files.length > 1;

        if (isSpliceInBatchAndMultiFile) {
            if (operations.indexOf('splice') !== operations.length - 1) {
                alert("警告：'图像拼接'功能在批量处理中将合并所有文件，并且通常是最后一个操作。如果不是最后一个，其行为可能不符合预期。");
            }

            this.updateProgress(10, '正在准备批量拼接...', 0, 0, totalFiles);
            let spliceResult = await this.processSpliceBatch(this.files, 'splice');
            
            if (spliceResult.error) {
                console.error("批量拼接操作失败:", spliceResult.error);
                finalResults.push(spliceResult); 
            } else {
                let currentOutputOfChain = spliceResult;
                // Run subsequent operations on the single spliced image
                const operationsAfterSplice = operations.slice(operations.indexOf('splice') + 1);

                for (const op of operationsAfterSplice) {
                    this.updateProgress(50 + (operations.indexOf(op) / operations.length) * 40, `正在处理拼接图: ${this.getOperationName(op)}`, 0, 1, 0);
                    try {
                        currentOutputOfChain = await this.processFile(currentOutputOfChain, op);
                        if (currentOutputOfChain.error) {
                            console.error(`操作 ${op} 在拼接图上失败:`, currentOutputOfChain.error);
                            break; 
                        }
                    } catch (err) {
                        console.error(`执行操作 ${op} 在拼接图上发生未捕获错误:`, err);
                        currentOutputOfChain.error = `关键错误: ${err.message || '未知错误'}`;
                        break;
                    }
                }
                finalResults.push(currentOutputOfChain); 
            }
        } else {
            // Standard per-file batch processing (including single-file splice if only one file)
            for (let i = 0; i < totalFiles; i++) {
                let currentFileToProcess = this.files[i]; 
                const originalFileInputForResults = this.files[i]; 

                for (let j = 0; j < operations.length; j++) {
                    const operation = operations[j];
                    const progress = ((i * operations.length + j + 1) / (totalFiles * operations.length)) * 100;
                    
                    this.updateProgress(
                        progress, 
                        `正在处理: ${originalFileInputForResults.name} - ${this.getOperationName(operation)}`,
                        i * operations.length + j + 1,
                        0,
                        totalFiles * operations.length - (i * operations.length + j + 1)
                    );
                    
                    try {
                        await this.sleep(300);
                        let resultOfOperation = await this.processFile(currentFileToProcess, operation);
                        
                        if (resultOfOperation.error) {
                            console.error(`操作 '${operation}' 失败 for ${originalFileInputForResults.name}:`, resultOfOperation.error);
                            currentFileToProcess = resultOfOperation; 
                            break; 
                        } else {
                            currentFileToProcess = resultOfOperation; 
                        }
                    } catch (err) {
                        console.error(`执行操作 '${operation}' 发生未捕获错误 for ${originalFileInputForResults.name}:`, err);
                        currentFileToProcess = { 
                            originalName: originalFileInputForResults.name,
                            processedName: `${originalFileInputForResults.name.split('.')[0]}_${operation}_CRITICAL_ERROR.${originalFileInputForResults.type ? originalFileInputForResults.type.split('/')[1] : 'unknown'}`,
                            originalUrl: URL.createObjectURL(originalFileInputForResults),
                            processedUrl: '#',
                            type: operation,
                            size: 0,
                            format: originalFileInputForResults.type ? originalFileInputForResults.type.split('/')[1] : 'unknown',
                            error: `关键错误: ${err.message || '未知错误'}`
                        };
                        break; 
                    }
                }
                finalResults.push(currentFileToProcess);
            }
        }

        this.results.push(...finalResults); 
        this.showResults();
        this.hideProgress();
        this.isProcessing = false;
        this.updateUI();
    }

    async processSpliceBatch(files, mode) {
        if (files.length < 2) {
            return { error: '图像拼接需要至少2张图片', format: 'png', type: mode, originalName: 'splice_error', processedName: 'splice_error.png' }; 
        }
        
        try {
            const imagesToSplice = await Promise.all(files.map(f => this.loadImage(f))); 
            const splicingResult = await this.createSplicedImage(
                imagesToSplice,
                document.getElementById('spliceMode')?.value,
                parseInt(document.getElementById('imageSpacing')?.value || '10'),
                document.getElementById('spliceBackground')?.value,
                parseInt(document.getElementById('spliceWidth')?.value || '1200'),
                document.getElementById('maintainAspect')?.checked
            );
            
            return {
                originalName: '拼接批次源文件', 
                processedName: splicingResult.processedName,
                originalUrl: null, 
                processedUrl: splicingResult.processedUrl,
                type: mode,
                size: splicingResult.size,
                format: splicingResult.format
            };
        } catch (error) {
            console.error("Batch splice operation failed:", error);
            return {
                error: `图像拼接失败: ${error.message || error}`,
                originalName: '拼接批次源文件',
                processedName: 'splice_error.png',
                originalUrl: null,
                processedUrl: '#',
                type: mode,
                size: 0,
                format: 'png'
            };
        }
    }

    getOperationName(operation) {
        const names = {
            convert: '格式转换',
            compress: '压缩优化',
            resize: '尺寸调整/裁剪',
            watermark: '水印处理',
            filter: '艺术滤镜',
            background: '一键加底',
            splice: '图像拼接',
            analyze: '图像分析'
        };
        return names[operation] || operation;
    }

    async processFile(file, mode) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise(async (resolve) => {
            try {
                const loadedImage = await this.loadImage(file); 
                img.src = loadedImage.src; 
                
                img.onload = async () => {
                    canvas.width = img.naturalWidth; 
                    canvas.height = img.naturalHeight;
                    ctx.drawImage(img, 0, 0);

                    let compressResult = null;
                    let currentOutputFormat = 'png'; 

                    let effectiveInputFormat = 'unknown';
                    if (file instanceof File) {
                        effectiveInputFormat = file.type ? file.type.split('/')[1].toLowerCase() : 'png';
                    } else if (file.format) { 
                        effectiveInputFormat = file.format.toLowerCase();
                    }
                    currentOutputFormat = effectiveInputFormat; 


                    switch(mode) {
                        case 'convert':
                            currentOutputFormat = document.getElementById('targetFormat')?.value || 'png';
                            await this.applyFormatConversion(canvas, ctx, img);
                            break;
                        case 'compress':
                            compressResult = await this.applyCompression(canvas, ctx, img, file);
                            
                            const selectedCompressFormat = document.getElementById('compressOutputFormat')?.value;
                            if (selectedCompressFormat && selectedCompressFormat !== 'original') {
                                currentOutputFormat = selectedCompressFormat;
                            } else {
                                currentOutputFormat = compressResult.format || effectiveInputFormat;
                            }
                            break;
                        case 'resize':
                            await this.applyResize(canvas, ctx, img);
                            currentOutputFormat = effectiveInputFormat; 
                            break;
                        case 'watermark':
                            await this.applyWatermark(canvas, ctx, img);
                            currentOutputFormat = effectiveInputFormat; 
                            break;
                        case 'filter':
                            await this.applyFilter(canvas, ctx, img);
                            currentOutputFormat = effectiveInputFormat; 
                            break;
                        case 'background':
                            await this.applyBackground(canvas, ctx, img);
                            if (this.isImageTransparent(canvas)) { // Check if transparency is needed for output
                                currentOutputFormat = 'png'; 
                            } else {
                                currentOutputFormat = (effectiveInputFormat === 'jpeg' || effectiveInputFormat === 'jpg') ? 'jpeg' : 'png';
                            }
                            break;
                        case 'analyze':
                            const analysisResult = await this.analyzeImage(file, img);
                            resolve(analysisResult);
                            return; 
                        case 'splice':
                            // For a single file, "splice" might just be adding borders or other single-image layout.
                            console.warn("Splice operation in per-file processFile is simplified. It processes the single input image.");
                            const singleSpliceResult = await this.createSplicedImage([img], 'vertical', 10, '#f4f1ec', img.naturalWidth + 20, true);
                            currentOutputFormat = singleSpliceResult.format;
                            // Draw the single spliced image back to main canvas for next operation
                            canvas.width = singleSpliceResult.img.naturalWidth;
                            canvas.height = singleSpliceResult.img.naturalHeight;
                            ctx.drawImage(singleSpliceResult.img, 0, 0);
                            break;
                    }

                    let finalQualityForOutput = parseInt(document.getElementById('jpegQuality')?.value || '85') / 100;
                    if (mode === 'compress' && compressResult && compressResult.useTargetSize) {
                        finalQualityForOutput = compressResult.quality;
                    }
                    
                    const outputMimeType = `image/${currentOutputFormat === 'jpg' ? 'jpeg' : currentOutputFormat}`; 
                    
                    const processedUrl = canvas.toDataURL(outputMimeType, finalQualityForOutput);
                    const fileSize = this.getCanvasSizeBytes(canvas, currentOutputFormat, finalQualityForOutput);
                    
                    const originalNameForOutput = file.name || (file.originalName ? file.originalName : 'processed_image');
                    const baseName = originalNameForOutput.split('.')[0];
                    const outputFilename = `${baseName}_${this.getOperationName(mode).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '')}.${currentOutputFormat === 'jpeg' ? 'jpg' : currentOutputFormat}`; // Sanitize filename

                    resolve({
                        originalName: originalNameForOutput,
                        processedName: outputFilename,
                        originalUrl: (file instanceof File) ? URL.createObjectURL(file) : (file.originalUrl || file.processedUrl),
                        processedUrl: processedUrl,
                        type: mode,
                        size: fileSize,
                        format: currentOutputFormat
                    });
                };

                // Trigger img loading
                img.src = loadedImage.src;

            } catch (error) {
                console.error(`文件处理失败 (模式: ${mode}):`, error, "输入文件:", file);
                const originalNameForError = file.name || (file.originalName ? file.originalName : 'error_image');
                const originalFormatForError = file.type ? file.type.split('/')[1] : (file.format || 'unknown');
                resolve({
                    originalName: originalNameForError,
                    processedName: `${originalNameForError.split('.')[0]}_${this.getOperationName(mode).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '')}_错误.${originalFormatForError}`,
                    originalUrl: (file instanceof File) ? URL.createObjectURL(file) : (file.originalUrl || file.processedUrl),
                    processedUrl: '#', 
                    type: mode,
                    size: file.size || 0,
                    format: originalFormatForError,
                    error: `处理失败: ${error.message || error}`
                });
            }
        });
    }

    async applyCompression(canvas, ctx, img, file) {
        const level = document.getElementById('compressLevel')?.value;
        const targetSizeKB = parseInt(document.getElementById('targetSize')?.value || '0');
        let quality = 0.7; // Default quality for medium compression
        
        switch(level) {
            case 'light': quality = 0.9; break;
            case 'medium': quality = 0.7; break;  
            case 'heavy': quality = 0.5; break;
            case 'custom': quality = parseInt(document.getElementById('customQuality')?.value || '70') / 100; break;
        }

        const selectedOutputFormat = document.getElementById('compressOutputFormat')?.value || 'original';
        let effectiveOutputFormat = file.type ? file.type.split('/')[1].toLowerCase() : 'png'; // Start with original format based on input `file`

        if (selectedOutputFormat !== 'original') {
            effectiveOutputFormat = selectedOutputFormat;
        } else {
            // If 'original' is chosen, check the actual transparency of the canvas content.
            // If the current image has transparency, it must remain PNG/WebP to preserve it.
            // If it doesn't have transparency, JPEG is a good default for compression.
            if (this.isImageTransparent(canvas)) { // Check canvas, not original file directly
                effectiveOutputFormat = (effectiveOutputFormat === 'webp') ? 'webp' : 'png'; // Prefer WebP if it was originally, else PNG
            } else {
                effectiveOutputFormat = (effectiveInputFormat === 'jpeg' || effectiveInputFormat === 'jpg') ? 'jpeg' : 'jpeg'; // Default to JPEG if no transparency needed and not originally transparent format
            }
        }

        if (targetSizeKB > 0) {
            const targetSizeBytes = targetSizeKB * 1024;
            const finalQuality = await this.findOptimalQuality(canvas, targetSizeBytes, quality, `image/${effectiveOutputFormat}`);
            return { quality: finalQuality, targetSizeKB, useTargetSize: true, format: effectiveOutputFormat };
        }
        
        return { quality: quality, targetSizeKB: 0, useTargetSize: false, format: effectiveOutputFormat };
    }


    async findOptimalQuality(canvas, targetSizeBytes, initialQuality, targetMimeType) {
        let minQuality = 0.1;
        let maxQuality = 1.0;
        let bestQuality = initialQuality;
        let iterations = 0;
        const maxIterations = 15; 
    
        const format = targetMimeType.split('/')[1];
    
        if (format === 'png') {
            // PNG compression is mostly lossless. Trying to hit specific size with `quality` parameter is unreliable.
            // If the goal is a smaller PNG, it needs specialized PNG optimization (e.g., reducing color palette, which Canvas.toDataURL doesn't control).
            // So, for PNG, we return max quality and accept its natural size.
            return 1.0; 
        }
    
        let currentSize = this.getCanvasSizeBytes(canvas, format, initialQuality);
        
        if (currentSize <= targetSizeBytes) {
            return initialQuality;
        }
    
        while (iterations < maxIterations && Math.abs(maxQuality - minQuality) > 0.001) { 
            const testQuality = (minQuality + maxQuality) / 2;
            const testSize = this.getCanvasSizeBytes(canvas, format, testQuality);
            
            if (testSize <= targetSizeBytes) {
                minQuality = testQuality;
                bestQuality = testQuality;
            } else {
                maxQuality = testQuality;
            }
            iterations++;
        }
    
        currentSize = this.getCanvasSizeBytes(canvas, format, bestQuality);
        while (currentSize > targetSizeBytes && bestQuality > 0.05) { 
            bestQuality = Math.max(0.05, bestQuality - 0.005); 
            currentSize = this.getCanvasSizeBytes(canvas, format, bestQuality);
        }
    
        return Math.max(0.05, Math.min(1.0, bestQuality)); 
    }
    
    getCanvasSizeBytes(canvas, format, quality) {
        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`; 
        
        let dataURL;
        try {
            const actualQuality = (format === 'png' || (format === 'webp' && !this.isImageTransparent(canvas))) ? undefined : quality; 
            dataURL = canvas.toDataURL(mimeType, actualQuality);
        } catch (e) {
            console.error(`Error converting canvas to ${mimeType} for size calculation:`, e);
            return Infinity; 
        }
        
        const base64String = dataURL.split(',')[1];
        if (!base64String) {
            console.warn(`Could not get base64 string for format ${format} from dataURL.`);
            return Infinity;
        }
        return Math.round(base64String.length * 0.75); 
    }

    async applyBackground(canvas, ctx, img) {
        const backgroundTypeSelect = document.getElementById('backgroundType');
        const imagePositionSelect = document.getElementById('imagePosition');
        if (!backgroundTypeSelect || !imagePositionSelect) return;

        const type = backgroundTypeSelect.value;
        const position = imagePositionSelect.value;
        
        const originalCanvasContent = document.createElement('canvas');
        const originalContentCtx = originalCanvasContent.getContext('2d');
        originalCanvasContent.width = canvas.width;
        originalCanvasContent.height = canvas.height;
        originalContentCtx.drawImage(canvas, 0, 0);
        
        const backgroundCanvas = document.createElement('canvas');
        const backgroundCtx = backgroundCanvas.getContext('2d');
        
        backgroundCanvas.width = canvas.width;
        backgroundCanvas.height = canvas.height;

        let bgColor = '#f4f1ec'; 
        
        if (type === 'solid') {
            const backgroundColor1Input = document.getElementById('backgroundColor1');
            if (!backgroundColor1Input) return;
            bgColor = backgroundColor1Input.value;
            backgroundCtx.fillStyle = bgColor;
            backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
        } else if (type === 'gradient') {
            const gradientStartInput = document.getElementById('gradientStart');
            const gradientEndInput = document.getElementById('gradientEnd');
            const gradientDirectionSelect = document.getElementById('gradientDirection');
            if (!gradientStartInput || !gradientEndInput || !gradientDirectionSelect) return;

            const startColor = gradientStartInput.value;
            const endColor = gradientEndInput.value;
            const direction = gradientDirectionSelect.value;
            
            let gradient;
            switch(direction) {
                case 'horizontal':
                    gradient = backgroundCtx.createLinearGradient(0, 0, backgroundCanvas.width, 0);
                    break;
                case 'vertical':
                    gradient = backgroundCtx.createLinearGradient(0, 0, 0, backgroundCanvas.height);
                    break;
                case 'diagonal':
                    gradient = backgroundCtx.createLinearGradient(0, 0, backgroundCanvas.width, backgroundCanvas.height);
                    break;
                case 'radial':
                    gradient = backgroundCtx.createRadialGradient(
                        backgroundCanvas.width/2, backgroundCanvas.height/2, 0,
                        backgroundCanvas.width/2, backgroundCanvas.height/2, Math.max(backgroundCanvas.width, backgroundCanvas.height)/2
                    );
                    break;
            }
            
            gradient.addColorStop(0, startColor);
            gradient.addColorStop(1, endColor);
            backgroundCtx.fillStyle = gradient;
            backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
        } else if (type === 'random') {
            const colors = ['#9BB5A6', '#C4A484', '#D4CFC9', '#B8968C', '#E6D7FF', '#B8F2FF', '#FFD6CC', '#FFF4CC'];
            bgColor = colors[Math.floor(Math.random() * colors.length)];
            backgroundCtx.fillStyle = bgColor;
            backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
        }
        
        let drawX = 0, drawY = 0, drawWidth = originalCanvasContent.width, drawHeight = originalCanvasContent.height;

        switch(position) {
            case 'center':
                drawX = (backgroundCanvas.width - originalCanvasContent.width) / 2;
                drawY = (backgroundCanvas.height - originalCanvasContent.height) / 2;
                break;
            case 'stretch':
                drawWidth = backgroundCanvas.width;
                drawHeight = backgroundCanvas.height;
                break;
            case 'fit':
                const scaleFit = Math.min(backgroundCanvas.width / originalCanvasContent.width, backgroundCanvas.height / originalCanvasContent.height);
                drawWidth = originalCanvasContent.width * scaleFit;
                drawHeight = originalCanvasContent.height * scaleFit;
                drawX = (backgroundCanvas.width - drawWidth) / 2;
                drawY = (backgroundCanvas.height - drawHeight) / 2;
                break;
            case 'cover':
                const scaleCover = Math.max(backgroundCanvas.width / originalCanvasContent.width, backgroundCanvas.height / originalCanvasContent.height);
                drawWidth = originalCanvasContent.width * scaleCover;
                drawHeight = originalCanvasContent.height * scaleCover;
                drawX = (backgroundCanvas.width - drawWidth) / 2;
                drawY = (backgroundCanvas.height - drawHeight) / 2;
                break;
        }
        
        backgroundCtx.drawImage(originalCanvasContent, drawX, drawY, drawWidth, drawHeight);

        canvas.width = backgroundCanvas.width;
        canvas.height = backgroundCanvas.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.drawImage(backgroundCanvas, 0, 0); 
    }

    async processSplice() {
        if (this.isProcessing || this.files.length < 2) return;

        this.isProcessing = true;
        this.showProgress();
        
        const spliceModeSelect = document.getElementById('spliceMode');
        const imageSpacingInput = document.getElementById('imageSpacing');
        const spliceBackgroundInput = document.getElementById('spliceBackground');
        const spliceWidthInput = document.getElementById('spliceWidth');
        const maintainAspectCheckbox = document.getElementById('maintainAspect');

        if (!spliceModeSelect || !imageSpacingInput || !spliceBackgroundInput || !spliceWidthInput || !maintainAspectCheckbox) {
            console.error("Missing UI elements for splice operation.");
            this.hideProgress();
            this.isProcessing = false;
            alert("拼接功能UI元素缺失，无法执行。");
            return;
        }

        const mode = spliceModeSelect.value;
        const spacing = parseInt(imageSpacingInput.value);
        const bgColor = spliceBackgroundInput.value;
        const outputWidth = parseInt(spliceWidthInput.value);
        const maintainAspect = maintainAspectCheckbox.checked;
        
        this.updateProgress(20, '正在加载图片...', 0, 1, this.files.length);
        
        try {
            const images = await Promise.all(this.files.map(file => this.loadImage(file)));
            
            this.updateProgress(50, '正在拼接图片...', 0, 1, 0);
            
            const result = await this.createSplicedImage(images, mode, spacing, bgColor, outputWidth, maintainAspect);
            
            this.results.push(result);
            this.showResults();
        } catch (error) {
            console.error("Error during splice operation:", error);
            alert(`图像拼接失败: ${error.message}`);
        } finally {
            this.hideProgress();
            this.isProcessing = false;
            this.updateUI();
        }
    }

    async createSplicedImage(images, mode, spacing, bgColor, outputWidth, maintainAspect) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (images.length === 0) {
            throw new Error("No images to splice.");
        }

        const validImages = images.filter(img => img instanceof HTMLImageElement && img.naturalWidth > 0 && img.naturalHeight > 0);
        if (validImages.length === 0) {
            throw new Error("No valid images could be loaded for splicing.");
        }

        let rows = 1, cols = validImages.length; 

        const scaledImages = validImages.map(img => {
            let width = img.naturalWidth;
            let height = img.naturalHeight;

            if (mode === 'horizontal' || mode === 'grid') {
                const tempWidth = (outputWidth - spacing * (cols + 1)) / cols; 
                if (maintainAspect) {
                    width = tempWidth;
                    height = (img.naturalHeight * width) / img.naturalWidth;
                } else {
                    width = tempWidth; 
                }
            } else if (mode === 'vertical') {
                width = outputWidth - spacing * 2;
                if (maintainAspect) {
                    height = (img.naturalHeight * width) / img.naturalWidth;
                }
            }
            return { img, width: Math.round(width), height: Math.round(height) };
        });

        if (mode === 'horizontal') {
            canvas.width = scaledImages.reduce((sum, p) => sum + p.width, 0) + spacing * (scaledImages.length + 1);
            canvas.height = Math.max(...scaledImages.map(p => p.height)) + spacing * 2;
        } else if (mode === 'vertical') {
            canvas.width = Math.max(...scaledImages.map(p => p.width)) + spacing * 2;
            canvas.height = scaledImages.reduce((sum, p) => sum + p.height, 0) + spacing * (scaledImages.length + 1);
        } else if (mode === 'grid') {
            cols = parseInt(document.getElementById('gridColumns')?.value || '2');
            if (cols === 0) cols = 1; 
            
            const gridCellWidth = (outputWidth - spacing * (cols + 1)) / cols;
            
            scaledImages.forEach(p => {
                let currentImgWidth = gridCellWidth;
                let currentImgHeight = p.img.naturalHeight;

                if (maintainAspect) {
                    currentImgHeight = (p.img.naturalHeight * currentImgWidth) / p.img.naturalWidth;
                }
                p.width = Math.round(currentImgWidth);
                p.height = Math.round(currentImgHeight);
            });

            canvas.width = outputWidth; 
            let currentX = spacing;
            let currentY = spacing;
            let currentRowHeight = 0;
            let totalHeight = spacing; 
            
            for (let i = 0; i < scaledImages.length; i++) {
                const imgData = scaledImages[i];
                if (currentX + imgData.width + spacing > canvas.width && i !== 0) { 
                    totalHeight += currentRowHeight + spacing; 
                    currentY += currentRowHeight + spacing;
                    currentX = spacing; 
                    currentRowHeight = 0; 
                }
                currentRowHeight = Math.max(currentRowHeight, imgData.height);
                currentX += imgData.width + spacing;
            }
            totalHeight += currentRowHeight + spacing; 
            canvas.height = totalHeight;
        } else if (mode === 'custom') {
            console.warn("Custom splice mode requires custom layout logic. Defaulting to vertical arrangement.");
            return this.createSplicedImage(images, 'vertical', spacing, bgColor, outputWidth, maintainAspect);
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        currentX = spacing;
        currentY = spacing;
        currentRowMaxHeight = 0;

        for (let i = 0; i < scaledImages.length; i++) {
            const { img, width, height } = scaledImages[i];
            
            if (mode === 'grid') {
                const gridColumns = parseInt(document.getElementById('gridColumns')?.value || '2');
                if (i > 0 && (i % gridColumns === 0)) { 
                    currentX = spacing;
                    currentY += currentRowMaxHeight + spacing;
                    currentRowMaxHeight = 0; 
                }
                currentRowMaxHeight = Math.max(currentRowMaxHeight, height); 
            }

            ctx.drawImage(img, currentX, currentY, width, height);
            
            if (mode === 'horizontal') {
                currentX += width + spacing;
            } else if (mode === 'vertical') {
                currentY += height + spacing;
            } else if (mode === 'grid') {
                currentX += width + spacing;
            }
        }
        
        const dataURL = canvas.toDataURL('image/png', 0.9); 
        
        return {
            img: canvas, // Return the canvas itself for chaining in batch processing
            originalName: 'spliced_images',
            processedName: `spliced_${mode}_${Date.now()}.png`,
            originalUrl: null, 
            processedUrl: dataURL,
            type: 'splice',
            size: this.getCanvasSizeBytes(canvas, 'png', 0.9),
            format: 'png'
        };
    }


    async analyzeImage(file, img) {
        const analyzeColorsCheckbox = document.getElementById('analyzeColors');
        const analyzeDimensionsCheckbox = document.getElementById('analyzeDimensions');
        const analyzeFileInfoCheckbox = document.getElementById('analyzeFileInfo');
        const analyzeQualityCheckbox = document.getElementById('analyzeQuality');
        const colorCountInput = document.getElementById('colorCount');

        if (!analyzeColorsCheckbox || !analyzeDimensionsCheckbox || !analyzeFileInfoCheckbox || !analyzeQualityCheckbox || !colorCountInput) {
            console.error("Missing UI elements for analyze operation.");
            return { error: '分析功能UI元素缺失' };
        }

        const analyzeColors = analyzeColorsCheckbox.checked;
        const analyzeDimensions = analyzeDimensionsCheckbox.checked;
        const analyzeFileInfo = analyzeFileInfoCheckbox.checked;
        const analyzeQuality = analyzeQualityCheckbox.checked;
        const colorCount = parseInt(colorCountInput.value);
        
        const analysis = {
            originalName: file.name || (file.originalName ? file.originalName : 'analyzed_image'),
            processedName: `分析报告_${(file.name || file.originalName).replace(/\.[^/.]+$/, '.json')}`,
            originalUrl: (file instanceof File) ? URL.createObjectURL(file) : (file.originalUrl || file.processedUrl),
            processedUrl: null, 
            type: 'analyze',
            size: 0, 
            format: 'json',
            analysis: {}
        };
        
        if (analyzeDimensions) {
            analysis.analysis.dimensions = {
                width: img.naturalWidth,
                height: img.naturalHeight,
                aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2),
                megapixels: ((img.naturalWidth * img.naturalHeight) / 1000000).toFixed(2)
            };
        }
        
        if (analyzeFileInfo) {
            analysis.analysis.fileInfo = {
                name: file.name || (file.originalName ? file.originalName : 'N/A'),
                size: file.size || 0,
                sizeFormatted: this.formatFileSize(file.size || 0),
                type: file.type || (file.format ? `image/${file.format}` : 'unknown'),
                lastModified: (file instanceof File && file.lastModified) ? new Date(file.lastModified).toISOString() : 'N/A'
            };
        }
        
        if (analyzeColors) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            try {
                ctx.drawImage(img, 0, 0);
                analysis.analysis.colors = this.extractDominantColors(ctx, canvas.width, canvas.height, colorCount);
            } catch (e) {
                console.error("Error extracting colors (possibly CORS):", e);
                analysis.analysis.colors = { error: "无法提取颜色 (可能受CORS限制)" };
            }
        }
        
        if (analyzeQuality) {
            analysis.analysis.quality = await this.assessImageQuality(img, file);
        }
        
        this.displayAnalysisResults(analysis.analysis);
        
        return analysis;
    }

    extractDominantColors(ctx, width, height, count) {
        const pixelCount = width * height;
        const sampleRatio = Math.min(1, 1000000 / pixelCount); 
        const step = Math.max(1, Math.floor(1 / sampleRatio));

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const colorMap = new Map();
        
        for (let i = 0; i < data.length; i += 4 * step) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a > 128) { 
                const quantizedR = Math.floor(r / 32) * 32;
                const quantizedG = Math.floor(g / 32) * 32;
                const quantizedB = Math.floor(b / 32) * 32;
                
                const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
                colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
            }
        }
        
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, count);
        
        return sortedColors.map(([color, frequency]) => {
            const [r, g, b] = color.split(',').map(Number);
            const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            const percentage = ((frequency / pixelCount) * 100).toFixed(1); 
            
            return {
                hex,
                rgb: `rgb(${r}, ${g}, ${b})`,
                frequency,
                percentage: percentage + '%'
            };
        });
    }

    async assessImageQuality(img, file) {
        const originalSize = file.size || 0; 
        const theoreticalSize = img.naturalWidth * img.naturalHeight * 3; 
        const compressionRatio = theoreticalSize > 0 ? ((originalSize / theoreticalSize) * 100).toFixed(1) + '%' : 'N/A';

        return {
            resolution: `${img.naturalWidth}x${img.naturalHeight}`,
            pixelCount: img.naturalWidth * img.naturalHeight,
            density: originalSize > 0 ? (img.naturalWidth * img.naturalHeight / (originalSize / 1024)).toFixed(2) + ' pixels/KB' : 'N/A',
            compressionRatio: compressionRatio,
            estimated: '基于文件大小和像素数量的估算'
        };
    }

    displayAnalysisResults(analysis) {
        const resultsDiv = document.getElementById('analyzeResults');
        const contentDiv = document.getElementById('analyzeResultsContent');
        
        if (!resultsDiv || !contentDiv) return;

        let html = '';
        
        if (analysis.dimensions)  {
            html += `
                <div class="morandi-card rounded-2xl p-6">
                    <h4 class="serif-font font-medium mb-4 text-morandi-deep flex items-center">
                        📐 尺寸信息
                        <span class="ml-2 text-sm font-normal text-morandi-shadow">Dimensions</span>
                    </h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div class="p-3 bg-gradient-to-br from-macaron-mint to-white rounded-xl">
                            <div class="text-morandi-shadow">宽度</div>
                            <div class="font-bold text-morandi-deep">${analysis.dimensions.width}px</div>
                        </div>
                        <div class="p-3 bg-gradient-to-br from-macaron-peach to-white rounded-xl">
                            <div class="text-morandi-shadow">高度</div>
                            <div class="font-bold text-morandi-deep">${analysis.dimensions.height}px</div>
                        </div>
                        <div class="p-3 bg-gradient-to-br from-macaron-lavender to-white rounded-xl">
                            <div class="text-morandi-shadow">宽高比</div>
                            <div class="font-bold text-morandi-deep">${analysis.dimensions.aspectRatio}</div>
                        </div>
                        <div class="p-3 bg-gradient-to-br from-macaron-lemon to-white rounded-xl">
                            <div class="text-morandi-shadow">总像素</div>
                            <div class="font-bold text-morandi-deep">${analysis.dimensions.megapixels}MP</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (analysis.fileInfo) {
            html += `
                <div class="morandi-card rounded-2xl p-6">
                    <h4 class="serif-font font-medium mb-4 text-morandi-deep flex items-center">
                        📁 文件信息
                        <span class="ml-2 text-sm font-normal text-morandi-shadow">File Info</span>
                    </h4>
                    <div class="text-sm space-y-3">
                        <div class="flex justify-between items-center p-3 bg-gradient-to-r from-morandi-pearl to-white rounded-xl">
                            <span class="text-morandi-shadow">文件名</span>
                            <span class="font-medium text-morandi-deep">${analysis.fileInfo.name}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gradient-to-r from-morandi-cloud to-white rounded-xl">
                            <span class="text-morandi-shadow">文件大小</span>
                            <span class="font-medium text-morandi-deep">${analysis.fileInfo.sizeFormatted}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gradient-to-r from-morandi-mist to-white rounded-xl">
                            <span class="text-morandi-shadow">文件类型</span>
                            <span class="font-medium text-morandi-deep">${analysis.fileInfo.type}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (analysis.colors) {
            const colorBlocks = Array.isArray(analysis.colors) ? analysis.colors.map(color => 
                `<div class="flex items-center space-x-3 p-3 bg-gradient-to-r from-white to-morandi-pearl rounded-xl">
                    <div class="w-8 h-8 rounded-full border-2 border-white shadow-sm" style="background: ${color.hex}"></div>
                    <div class="flex-1">
                        <div class="font-medium text-morandi-deep">${color.hex}</div>
                        <div class="text-xs text-morandi-shadow">${color.percentage}</div>
                    </div>
                </div>`
            ).join('') : `<p class="text-xs text-red-500">无法显示颜色信息: ${analysis.colors.error || '未知错误'}</p>`;
            
            html += `
                <div class="morandi-card rounded-2xl p-6">
                    <h4 class="serif-font font-medium mb-4 text-morandi-deep flex items-center">
                        🎨 主色调分析
                        <span class="ml-2 text-sm font-normal text-morandi-shadow">Color Palette</span>
                    </h4>
                    <div class="space-y-3">
                        ${colorBlocks}
                    </div>
                </div>
            `;
        }
        
        if (analysis.quality) {
            html += `
                <div class="morandi-card rounded-2xl p-6">
                    <h4 class="serif-font font-medium mb-4 text-morandi-deep flex items-center">
                        ⭐ 图像质量评估
                        <span class="ml-2 text-sm font-normal text-morandi-shadow">Quality Assessment</span>
                    </h4>
                    <div class="text-sm space-y-3">
                        <div class="flex justify-between items-center p-3 bg-gradient-to-r from-macaron-mint to-white rounded-xl">
                            <span class="text-morandi-shadow">像素密度</span>
                            <span class="font-medium text-morandi-deep">${analysis.quality.density}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gradient-to-r from-macaron-peach to-white rounded-xl">
                            <span class="text-morandi-shadow">压缩比</span>
                            <span class="font-medium text-morandi-deep">${analysis.quality.compressionRatio}</span>
                        </div>
                        <div class="p-3 bg-gradient-to-r from-macaron-lavender to-white rounded-xl">
                            <div class="text-xs text-morandi-shadow italic">${analysis.quality.estimated}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        contentDiv.innerHTML = html;
        resultsDiv.classList.remove('hidden');
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => {
                console.error("Image loading error:", e, file);
                reject(new Error(`无法加载图片: ${file.name || '未知文件'}`));
            };
            // Determine source based on file type
            if (file instanceof File) {
                img.src = URL.createObjectURL(file);
            } else if (file && typeof file.processedUrl === 'string' && (file.processedUrl.startsWith('data:') || file.processedUrl.startsWith('blob:'))) {
                img.src = file.processedUrl;
            } else {
                reject(new Error('无效的文件类型或来源。'));
            }
        });
    }

    showProgress() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) progressSection.classList.remove('hidden');
    }

    hideProgress() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) progressSection.classList.add('hidden');
    }

    updateProgress(percent, task, completed, processing, pending) {
        const progressBar = document.getElementById('progressBar');
        const totalProgress = document.getElementById('totalProgress');
        const currentTask = document.getElementById('currentTask');
        const completedCount = document.getElementById('completed');
        const processingCount = document.getElementById('processing');
        const pendingCount = document.getElementById('pending');

        if (progressBar) progressBar.style.width = percent + '%';
        if (totalProgress) totalProgress.textContent = Math.round(percent) + '%';
        if (currentTask) currentTask.textContent = task;
        if (completedCount !== undefined) completedCount.textContent = completed;
        if (processingCount !== undefined) processingCount.textContent = processing;
        if (pendingCount !== undefined) pendingCount.textContent = pending;
    }

    showResults() {
        const section = document.getElementById('resultsSection');
        const grid = document.getElementById('resultsGrid');
        
        if (!section || !grid) return;

        section.classList.remove('hidden');
        grid.innerHTML = '';
        
        this.results.forEach((result, index) => {
            const resultItem = this.createResultItem(result, index);
            grid.appendChild(resultItem);
        });
    }

    createResultItem(result, index) {
        const div = document.createElement('div');
        div.className = 'result-item morandi-card rounded-2xl p-6 relative overflow-hidden';
        
        const typeText = this.getOperationName(result.type);
        const typeColors = {
            convert: 'from-van-gogh-blue to-monet-water',
            compress: 'from-morandi-sage to-morandi-dust',
            resize: 'from-morandi-clay to-morandi-dust',
            watermark: 'from-macaron-lavender to-macaron-mint',
            filter: 'from-macaron-peach to-macaron-rose',
            background: 'from-monet-lily to-macaron-lavender',
            splice: 'from-morandi-sage to-van-gogh-blue',
            analyze: 'from-macaron-mint to-macaron-peach'
        };
        const typeColor = typeColors[result.type] || 'from-morandi-shadow to-morandi-deep';
        
        // Ensure URLs are valid strings before using them in src. Handle errors gracefully.
        const originalImgSrc = result.originalUrl && typeof result.originalUrl === 'string' ? result.originalUrl : '#';
        const processedImgSrc = result.processedUrl && typeof result.processedUrl === 'string' ? result.processedUrl : '#';

        div.innerHTML = `
            <div class="mb-4">
                <span class="inline-block px-4 py-2 text-xs font-medium text-white bg-gradient-to-r ${typeColor} rounded-full shadow-sm">
                    ${typeText}
                </span>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <p class="text-xs text-morandi-shadow mb-2 font-medium">处理前</p>
                    <div class="relative overflow-hidden rounded-xl border-2 border-morandi-cloud">
                        <img src="${originalImgSrc}" alt="原图" class="w-full h-20 object-cover ${originalImgSrc === '#' ? 'bg-gray-200' : ''}">
                    </div>
                </div>
                <div>
                    <p class="text-xs text-morandi-shadow mb-2 font-medium">处理后</p>
                    <div class="relative overflow-hidden rounded-xl border-2 border-morandi-sage">
                        <img src="${processedImgSrc}" alt="处理后" class="w-full h-20 object-cover ${processedImgSrc === '#' ? 'bg-gray-200' : ''}">
                    </div>
                </div>
            </div>
            ${result.size && result.size !== Infinity ? `<p class="text-xs text-morandi-shadow mb-4 font-medium">文件大小: <span class="text-morandi-deep">${this.formatFileSize(result.size)}</span></p>` : ''}
            ${result.error ? `<p class="text-xs text-red-500 mb-4 p-2 bg-red-50 rounded-lg">⚠️ ${result.error}</p>` : ''}
            <div class="flex space-x-3">
                <button onclick="app.downloadSingle(${index})" 
                        class="flex-1 btn-primary py-3 rounded-xl text-sm font-medium transition-all shadow-sm ${processedImgSrc === '#' || result.error ? 'opacity-50 cursor-not-allowed' : ''}" ${processedImgSrc === '#' || result.error ? 'disabled' : ''}>
                    <span class="relative z-10">下载</span>
                </button>
                <button onclick="app.previewImage('${processedImgSrc}', '${result.processedName}')" 
                        class="flex-1 btn-secondary py-3 rounded-xl text-sm font-medium transition-all shadow-sm ${processedImgSrc === '#' || result.error ? 'opacity-50 cursor-not-allowed' : ''}" ${processedImgSrc === '#' || result.error ? 'disabled' : ''}>
                    预览
                </button>
            </div>
        `;
        
        return div;
    }

    downloadSingle(index) {
        const result = this.results[index];
        if (result && result.processedUrl && result.processedUrl !== '#') {
            this.downloadImage(result.processedUrl, result.processedName);
        } else {
            alert('处理后的图片无效，无法下载。');
        }
    }

    downloadImage(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async downloadAll() {
        if (this.results.length === 0) {
            alert('没有可下载的处理结果。');
            return;
        }

        const zip = new JSZip();
        
        for (const result of this.results) {
            if (result.processedUrl && result.processedUrl !== '#') {
                try {
                    const blob = await (result.processedUrl.startsWith('blob:') ? fetch(result.processedUrl).then(r => r.blob()) : this.dataURLtoBlob(result.processedUrl));
                    zip.file(result.processedName, blob);
                } catch (error) {
                    console.error(`Failed to add ${result.processedName} to zip:`, error);
                    alert(`部分文件下载失败: ${result.processedName}`);
                }
            } else {
                console.warn(`Skipping download for invalid result: ${result.processedName}`);
            }
        }

        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipUrl = URL.createObjectURL(zipBlob);
            
            const currentTime = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            this.downloadImage(zipUrl, `loki_atelier_${currentTime}.zip`);
        } catch (error) {
            console.error("Error generating zip file:", error);
            alert(`生成压缩包失败: ${error.message}`);
        }
    }

    // Helper to convert data URL to Blob for JSZip
    dataURLtoBlob(dataurl) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    previewImage(url, name) {
        if (!url || url === '#') {
            alert('预览图像无效。');
            return;
        }
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="max-w-4xl max-h-full p-6">
                <div class="morandi-card rounded-3xl overflow-hidden shadow-2xl">
                    <div class="p-6 border-b border-morandi-cloud">
                        <div class="flex justify-between items-center">
                            <h3 class="serif-font text-xl font-medium text-morandi-deep">${name}</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                                    class="text-morandi-shadow hover:text-morandi-deep transition-colors p-2">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <img src="${url}" alt="${name}" class="max-w-full max-h-96 mx-auto rounded-xl shadow-lg">
                    </div>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
    }

    previewBatch() {
        if (this.files.length === 0) {
            alert('没有文件可以预览批量操作。请先上传文件。');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="max-w-2xl w-full mx-4">
                <div class="morandi-card rounded-3xl overflow-hidden shadow-2xl">
                    <div class="section-header">
                        <h3 class="serif-font text-2xl font-semibold text-morandi-deep text-center">
                            🎨 批量处理预览
                            <span class="block text-sm font-normal text-morandi-shadow mt-2">Batch Processing Preview</span>
                        </h3>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4 text-morandi-deep">
                            <div class="p-4 bg-gradient-to-r from-macaron-mint to-macaron-lavender rounded-xl">
                                <h4 class="font-medium mb-2">📋 处理流程</h4>
                                <div class="text-sm space-y-1">
                                    <div class="flex items-center space-x-2">
                                        <span class="w-6 h-6 bg-van-gogh-blue text-white rounded-full flex items-center justify-center text-xs">1</span>
                                        <span>格式转换</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="w-6 h-6 bg-morandi-sage text-white rounded-full flex items-center justify-center text-xs">2</span>
                                        <span>压缩优化</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="w-6 h-6 bg-morandi-dust text-white rounded-full flex items-center justify-center text-xs">3</span>
                                        <span>尺寸调整</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="w-6 h-6 bg-morandi-clay text-white rounded-full flex items-center justify-center text-xs">4</span>
                                        <span>水印处理</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="w-6 h-6 bg-monet-lily text-white rounded-full flex items-center justify-center text-xs">5</span>
                                        <span>艺术滤镜</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="w-6 h-6 bg-macaron-lemon text-white rounded-full flex items-center justify-center text-xs">6</span>
                                        <span>一键加底</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="w-6 h-6 bg-van-gogh-blue text-white rounded-full flex items-center justify-center text-xs">7</span>
                                        <span>图像拼接</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="w-6 h-6 bg-morandi-stone text-white rounded-full flex items-center justify-center text-xs">8</span>
                                        <span>图像分析</span>
                                    </div>
                                </div>
                            </div>
                            <div class="p-4 bg-gradient-to-r from-macaron-peach to-macaron-rose rounded-xl">
                                <h4 class="font-medium mb-2">📊 处理信息</h4>
                                <div class="text-sm grid grid-cols-2 gap-3">
                                    <div>文件数量: <span class="font-bold">${this.files.length}</span></div>
                                    <div>预计时间: <span class="font-bold">${Math.ceil(this.files.length * 2.5)}秒</span></div>
                                    <div>处理步骤: <span class="font-bold">所有已选</span></div>
                                    <div>输出格式: <span class="font-bold">多种</span></div>
                                </div>
                            </div>
                            <div class="p-4 bg-gradient-to-r from-macaron-lemon to-white rounded-xl">
                                <h4 class="font-medium mb-2">💡 温馨提示</h4>
                                <div class="text-sm text-morandi-shadow">
                                    批量处理将按顺序应用所有已配置的处理步骤。处理时间取决于文件大小和数量，请耐心等待。
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-4 mt-6">
                            <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                                    class="flex-1 btn-secondary py-3 rounded-xl font-medium">
                                取消
                            </button>
                            <button onclick="app.batchProcessAll(); this.parentElement.parentElement.parentElement.parentElement.remove();" 
                                    class="flex-1 btn-primary py-3 rounded-xl font-medium">
                                <span class="relative z-10">开始处理</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
    }

    resetAllSettings() {
        document.querySelectorAll('select, input[type="range"], input[type="number"], input[type="text"], textarea').forEach(input => {
            if (input.defaultValue !== undefined) {
                input.value = input.defaultValue;
            }
        });
        
        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.dispatchEvent(new Event('input'));
        });
        
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 z-50 morandi-card rounded-2xl p-4 shadow-2xl transform translate-x-full transition-transform duration-500';
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-br from-morandi-sage to-van-gogh-blue rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <div>
                    <div class="font-medium text-morandi-deep">设置已重置</div>
                    <div class="text-xs text-morandi-shadow">所有参数已恢复默认值</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(full)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    clearResults() {
        this.results = [];
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) resultsSection.classList.add('hidden');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

let app; 

document.addEventListener('DOMContentLoaded', function() {
    app = new ArtisticImageProcessor();
    app.init(); 
    window.app = app;
});