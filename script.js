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
            console.log('🎨 Loki\'s Digital Atelier 初始化成功！', this); // Add debug log for 'this'
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
                tabElement.addEventListener('click', this.switchTab.bind(this, mode)); // Explicitly bind 'this'
            }
        });

        // File selection
        const fileInput = getElement('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this)); // Explicitly bind 'this'
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
            clearFilesBtn.addEventListener('click', this.clearFiles.bind(this)); // Explicitly bind 'this'
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
                button.addEventListener('click', this.startProcessing.bind(this, mode)); // Explicitly bind 'this'
            }
        });

        // Batch operations
        const batchAllBtn = getElement('batchAll');
        if (batchAllBtn) {
            batchAllBtn.addEventListener('click', this.openBatchSelectModal.bind(this)); // Explicitly bind 'this'
        }
        
        const previewBatchBtn = getElement('previewBatch');
        if (previewBatchBtn) {
            previewBatchBtn.addEventListener('click', this.previewBatch.bind(this)); // Explicitly bind 'this'
        }
        
        const resetAllBtn = getElement('resetAll');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', this.resetAllSettings.bind(this)); // Explicitly bind 'this'
        }

        // Result actions
        const downloadAllBtn = getElement('downloadAll');
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', this.downloadAll.bind(this)); // Explicitly bind 'this'
        }
        
        const clearResultsBtn = getElement('clearResults');
        if (clearResultsBtn) {
            clearResultsBtn.addEventListener('click', this.clearResults.bind(this)); // Explicitly bind 'this'
        }

        // Filter presets
        document.querySelectorAll('.filter-preset').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyFilterPreset(e.target.dataset.filter));
        });

        // Mode-specific input updates
        const resizeModeSelect = getElement('resizeMode');
        if (resizeModeSelect) {
            resizeModeSelect.addEventListener('change', this.updateResizeInputs.bind(this)); // Explicitly bind 'this'
        }
        
        const watermarkTypeSelect = getElement('watermarkType');
        if (watermarkTypeSelect) {
            watermarkTypeSelect.addEventListener('change', this.updateWatermarkInputs.bind(this)); // Explicitly bind 'this'
        }
        
        // New functionality event listeners (using querySelectorAll for robustness)
        document.querySelectorAll('input[name="resizeType"]').forEach(radio => {
            radio.addEventListener('change', this.updateResizeTypeInputs.bind(this)); // Explicitly bind 'this'
        });
        document.querySelectorAll('input[name="cropMode"]').forEach(radio => {
            radio.addEventListener('change', this.updateCropModeInputs.bind(this)); // Explicitly bind 'this'
        });
        document.querySelectorAll('input[name="watermarkAction"]').forEach(radio => {
            radio.addEventListener('change', this.updateWatermarkActionInputs.bind(this)); // Explicitly bind 'this'
        });
        document.querySelectorAll('input[name="removeMethod"]').forEach(radio => {
            radio.addEventListener('change', this.updateRemoveMethodInputs.bind(this)); // Explicitly bind 'this'
        });
        const backgroundTypeSelect = getElement('backgroundType');
        if (backgroundTypeSelect) {
            backgroundTypeSelect.addEventListener('change', this.updateBackgroundInputs.bind(this)); // Explicitly bind 'this'
        }
        
        const spliceModeSelect = getElement('spliceMode');
        if (spliceModeSelect) {
            spliceModeSelect.addEventListener('change', this.updateSpliceInputs.bind(this)); // Explicitly bind 'this'
        }
        
        // Watermark brush/mask events
        const clearMaskBtn = getElement('clearMask');
        if (clearMaskBtn) {
            clearMaskBtn.addEventListener('click', this.clearWatermarkMask.bind(this)); // Explicitly bind 'this'
        }
        
        const previewRemovalBtn = getElement('previewRemoval');
        if (previewRemovalBtn) {
            previewRemovalBtn.addEventListener('click', this.previewWatermarkRemoval.bind(this)); // Explicitly bind 'this'
        }
        
        const undoMaskBtn = getElement('undoMask');
        if (undoMaskBtn) {
            undoMaskBtn.addEventListener('click', this.undoWatermarkMask.bind(this)); // Explicitly bind 'this'
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
            aspectRatioSelect.addEventListener('change', this.updateAspectRatioInputs.bind(this)); // Explicitly bind 'this'
        }
        
        const resetCropBtn = getElement('resetCropSelection');
        if (resetCropBtn) {
            resetCropBtn.addEventListener('click', this.resetCropSelection.bind(this)); // Explicitly bind 'this'
        }
        
        const previewCropBtn = getElement('previewCrop');
        if (previewCropBtn) {
            previewCropBtn.addEventListener('click', this.previewCropSelection.bind(this)); // Explicitly bind 'this'
        }
        
        const applyCropBtn = getElement('applyCropSelection');
        if (applyCropBtn) {
            applyCropBtn.addEventListener('click', this.applyCropSelection.bind(this)); // Explicitly bind 'this'
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
        console.log("File select event triggered."); // Debugging
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        console.log("Selected files:", files); // Debugging
        this.addFiles(files);
    }

    addFiles(files) {
        this.files.push(...files);
        console.log("Current files array:", this.files); // Debugging
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
            console.warn("File list UI elements not found for rendering.");
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
                            <div>起始X: <strong>${Math.round(this.cropSelection.x / this.currentCropImage.scaleX)}</strong></div>
                            <div>起始Y: <strong>${Math.round(this.cropSelection.y / this.currentCropImage.scaleY)}</strong></div>
                            <div>宽度: <strong>${Math.round(this.cropSelection.width / this.currentCropImage.scaleX)}</strong></div>
                            <div>高度: <strong>${Math.round(this.cropSelection.height / this.currentCropImage.scaleY)}</strong></div>
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
        console.log("startProcessing called, this:", this); // Debugging: check 'this' here
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
                    processedName: `${file.name.split('.')[0]}_错误.${file.type ? file.type.split('/')[1] : 'unknown'}`,
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
        console.log("confirmBatchOperations called, this:", this); // Debugging: check 'this' here
        this.showProgress(); 
        
        const finalResults = []; 
        const totalFiles = this.files.length;
        const operations = selectedOperations; 

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
                            processedName: `${originalFileInputForResults.name.split('.')[0]}_${this.getOperationName(operation).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '')}_关键错误.${originalFileInputForResults.type ? originalFileInputForResults.type.split('/')[1] : 'unknown'}`,
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
                
                // Using an arrow function for img.onload to correctly bind 'this'
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
                            if (this.isImageTransparent(canvas)) { 
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
                            console.warn("Splice operation in per-file processFile is simplified. It processes the single input image.");
                            const singleSpliceResult = await this.createSplicedImage([img], 'vertical', 10, '#f4f1ec', img.naturalWidth + 20, true);
                            currentOutputFormat = singleSpliceResult.format;
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
                    const outputFilename = `${baseName}_${this.getOperationName(mode).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '')}.${currentOutputFormat === 'jpeg' ? 'jpg' : currentOutputFormat}`; 

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

                // This onerror is for when img.src fails to load the image data
                img.onerror = (e) => {
                    console.error(`Image loading failed within processFile for mode '${mode}':`, e, "Input file:", file);
                    const originalNameForError = file.name || (file.originalName ? file.originalName : 'error_image');
                    const originalFormatForError = file.type ? file.type.split('/')[1] : (file.format || 'unknown');
                    resolve({
                        originalName: originalNameForError,
                        processedName: `${originalNameForError.split('.')[0]}_${this.getOperationName(mode).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '')}_加载错误.${originalFormatForError}`,
                        originalUrl: (file instanceof File) ? URL.createObjectURL(file) : (file.originalUrl || file.processedUrl),
                        processedUrl: '#', 
                        type: mode,
                        size: file.size || 0,
                        format: originalFormatForError,
                        error: `图片加载失败: ${e.message || '未知错误'}`
                    });
                };

            } catch (error) {
                // This catch is for errors *before* img.onload or in loadImage itself
                console.error(`Unhandled error during processFile for mode '${mode}':`, error, "Input file:", file);
                const originalNameForError = file.name || (file.originalName ? file.originalName : 'error_image');
                const originalFormatForError = file.type ? file.type.split('/')[1] : (file.format || 'unknown');
                resolve({
                    originalName: originalNameForError,
                    processedName: `${originalNameForError.split('.')[0]}_${this.getOperationName(mode).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '')}_未捕获错误.${originalFormatForError}`,
                    originalUrl: (file instanceof File) ? URL.createObjectURL(file) : (file.originalUrl || file.processedUrl),
                    processedUrl: '#', 
                    type: mode,
                    size: file.size || 0,
                    format: originalFormatForError,
                    error: `未捕获错误: ${error.message || '未知错误'}`
                });
            }
        });
    }
}

let app; 

document.addEventListener('DOMContentLoaded', function() {
    app = new ArtisticImageProcessor();
    app.init(); 
    window.app = app;
});