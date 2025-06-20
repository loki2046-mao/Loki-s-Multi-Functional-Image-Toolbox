```javascript
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
        this.currentImage = null;
        
        // 裁剪相关属性
        this.cropCanvas = null;
        this.cropSelection = null;
        this.isDragging = false;
        this.dragType = null; // 'move', 'resize-tl', 'resize-tr', 'resize-bl', 'resize-br'
        this.dragStart = { x: 0, y: 0 };
        this.currentCropImage = null;
        this.manualCropParams = null; // 用于存储手动裁剪的参数
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupRangeInputs();
        this.setupArtisticAnimations();
    }

    setupArtisticAnimations() {
        // 添加一些微妙的动画效果
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        });

        // 观察所有面板
        document.querySelectorAll('.morandi-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }

    setupEventListeners() {
        // 标签切换
        ['convert', 'compress', 'resize', 'watermark', 'filter', 'background', 'splice', 'analyze'].forEach(mode => {
            const tabElement = document.getElementById(mode + 'Tab');
            if (tabElement) {
                tabElement.addEventListener('click', () => this.switchTab(mode));
            }
        });

        // 文件选择
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        const uploadButton = document.querySelector('#uploadArea button');
        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.click();
            });
        }

        // 清空文件
        const clearFilesBtn = document.getElementById('clearFiles');
        if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', () => this.clearFiles());
        }

        // 处理按钮
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
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => this.startProcessing(mode));
            }
        });

        // 批量操作
        const batchAllBtn = document.getElementById('batchAll');
        if (batchAllBtn) {
            batchAllBtn.addEventListener('click', () => this.batchProcessAll());
        }
        
        const previewBatchBtn = document.getElementById('previewBatch');
        if (previewBatchBtn) {
            previewBatchBtn.addEventListener('click', () => this.previewBatch());
        }
        
        const resetAllBtn = document.getElementById('resetAll');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => this.resetAllSettings());
        }

        // 结果操作
        const downloadAllBtn = document.getElementById('downloadAll');
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', () => this.downloadAll());
        }
        
        const clearResultsBtn = document.getElementById('clearResults');
        if (clearResultsBtn) {
            clearResultsBtn.addEventListener('click', () => this.clearResults());
        }

        // 滤镜预设
        document.querySelectorAll('.filter-preset').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyFilterPreset(e.target.dataset.filter));
        });

        // 各种模式切换
        const resizeModeSelect = document.getElementById('resizeMode');
        if (resizeModeSelect) {
            resizeModeSelect.addEventListener('change', () => this.updateResizeInputs());
        }
        
        const watermarkTypeSelect = document.getElementById('watermarkType');
        if (watermarkTypeSelect) {
            watermarkTypeSelect.addEventListener('change', () => this.updateWatermarkInputs());
        }
        
        // 新功能的事件监听
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
        const backgroundTypeSelect = document.getElementById('backgroundType');
        if (backgroundTypeSelect) {
            backgroundTypeSelect.addEventListener('change', () => this.updateBackgroundInputs());
        }
        
        const spliceModeSelect = document.getElementById('spliceMode');
        if (spliceModeSelect) {
            spliceModeSelect.addEventListener('change', () => this.updateSpliceInputs());
        }
        
        // 水印涂抹相关事件
        const clearMaskBtn = document.getElementById('clearMask');
        if (clearMaskBtn) {
            clearMaskBtn.addEventListener('click', () => this.clearWatermarkMask());
        }
        
        const previewRemovalBtn = document.getElementById('previewRemoval');
        if (previewRemovalBtn) {
            previewRemovalBtn.addEventListener('click', () => this.previewWatermarkRemoval());
        }
        
        const undoMaskBtn = document.getElementById('undoMask');
        if (undoMaskBtn) {
            undoMaskBtn.addEventListener('click', () => this.undoWatermarkMask());
        }
        
        // 颜色预设按钮
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('backgroundColor1').value = e.target.dataset.color;
            });
        });
        
        // 裁剪相关事件
        const aspectRatioSelect = document.getElementById('aspectRatioConstraint');
        if (aspectRatioSelect) {
            aspectRatioSelect.addEventListener('change', () => this.updateAspectRatioInputs());
        }
        
        const resetCropBtn = document.getElementById('resetCropSelection');
        if (resetCropBtn) {
            resetCropBtn.addEventListener('click', () => this.resetCropSelection());
        }
        
        const previewCropBtn = document.getElementById('previewCrop');
        if (previewCropBtn) {
            previewCropBtn.addEventListener('click', () => this.previewCropSelection());
        }
        
        const applyCropBtn = document.getElementById('applyCropSelection');
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

    setupRangeInputs() {
        // 设置范围输入的实时更新
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
        
        // 更新标签样式
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(mode + 'Tab').classList.add('active');

        // 更新面板显示
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
        document.getElementById(mode + 'Panel').classList.remove('hidden');
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
        const mode = document.getElementById('resizeMode').value;
        const widthInput = document.getElementById('targetWidth');
        const heightInput = document.getElementById('targetHeight');
        
        switch(mode) {
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
        const type = document.getElementById('watermarkType').value;
        const textOptions = document.getElementById('textWatermarkOptions');
        
        textOptions.style.display = type === 'text' ? 'block' : 'none';
    }

    updateResizeTypeInputs() {
        const type = document.querySelector('input[name="resizeType"]:checked').value;
        const resizeOptions = document.getElementById('resizeOptions');
        const cropOptions = document.getElementById('cropOptions');
        
        if (type === 'resize') {
            resizeOptions.style.display = 'grid';
            cropOptions.style.display = 'none';
        } else {
            resizeOptions.style.display = 'none';
            cropOptions.style.display = 'block';
            this.setupCropCanvas();
        }
    }

    updateCropModeInputs() {
        const mode = document.querySelector('input[name="cropMode"]:checked').value;
        const manualOptions = document.getElementById('manualCropOptions');
        const presetOptions = document.getElementById('presetCropOptions');
        
        if (mode === 'manual') {
            manualOptions.style.display = 'block';
            presetOptions.style.display = 'none';
            this.setupCropCanvas();
        } else {
            manualOptions.style.display = 'none';
            presetOptions.style.display = 'block';
        }
    }

    updateAspectRatioInputs() {
        const constraint = document.getElementById('aspectRatioConstraint').value;
        const customInputs = document.getElementById('customRatioInputs');
        
        if (constraint === 'custom') {
            customInputs.style.display = 'block';
        } else {
            customInputs.style.display = 'none';
        }
        
        // 如果有活动的裁剪选择，更新约束
        if (this.cropSelection) {
            this.updateCropConstraints();
        }
    }

    updateWatermarkActionInputs() {
        const action = document.querySelector('input[name="watermarkAction"]:checked').value;
        const addOptions = document.getElementById('addWatermarkOptions');
        const removeOptions = document.getElementById('removeWatermarkOptions');
        
        if (action === 'add') {
            addOptions.style.display = 'block';
            removeOptions.style.display = 'none';
        } else {
            addOptions.style.display = 'none';
            removeOptions.style.display = 'block';
            this.setupWatermarkCanvas();
        }
    }

    updateRemoveMethodInputs() {
        const method = document.querySelector('input[name="removeMethod"]:checked').value;
        const autoOptions = document.getElementById('autoRemoveOptions');
        const manualOptions = document.getElementById('manualRemoveOptions');
        
        if (method === 'auto') {
            autoOptions.style.display = 'block';
            manualOptions.style.display = 'none';
        } else {
            autoOptions.style.display = 'none';
            manualOptions.style.display = 'block';
            this.setupWatermarkCanvas();
        }
    }

    setupWatermarkCanvas() {
        // 延迟执行以确保DOM已更新
        setTimeout(() => {
            if (this.files.length > 0) {
                this.loadImageForWatermarkEditing(this.files[0]);
            }
        }, 100);
    }

    setupCropCanvas() {
        // 延迟执行以确保DOM已更新
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
            // 计算合适的显示尺寸
            const maxWidth = 600;
            const maxHeight = 400;
            let { width, height } = this.calculateDisplaySize(img.width, img.height, maxWidth, maxHeight);
            
            canvas.width = width;
            canvas.height = height;
            canvas.style.display = 'block';
            placeholder.style.display = 'none';
            
            // 绘制图像
            ctx.drawImage(img, 0, 0, width, height);
            
            // 保存裁剪图像信息
            this.currentCropImage = {
                originalImg: img,
                canvas: canvas,
                ctx: ctx,
                scaleX: width / img.width,
                scaleY: height / img.height,
                displayWidth: width,
                displayHeight: height
            };
            
            // 初始化裁剪选择区域（默认为图片中心1/2大小）
            const defaultWidth = Math.min(200, width * 0.5);
            const defaultHeight = Math.min(150, height * 0.5);
            this.cropSelection = {
                x: (width - defaultWidth) / 2,
                y: (height - defaultHeight) / 2,
                width: defaultWidth,
                height: defaultHeight
            };
            
            // 设置画布事件
            this.setupCropCanvasEvents();
            
            // 绘制裁剪选择框
            this.drawCropSelection();
            
            // 更新显示信息
            this.updateCropDisplay();
            
            // 启用按钮
            this.updateCropButtons();
        };
        
        img.src = URL.createObjectURL(file);
    }

    setupCropCanvasEvents() {
        const canvas = this.currentCropImage.canvas;
        
        // 鼠标事件
        canvas.addEventListener('mousedown', (e) => this.startCropDrag(e));
        canvas.addEventListener('mousemove', (e) => this.handleCropDrag(e));
        canvas.addEventListener('mouseup', () => this.stopCropDrag());
        canvas.addEventListener('mouseout', () => this.stopCropDrag());
        
        // 触摸事件支持
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
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
        if (!this.cropSelection) return;
        
        const rect = this.currentCropImage.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.currentCropImage.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.currentCropImage.canvas.height / rect.height);
        
        this.dragStart = { x, y };
        this.dragType = this.getCropDragType(x, y);
        this.isDragging = true;
        
        // 更新鼠标样式
        this.updateCursorStyle(this.dragType);
    }

    handleCropDrag(e) {
        if (!this.cropSelection) return;
        
        const rect = this.currentCropImage.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.currentCropImage.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.currentCropImage.canvas.height / rect.height);
        
        if (!this.isDragging) {
            // 更新鼠标样式
            const dragType = this.getCropDragType(x, y);
            this.updateCursorStyle(dragType);
            return;
        }
        
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
        }
        
        // 应用约束
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
        
        // 检查四个角的拖拽手柄
        if (this.isInHandle(x, y, sel.x, sel.y, handleSize)) return 'resize-tl';
        if (this.isInHandle(x, y, sel.x + sel.width, sel.y, handleSize)) return 'resize-tr';
        if (this.isInHandle(x, y, sel.x, sel.y + sel.height, handleSize)) return 'resize-bl';
        if (this.isInHandle(x, y, sel.x + sel.width, sel.y + sel.height, handleSize)) return 'resize-br';
        
        // 检查是否在选择区域内（移动）
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
        const canvas = this.currentCropImage.canvas;
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
        const minWidth = parseInt(document.getElementById('minCropWidth').value) || 20;
        const minHeight = parseInt(document.getElementById('minCropHeight').value) || 20;
        
        switch (corner) {
            case 'tl':
                const newX = Math.max(0, selection.x + deltaX);
                const newY = Math.max(0, selection.y + deltaY);
                const newWidth = selection.width - (newX - selection.x);
                const newHeight = selection.height - (newY - selection.y);
                
                if (newWidth >= minWidth && newHeight >= minHeight) {
                    selection.x = newX;
                    selection.y = newY;
                    selection.width = newWidth;
                    selection.height = newHeight;
                }
                break;
            case 'tr':
                const newWidthTR = Math.max(minWidth, selection.width + deltaX);
                const newYTR = Math.max(0, selection.y + deltaY);
                const newHeightTR = selection.height - (newYTR - selection.y);
                
                if (selection.x + newWidthTR <= this.currentCropImage.displayWidth && newHeightTR >= minHeight) {
                    selection.width = newWidthTR;
                    selection.y = newYTR;
                    selection.height = newHeightTR;
                }
                break;
            case 'bl':
                const newXBL = Math.max(0, selection.x + deltaX);
                const newWidthBL = selection.width - (newXBL - selection.x);
                const newHeightBL = Math.max(minHeight, selection.height + deltaY);
                
                if (newWidthBL >= minWidth && selection.y + newHeightBL <= this.currentCropImage.displayHeight) {
                    selection.x = newXBL;
                    selection.width = newWidthBL;
                    selection.height = newHeightBL;
                }
                break;
            case 'br':
                const newWidthBR = Math.max(minWidth, selection.width + deltaX);
                const newHeightBR = Math.max(minHeight, selection.height + deltaY);
                
                if (selection.x + newWidthBR <= this.currentCropImage.displayWidth && 
                    selection.y + newHeightBR <= this.currentCropImage.displayHeight) {
                    selection.width = newWidthBR;
                    selection.height = newHeightBR;
                }
                break;
        }
    }

    applyCropConstraints(selection) {
        const constraint = document.getElementById('aspectRatioConstraint').value;
        
        if (constraint === 'free') return;
        
        let ratio = 1;
        
        switch (constraint) {
            case '1:1': ratio = 1; break;
            case '4:3': ratio = 4/3; break;
            case '3:2': ratio = 3/2; break;
            case '16:9': ratio = 16/9; break;
            case '9:16': ratio = 9/16; break;
            case 'custom':
                const customW = parseFloat(document.getElementById('customRatioW').value) || 1;
                const customH = parseFloat(document.getElementById('customRatioH').value) || 1;
                ratio = customW / customH;
                break;
        }
        
        // 保持宽高比，以较小的维度为准
        if (selection.width / selection.height > ratio) {
            selection.width = selection.height * ratio;
        } else {
            selection.height = selection.width / ratio;
        }
        
        // 确保不超出边界
        if (selection.x + selection.width > this.currentCropImage.displayWidth) {
            selection.width = this.currentCropImage.displayWidth - selection.x;
            selection.height = selection.width / ratio;
        }
        if (selection.y + selection.height > this.currentCropImage.displayHeight) {
            selection.height = this.currentCropImage.displayHeight - selection.y;
            selection.width = selection.height * ratio;
        }
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
        
        // 清除并重新绘制图像
        ctx.clearRect(0, 0, this.currentCropImage.displayWidth, this.currentCropImage.displayHeight);
        ctx.drawImage(img, 0, 0, this.currentCropImage.displayWidth, this.currentCropImage.displayHeight);
        
        const sel = this.cropSelection;
        
        // 绘制遮罩（选择区域外的半透明覆盖）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.currentCropImage.displayWidth, sel.y); // 上方
        ctx.fillRect(0, sel.y, sel.x, sel.height); // 左侧
        ctx.fillRect(sel.x + sel.width, sel.y, this.currentCropImage.displayWidth - sel.x - sel.width, sel.height); // 右侧
        ctx.fillRect(0, sel.y + sel.height, this.currentCropImage.displayWidth, this.currentCropImage.displayHeight - sel.y - sel.height); // 下方
        
        // 绘制选择框边框
        ctx.strokeStyle = '#4A7C7E';
        ctx.lineWidth = 2;
        ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
        
        // 绘制拖拽手柄
        const handleSize = 8;
        ctx.fillStyle = '#4A7C7E';
        
        // 四个角的手柄
        this.drawHandle(ctx, sel.x, sel.y, handleSize);
        this.drawHandle(ctx, sel.x + sel.width, sel.y, handleSize);
        this.drawHandle(ctx, sel.x, sel.y + sel.height, handleSize);
        this.drawHandle(ctx, sel.x + sel.width, sel.y + sel.height, handleSize);
        
        // 绘制网格线（九宫格辅助线）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        
        // 垂直线
        ctx.beginPath();
        ctx.moveTo(sel.x + sel.width / 3, sel.y);
        ctx.lineTo(sel.x + sel.width / 3, sel.y + sel.height);
        ctx.moveTo(sel.x + sel.width * 2 / 3, sel.y);
        ctx.lineTo(sel.x + sel.width * 2 / 3, sel.y + sel.height);
        ctx.stroke();
        
        // 水平线
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
        if (!this.cropSelection || !this.currentCropImage) return;
        
        // 计算实际图像坐标
        const realX = Math.round(this.cropSelection.x / this.currentCropImage.scaleX);
        const realY = Math.round(this.cropSelection.y / this.currentCropImage.scaleY);
        const realWidth = Math.round(this.cropSelection.width / this.currentCropImage.scaleX);
        const realHeight = Math.round(this.cropSelection.height / this.currentCropImage.scaleY);
        
        document.getElementById('displayCropX').textContent = realX;
        document.getElementById('displayCropY').textContent = realY;
        document.getElementById('displayCropWidth').textContent = realWidth;
        document.getElementById('displayCropHeight').textContent = realHeight;
    }

    updateCropButtons() {
        const hasSelection = this.cropSelection && this.currentCropImage;
        
        document.getElementById('resetCropSelection').disabled = !hasSelection;
        document.getElementById('previewCrop').disabled = !hasSelection;
        document.getElementById('applyCropSelection').disabled = !hasSelection;
    }

    resetCropSelection() {
        if (!this.currentCropImage) return;
        
        // 重置为默认选择区域
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
        
        // 创建预览弹窗
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
        
        // 显示原始图像
        const originalCanvas = document.getElementById('cropPreviewOriginal');
        const originalCtx = originalCanvas.getContext('2d');
        originalCanvas.width = this.currentCropImage.displayWidth;
        originalCanvas.height = this.currentCropImage.displayHeight;
        originalCtx.drawImage(this.currentCropImage.canvas, 0, 0);
        
        // 生成裁剪结果
        await this.generateCropPreview();
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async generateCropPreview() {
        const resultCanvas = document.getElementById('cropPreviewResult');
        const resultCtx = resultCanvas.getContext('2d');
        
        // 计算实际裁剪区域
        const realX = this.cropSelection.x / this.currentCropImage.scaleX;
        const realY = this.cropSelection.y / this.currentCropImage.scaleY;
        const realWidth = this.cropSelection.width / this.currentCropImage.scaleX;
        const realHeight = this.cropSelection.height / this.currentCropImage.scaleY;
        
        resultCanvas.width = realWidth;
        resultCanvas.height = realHeight;
        
        // 绘制裁剪后的图像
        resultCtx.drawImage(
            this.currentCropImage.originalImg,
            realX, realY, realWidth, realHeight,
            0, 0, realWidth, realHeight
        );
    }

    applyCropSelection() {
        if (!this.cropSelection || !this.currentCropImage) return;
        
        // 将选择信息应用到裁剪参数
        const realX = Math.round(this.cropSelection.x / this.currentCropImage.scaleX);
        const realY = Math.round(this.cropSelection.y / this.currentCropImage.scaleY);
        const realWidth = Math.round(this.cropSelection.width / this.currentCropImage.scaleX);
        const realHeight = Math.round(this.cropSelection.height / this.currentCropImage.scaleY);
        
        // 更新裁剪参数（用于后续处理）
        this.manualCropParams = {
            x: realX,
            y: realY,
            width: realWidth,
            height: realHeight
        };
        
        // 显示成功提示
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
        
        // 动画显示
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动消失
        setTimeout(() => {
            toast.style.transform = 'translateX(full)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    async loadImageForWatermarkEditing(file) {
        const canvas = document.getElementById('watermarkPreview');
        const placeholder = document.getElementById('canvasPlaceholder');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
            // 计算合适的显示尺寸
            const maxWidth = 600;
            const maxHeight = 400;
            let { width, height } = this.calculateDisplaySize(img.width, img.height, maxWidth, maxHeight);
            
            canvas.width = width;
            canvas.height = height;
            canvas.style.display = 'block';
            placeholder.style.display = 'none';
            
            // 绘制图像
            ctx.drawImage(img, 0, 0, width, height);
            
            // 保存原始图像和缩放比例
            this.currentImage = {
                originalImg: img,
                canvas: canvas,
                ctx: ctx,
                scaleX: width / img.width,
                scaleY: height / img.height,
                displayWidth: width,
                displayHeight: height
            };
            
            // 初始化涂抹遮罩
            this.watermarkMask = [];
            this.watermarkMaskHistory = [];
            
            // 设置画布事件
            this.setupCanvasEvents();
            
            // 启用按钮
            document.getElementById('clearMask').disabled = false;
            document.getElementById('previewRemoval').disabled = false;
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
        const canvas = this.currentImage.canvas;
        const ctx = this.currentImage.ctx;
        
        // 鼠标事件
        canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        canvas.addEventListener('mousemove', (e) => this.draw(e));
        canvas.addEventListener('mouseup', () => this.stopDrawing());
        canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // 触摸事件（移动端支持）
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
        
        // 保存当前状态到历史记录
        this.watermarkMaskHistory.push([...this.watermarkMask]);
        document.getElementById('undoMask').disabled = false;
        
        this.draw(e);
    }

    draw(e) {
        if (!this.isDrawing || !this.currentImage) return;
        
        const canvas = this.currentImage.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const brushSize = parseInt(document.getElementById('brushSize').value);
        
        // 添加涂抹点到遮罩
        this.watermarkMask.push({
            x: x,
            y: y,
            size: brushSize
        });
        
        // 绘制涂抹效果（红色半透明覆盖）
        const ctx = this.currentImage.ctx;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // 启用预览和清除按钮
        document.getElementById('previewRemoval').disabled = this.watermarkMask.length === 0;
        document.getElementById('clearMask').disabled = this.watermarkMask.length === 0;
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    clearWatermarkMask() {
        if (!this.currentImage) return;
        
        // 清除遮罩
        this.watermarkMask = [];
        this.watermarkMaskHistory = [];
        
        // 重新绘制原始图像
        const ctx = this.currentImage.ctx;
        const img = this.currentImage.originalImg;
        ctx.clearRect(0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        ctx.drawImage(img, 0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        
        // 禁用按钮
        document.getElementById('previewRemoval').disabled = true;
        document.getElementById('clearMask').disabled = true;
        document.getElementById('undoMask').disabled = true;
    }

    undoWatermarkMask() {
        if (this.watermarkMaskHistory.length === 0) return;
        
        // 恢复上一个状态
        this.watermarkMask = this.watermarkMaskHistory.pop();
        
        // 重新绘制
        this.redrawWatermarkCanvas();
        
        // 更新按钮状态
        document.getElementById('undoMask').disabled = this.watermarkMaskHistory.length === 0;
        document.getElementById('previewRemoval').disabled = this.watermarkMask.length === 0;
        document.getElementById('clearMask').disabled = this.watermarkMask.length === 0;
    }

    redrawWatermarkCanvas() {
        if (!this.currentImage) return;
        
        const ctx = this.currentImage.ctx;
        const img = this.currentImage.originalImg;
        
        // 清除并重新绘制原始图像
        ctx.clearRect(0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        ctx.drawImage(img, 0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        
        // 重新绘制所有涂抹标记
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
        
        // 创建预览弹窗
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
        
        // 显示原始图像
        const originalCanvas = document.getElementById('previewOriginal');
        const originalCtx = originalCanvas.getContext('2d');
        originalCanvas.width = this.currentImage.displayWidth;
        originalCanvas.height = this.currentImage.displayHeight;
        originalCtx.drawImage(this.currentImage.canvas, 0, 0);
        
        // 处理去水印效果
        await this.processWatermarkRemovalPreview();
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async processWatermarkRemovalPreview() {
        const processedCanvas = document.getElementById('previewProcessed');
        const processedCtx = processedCanvas.getContext('2d');
        const processingDiv = document.getElementById('previewProcessing');
        
        processedCanvas.width = this.currentImage.displayWidth;
        processedCanvas.height = this.currentImage.displayHeight;
        
        // 复制原始图像
        processedCtx.drawImage(this.currentImage.originalImg, 0, 0, this.currentImage.displayWidth, this.currentImage.displayHeight);
        
        // 获取修复算法
        const algorithm = document.getElementById('repairAlgorithm').value;
        const strength = parseInt(document.getElementById('manualRepairStrength').value);
        
        // 应用去水印效果到标记区域
        const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
        
        processingDiv.innerHTML = '<div class="animate-pulse">🎨 正在应用修复算法...</div>';
        
        // 延迟处理以显示动画
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
        
        // 根据不同算法应用修复
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
        // 内容感知修复：分析周围像素，智能填充
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (distance > radius) continue;
                
                // 获取周围像素的加权平均
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
        // 模糊填充：使用高斯模糊效果
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
        // 周边复制：复制相邻区域的纹理
        const sourceRadius = radius * 2;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (distance > radius) continue;
                
                // 寻找最近的非标记区域像素
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
        // 智能补丁：结合多种算法的混合效果
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
                    return {
                        r: data[index],
                        g: data[index + 1],
                        b: data[index + 2]
                    };
                }
            }
        }
        return null;
    }

    updateBackgroundInputs() {
        const type = document.getElementById('backgroundType').value;
        const solidOptions = document.getElementById('solidColorOptions');
        const gradientOptions = document.getElementById('gradientOptions');
        
        if (type === 'gradient') {
            solidOptions.style.display = 'none';
            gradientOptions.style.display = 'block';
        } else {
            solidOptions.style.display = 'block';
            gradientOptions.style.display = 'none';
        }
    }

    updateSpliceInputs() {
        const mode = document.getElementById('spliceMode').value;
        const gridOptions = document.getElementById('gridOptions');
        
        gridOptions.style.display = mode === 'grid' ? 'block' : 'none';
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
        
        // 特殊处理需要多个文件的功能
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
            
            await this.sleep(500 + Math.random() * 1000);
            
            const result = await this.processFile(file, mode);
            results.push(result);
        }

        this.results.push(...results);
        this.showResults();
        this.hideProgress();
        this.isProcessing = false;
        this.updateUI();
    }

    async batchProcessAll() {
        if (this.isProcessing || this.files.length === 0) return;

        this.isProcessing = true;
        this.showProgress();
        
        const results = [];
        const totalFiles = this.files.length;
        const operations = ['convert', 'compress', 'resize', 'watermark', 'filter'];

        for (let i = 0; i < totalFiles; i++) {
            const file = this.files[i];
            let processedFile = file;
            
            for (let j = 0; j < operations.length; j++) {
                const operation = operations[j];
                const progress = ((i * operations.length + j + 1) / (totalFiles * operations.length)) * 100;
                
                this.updateProgress(
                    progress, 
                    `${file.name} - ${this.getOperationName(operation)}`,
                    i * operations.length + j + 1,
                    0,
                    totalFiles * operations.length - (i * operations.length + j + 1)
                );
                
                await this.sleep(300);
                processedFile = await this.processFile(processedFile, operation);
            }
            
            results.push(processedFile);
        }

        this.results.push(...results);
        this.showResults();
        this.hideProgress();
        this.isProcessing = false;
        this.updateUI();
    }

    getOperationName(operation) {
        const names = {
            convert: '格式转换',
            compress: '压缩优化',
            resize: '尺寸调整',
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
        
        return new Promise((resolve, reject) => {
            img.onload = async () => {
                try {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    let skipCanvas = false;
                    let useOriginal = false;
                    let compressResult = null;
                    
                    switch(mode) {
                        case 'convert':
                            await this.applyFormatConversion(canvas, ctx, img);
                            break;
                        case 'compress':
                            compressResult = await this.applyCompression(canvas, ctx, img, file);
                            break;
                        case 'resize':
                            await this.applyResize(canvas, ctx, img);
                            break;
                        case 'watermark':
                            await this.applyWatermark(canvas, ctx, img);
                            break;
                        case 'filter':
                            await this.applyFilter(canvas, ctx, img);
                            break;
                        case 'background':
                            await this.applyBackground(canvas, ctx, img);
                            break;
                        case 'analyze':
                            return this.analyzeImage(file, img);
                            break;
                    }

                    let targetFormat = document.getElementById('targetFormat')?.value || 'png';
                    const quality = parseInt(document.getElementById('jpegQuality')?.value || 85) / 100;
                    
                    // 处理输出
                    let processedUrl;
                    let actualFormat = targetFormat;
                    let fileSize = 0;
                    let finalQuality = quality;
                    
                    // 如果是压缩模式且使用了目标大小
                    if (mode === 'compress' && compressResult && compressResult.useTargetSize) {
                        actualFormat = 'jpeg'; // 压缩时使用JPEG格式
                        finalQuality = compressResult.quality;
                    }
                    
                    processedUrl = canvas.toDataURL(`image/${actualFormat}`, finalQuality);
                    fileSize = this.getCanvasSizeBytes(canvas, actualFormat, finalQuality);
                    
                    const originalName = file.name || 'processed';
                    
                    resolve({
                        originalName: originalName,
                        processedName: originalName.replace(/\.[^/.]+$/, `_${mode}.${actualFormat}`),
                        originalUrl: file instanceof File ? URL.createObjectURL(file) : file.processedUrl || file.originalUrl,
                        processedUrl: processedUrl,
                        type: mode,
                        size: fileSize || this.getCanvasSizeBytes(canvas, actualFormat, quality),
                        format: actualFormat
                    });
                } catch (error) {
                    console.error('文件处理失败:', error);
                    // 处理失败时返回原文件信息
                    const originalName = file.name || 'processed';
                    resolve({
                        originalName: originalName,
                        processedName: originalName.replace(/\.[^/.]+$/, `_${mode}_error.${file.type ? file.type.split('/')[1] : 'unknown'}`),
                        originalUrl: file instanceof File ? URL.createObjectURL(file) : file.processedUrl || file.originalUrl,
                        processedUrl: file instanceof File ? URL.createObjectURL(file) : file.processedUrl || file.originalUrl,
                        type: mode,
                        size: file.size || 0,
                        format: file.type ? file.type.split('/')[1] : 'unknown',
                        error: '处理失败，返回原文件'
                    });
                }
            };
            
            img.onerror = () => {
                console.error('图片加载失败');
                const originalName = file.name || 'processed';
                resolve({
                    originalName: originalName,
                    processedName: originalName.replace(/\.[^/.]+$/, `_${mode}_error.${file.type.split('/')[1]}`),
                    originalUrl: file instanceof File ? URL.createObjectURL(file) : file.processedUrl || file.originalUrl,
                    processedUrl: file instanceof File ? URL.createObjectURL(file) : file.processedUrl || file.originalUrl,
                    type: mode,
                    size: file.size || 0,
                    format: file.type ? file.type.split('/')[1] : 'unknown',
                    error: '图片加载失败'
                });
            };
            
            if (file instanceof File) {
                img.src = URL.createObjectURL(file);
            } else {
                img.src = file.processedUrl || file.originalUrl;
            }
        });
    }

    async applyFormatConversion(canvas, ctx, img) {
        const bgColor = document.getElementById('backgroundColor').value;
        if (bgColor !== 'transparent') {
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    async applyCompression(canvas, ctx, img, file) {
        // 获取压缩设置
        const level = document.getElementById('compressLevel').value;
        const targetSizeKB = parseInt(document.getElementById('targetSize').value) || 0;
        let quality = 0.7;
        
        switch(level) {
            case 'light': quality = 0.9; break;
            case 'medium': quality = 0.7; break;  
            case 'heavy': quality = 0.5; break;
            case 'custom': quality = parseInt(document.getElementById('customQuality').value) / 100; break;
        }

        // 如果设置了目标大小，进行智能压缩
        if (targetSizeKB > 0) {
            const targetSizeBytes = targetSizeKB * 1024;
            let finalQuality = await this.findOptimalQuality(canvas, targetSizeBytes, quality);
            return { quality: finalQuality, targetSizeKB, useTargetSize: true };
        }
        
        return { quality, targetSizeKB: 0, useTargetSize: false };
    }

    async findOptimalQuality(canvas, targetSizeBytes, initialQuality) {
        let minQuality = 0.1;
        let maxQuality = 1.0;
        let bestQuality = initialQuality;
        let iterations = 0;
        const maxIterations = 8; // 限制迭代次数避免无限循环

        // 首先测试初始质量
        let currentSize = this.getCanvasSizeBytes(canvas, 'jpeg', initialQuality);
        
        // 如果初始质量已经满足要求，直接返回
        if (currentSize <= targetSizeBytes) {
            return initialQuality;
        }

        // 二分法查找最优质量
        while (iterations < maxIterations && Math.abs(maxQuality - minQuality) > 0.05) {
            const testQuality = (minQuality + maxQuality) / 2;
            const testSize = this.getCanvasSizeBytes(canvas, 'jpeg', testQuality);
            
            if (testSize <= targetSizeBytes) {
                // 文件大小符合要求，尝试提高质量
                minQuality = testQuality;
                bestQuality = testQuality;
            } else {
                // 文件太大，降低质量
                maxQuality = testQuality;
            }
            
            iterations++;
        }

        // 确保最终质量不会产生过大的文件
        const finalSize = this.getCanvasSizeBytes(canvas, 'jpeg', bestQuality);
        if (finalSize > targetSizeBytes && bestQuality > 0.1) {
            bestQuality = Math.max(0.1, bestQuality - 0.1);
        }

        return Math.max(0.1, bestQuality); // 确保质量不低于10%
    }

    getCanvasSizeBytes(canvas, format, quality) {
        const dataURL = canvas.toDataURL(`image/${format}`, quality);
        const base64String = dataURL.split(',')[1];
        return Math.round(base64String.length * 0.75); // Base64到字节的转换
    }

    async applyResize(canvas, ctx, img) {
        const resizeType = document.querySelector('input[name="resizeType"]:checked').value;
        
        if (resizeType === 'crop') {
            await this.applyCrop(canvas, ctx, img);
        } else {
            await this.applyResizeTransform(canvas, ctx, img);
        }
    }

    async applyResizeTransform(canvas, ctx, img) {
        const mode = document.getElementById('resizeMode').value;
        const keepAspect = document.getElementById('keepAspectRatio').checked;
        const targetWidth = parseInt(document.getElementById('targetWidth').value);
        const targetHeight = parseInt(document.getElementById('targetHeight').value);
        
        let newWidth = img.width;
        let newHeight = img.height;
        
        switch(mode) {
            case 'percentage':
                if (targetWidth) {
                    const scale = targetWidth / 100;
                    newWidth = img.width * scale;
                    newHeight = img.height * scale;
                }
                break;
            case 'fixed':
                if (targetWidth) newWidth = targetWidth;
                if (targetHeight) newHeight = targetHeight;
                if (keepAspect && targetWidth && !targetHeight) {
                    newHeight = (img.height * newWidth) / img.width;
                } else if (keepAspect && targetHeight && !targetWidth) {
                    newWidth = (img.width * newHeight) / img.height;
                }
                break;
            case 'width':
                if (targetWidth) {
                    newWidth = targetWidth;
                    if (keepAspect) {
                        newHeight = (img.height * newWidth) / img.width;
                    }
                }
                break;
            case 'height':
                if (targetHeight) {
                    newHeight = targetHeight;
                    if (keepAspect) {
                        newWidth = (img.width * newHeight) / img.height;
                    }
                }
                break;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
    }

    async applyCrop(canvas, ctx, img) {
        const cropMode = document.querySelector('input[name="cropMode"]:checked').value;
        
        let cropX, cropY, cropWidth, cropHeight;
        
        if (cropMode === 'manual' && this.manualCropParams) {
            // 使用手动选择的裁剪参数
            cropX = this.manualCropParams.x;
            cropY = this.manualCropParams.y;
            cropWidth = this.manualCropParams.width;
            cropHeight = this.manualCropParams.height;
        } else {
            // 使用预设尺寸裁剪
            cropWidth = parseInt(document.getElementById('cropWidth').value) || img.width;
            cropHeight = parseInt(document.getElementById('cropHeight').value) || img.height;
            const position = document.getElementById('cropPosition').value;
            
            cropX = parseInt(document.getElementById('cropX').value) || 0;
            cropY = parseInt(document.getElementById('cropY').value) || 0;
            
            // 根据位置计算裁剪坐标
            switch(position) {
                case 'center':
                    cropX = (img.width - cropWidth) / 2;
                    cropY = (img.height - cropHeight) / 2;
                    break;
                case 'top-left':
                    cropX = 0;
                    cropY = 0;
                    break;
                case 'top-right':
                    cropX = img.width - cropWidth;
                    cropY = 0;
                    break;
                case 'bottom-left':
                    cropX = 0;
                    cropY = img.height - cropHeight;
                    break;
                case 'bottom-right':
                    cropX = img.width - cropWidth;
                    cropY = img.height - cropHeight;
                    break;
                case 'custom':
                    // 使用用户输入的坐标
                    break;
            }
        }
        
        // 确保裁剪区域在图像范围内
        cropX = Math.max(0, Math.min(cropX, img.width - cropWidth));
        cropY = Math.max(0, Math.min(cropY, img.height - cropHeight));
        const finalCropWidth = Math.min(cropWidth, img.width - cropX);
        const finalCropHeight = Math.min(cropHeight, img.height - cropY);
        
        canvas.width = finalCropWidth;
        canvas.height = finalCropHeight;
        ctx.drawImage(img, cropX, cropY, finalCropWidth, finalCropHeight, 0, 0, finalCropWidth, finalCropHeight);
    }

    async applyWatermark(canvas, ctx, img) {
        const action = document.querySelector('input[name="watermarkAction"]:checked').value;
        
        if (action === 'add') {
            await this.addWatermark(canvas, ctx, img);
        } else {
            await this.removeWatermark(canvas, ctx, img);
        }
    }

    async addWatermark(canvas, ctx, img) {
        const type = document.getElementById('watermarkType').value;
        const position = document.getElementById('watermarkPosition').value;
        const opacity = parseFloat(document.getElementById('watermarkOpacity').value);
        
        ctx.globalAlpha = opacity;
        
        if (type === 'text') {
            const text = document.getElementById('watermarkText').value || 'Watermark';
            const fontSize = parseInt(document.getElementById('fontSize').value);
            const color = document.getElementById('fontColor').value;
            
            ctx.font = `${fontSize}px 'Inter', sans-serif`;
            ctx.fillStyle = color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = fontSize;
            
            let x, y;
            const padding = 20;
            
            switch(position) {
                case 'top-left':
                    x = padding;
                    y = padding + textHeight;
                    break;
                case 'top-right':
                    x = canvas.width - textWidth - padding;
                    y = padding + textHeight;
                    break;
                case 'bottom-left':
                    x = padding;
                    y = canvas.height - padding;
                    break;
                case 'bottom-right':
                    x = canvas.width - textWidth - padding;
                    y = canvas.height - padding;
                    break;
                case 'center':
                    x = (canvas.width - textWidth) / 2;
                    y = (canvas.height + textHeight) / 2;
                    break;
            }
            
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
        }
        
        ctx.globalAlpha = 1;
    }

    async removeWatermark(canvas, ctx, img) {
        const removeMethod = document.querySelector('input[name="removeMethod"]:checked').value;
        
        if (removeMethod === 'manual') {
            await this.removeWatermarkManual(canvas, ctx, img);
        } else {
            await this.removeWatermarkAuto(canvas, ctx, img);
        }
    }

    async removeWatermarkAuto(canvas, ctx, img) {
        const sensitivity = document.getElementById('watermarkSensitivity').value;
        const repairStrength = parseInt(document.getElementById('repairStrength').value);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const threshold = sensitivity === 'high' ? 50 : sensitivity === 'medium' ? 100 : 150;
        const repairRadius = repairStrength;
        
        // 检测潜在的水印区域（通常在角落或边缘）
        const watermarkRegions = this.detectWatermarkRegions(data, canvas.width, canvas.height, threshold);
        
        // 对检测到的区域进行修复
        for (const region of watermarkRegions) {
            this.repairRegion(data, canvas.width, canvas.height, region, repairRadius);
        }
        
        // 应用修复后的数据
        ctx.putImageData(imageData, 0, 0);
    }

    async removeWatermarkManual(canvas, ctx, img) {
        if (!this.currentImage || this.watermarkMask.length === 0) {
            // 如果没有手动标记，回退到自动模式
            return this.removeWatermarkAuto(canvas, ctx, img);
        }
        
        const algorithm = document.getElementById('repairAlgorithm').value;
        const strength = parseInt(document.getElementById('manualRepairStrength').value);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 计算缩放比例（从预览画布到实际处理画布）
        const scaleX = canvas.width / this.currentImage.displayWidth;
        const scaleY = canvas.height / this.currentImage.displayHeight;
        
        // 应用手动标记的修复
        for (const maskPoint of this.watermarkMask) {
            const scaledPoint = {
                x: maskPoint.x * scaleX,
                y: maskPoint.y * scaleY,
                size: maskPoint.size * Math.min(scaleX, scaleY)
            };
            
            this.applyRepairToRegion(imageData, scaledPoint, algorithm, strength);
        }
        
        // 应用修复后的数据
        ctx.putImageData(imageData, 0, 0);
    }

    detectWatermarkRegions(data, width, height, threshold) {
        const regions = [];
        const regionSize = Math.min(width, height) * 0.2; // 检测区域大小
        
        // 检测四个角落
        const corners = [
            { x: 0, y: 0 }, // 左上
            { x: width - regionSize, y: 0 }, // 右上
            { x: 0, y: height - regionSize }, // 左下
            { x: width - regionSize, y: height - regionSize } // 右下
        ];
        
        for (const corner of corners) {
            if (this.hasWatermarkPattern(data, width, height, corner.x, corner.y, regionSize, threshold)) {
                regions.push({
                    x: corner.x,
                    y: corner.y,
                    width: regionSize,
                    height: regionSize
                });
            }
        }
        
        return regions;
    }

    hasWatermarkPattern(data, width, height, startX, startY, regionSize, threshold) {
        let suspiciousPixels = 0;
        let totalPixels = 0;
        
        for (let y = startY; y < startY + regionSize && y < height; y++) {
            for (let x = startX; x < startX + regionSize && x < width; x++) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];
                
                // 检测半透明或特殊颜色模式（可能是水印）
                if (a < 255 || (r > 200 && g > 200 && b > 200) || (r < 50 && g < 50 && b < 50)) {
                    suspiciousPixels++;
                }
                totalPixels++;
            }
        }
        
        // 如果可疑像素超过阈值比例，认为存在水印
        return (suspiciousPixels / totalPixels) > (threshold / 1000);
    }

    repairRegion(data, width, height, region, repairRadius) {
        // 使用周围像素的平均值来修复水印区域
        for (let y = region.y; y < region.y + region.height && y < height; y++) {
            for (let x = region.x; x < region.x + region.width && x < width; x++) {
                const avgColor = this.getAverageColor(data, width, height, x, y, repairRadius);
                const index = (y * width + x) * 4;
                
                data[index] = avgColor.r;
                data[index + 1] = avgColor.g;
                data[index + 2] = avgColor.b;
                data[index + 3] = 255; // 完全不透明
            }
        }
    }

    getAverageColor(data, width, height, centerX, centerY, radius) {
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const index = (y * width + x) * 4;
                    totalR += data[index];
                    totalG += data[index + 1];
                    totalB += data[index + 2];
                    count++;
                }
            }
        }
        
        return {
            r: Math.round(totalR / count),
            g: Math.round(totalG / count),
            b: Math.round(totalB / count)
        };
    }

    async applyFilter(canvas, ctx, img) {
        const brightness = parseInt(document.getElementById('brightness').value);
        const contrast = parseInt(document.getElementById('contrast').value);
        const saturation = parseInt(document.getElementById('saturation').value);
        const blur = parseInt(document.getElementById('blur').value);
        
        // 应用CSS滤镜效果
        const filterString = [
            `brightness(${brightness}%)`,
            `contrast(${contrast}%)`,
            `saturate(${saturation}%)`,
            blur > 0 ? `blur(${blur}px)` : ''
        ].filter(f => f).join(' ');
        
        if (filterString) {
            ctx.filter = filterString;
            ctx.drawImage(img, 0, 0);
            ctx.filter = 'none';
        }
    }

    async applyBackground(canvas, ctx, img) {
        const type = document.getElementById('backgroundType').value;
        const position = document.getElementById('imagePosition').value;
        
        // 保存原始图像
        const originalCanvas = document.createElement('canvas');
        const originalCtx = originalCanvas.getContext('2d');
        originalCanvas.width = canvas.width;
        originalCanvas.height = canvas.height;
        originalCtx.drawImage(canvas, 0, 0);
        
        // 创建背景
        let bgColor = '#f4f1ec';
        
        if (type === 'solid') {
            bgColor = document.getElementById('backgroundColor1').value;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (type === 'gradient') {
            const startColor = document.getElementById('gradientStart').value;
            const endColor = document.getElementById('gradientEnd').value;
            const direction = document.getElementById('gradientDirection').value;
            
            let gradient;
            switch(direction) {
                case 'horizontal':
                    gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                    break;
                case 'vertical':
                    gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    break;
                case 'diagonal':
                    gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    break;
                case 'radial':
                    gradient = ctx.createRadialGradient(
                        canvas.width/2, canvas.height/2, 0,
                        canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)/2
                    );
                    break;
            }
            
            gradient.addColorStop(0, startColor);
            gradient.addColorStop(1, endColor);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (type === 'random') {
            const colors = ['#9BB5A6', '#C4A484', '#D4CFC9', '#B8968C', '#E6D7FF', '#B8F2FF', '#FFD6CC', '#FFF4CC'];
            bgColor = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // 绘制图像到背景上
        switch(position) {
            case 'center':
                const centerX = (canvas.width - img.width) / 2;
                const centerY = (canvas.height - img.height) / 2;
                ctx.drawImage(originalCanvas, centerX, centerY);
                break;
            case 'stretch':
                ctx.drawImage(originalCanvas, 0, 0, canvas.width, canvas.height);
                break;
            case 'fit':
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const fitWidth = img.width * scale;
                const fitHeight = img.height * scale;
                const fitX = (canvas.width - fitWidth) / 2;
                const fitY = (canvas.height - fitHeight) / 2;
                ctx.drawImage(originalCanvas, fitX, fitY, fitWidth, fitHeight);
                break;
            case 'cover':
                const coverScale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const coverWidth = img.width * coverScale;
                const coverHeight = img.height * coverScale;
                const coverX = (canvas.width - coverWidth) / 2;
                const coverY = (canvas.height - coverHeight) / 2;
                ctx.drawImage(originalCanvas, coverX, coverY, coverWidth, coverHeight);
                break;
            default:
                ctx.drawImage(originalCanvas, 0, 0);
        }
    }

    async processSplice() {
        if (this.isProcessing || this.files.length < 2) return;

        this.isProcessing = true;
        this.showProgress();
        
        const mode = document.getElementById('spliceMode').value;
        const spacing = parseInt(document.getElementById('imageSpacing').value) || 10;
        const bgColor = document.getElementById('spliceBackground').value;
        const outputWidth = parseInt(document.getElementById('spliceWidth').value) || 1200;
        const maintainAspect = document.getElementById('maintainAspect').checked;
        
        this.updateProgress(20, '正在加载图片...', 0, 1, this.files.length);
        
        // 加载所有图片
        const images = await Promise.all(this.files.map(file => this.loadImage(file)));
        
        this.updateProgress(50, '正在拼接图片...', 0, 1, 0);
        
        const result = await this.createSplicedImage(images, mode, spacing, bgColor, outputWidth, maintainAspect);
        
        this.results.push(result);
        this.showResults();
        this.hideProgress();
        this.isProcessing = false;
        this.updateUI();
    }

    async createSplicedImage(images, mode, spacing, bgColor, outputWidth, maintainAspect) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let totalWidth = 0, totalHeight = 0;
        let rows = 1, cols = images.length;
        
        // 计算布局
        if (mode === 'grid') {
            cols = parseInt(document.getElementById('gridColumns').value) || 2;
            rows = Math.ceil(images.length / cols);
        } else if (mode === 'vertical') {
            cols = 1;
            rows = images.length;
        }
        
        // 计算每个图片的尺寸
        const cellWidth = mode === 'horizontal' ? 
            (outputWidth - spacing * (cols - 1)) / cols :
            outputWidth - spacing * 2;
        
        let maxHeight = 0;
        const processedImages = images.map(img => {
            let width = cellWidth;
            let height = maintainAspect ? (img.height * width) / img.width : img.height;
            
            if (mode === 'vertical' || mode === 'grid') {
                maxHeight = Math.max(maxHeight, height);
            }
            
            return { img, width, height };
        });
        
        // 计算画布尺寸
        if (mode === 'horizontal') {
            canvas.width = outputWidth;
            canvas.height = Math.max(...processedImages.map(p => p.height)) + spacing * 2;
        } else if (mode === 'vertical') {
            canvas.width = cellWidth + spacing * 2;
            canvas.height = processedImages.reduce((sum, p) => sum + p.height, 0) + spacing * (rows + 1);
        } else if (mode === 'grid') {
            canvas.width = outputWidth;
            const rowHeight = maxHeight + spacing;
            canvas.height = rowHeight * rows + spacing;
        }
        
        // 绘制背景
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制图片
        let currentX = spacing, currentY = spacing;
        
        for (let i = 0; i < processedImages.length; i++) {
            const { img, width, height } = processedImages[i];
            
            if (mode === 'grid' && i > 0 && i % cols === 0) {
                currentX = spacing;
                currentY += maxHeight + spacing;
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
        const analyzeColors = document.getElementById('analyzeColors').checked;
        const analyzeDimensions = document.getElementById('analyzeDimensions').checked;
        const analyzeFileInfo = document.getElementById('analyzeFileInfo').checked;
        const analyzeQuality = document.getElementById('analyzeQuality').checked;
        const colorCount = parseInt(document.getElementById('colorCount').value);
        
        const analysis = {
            originalName: file.name,
            processedName: `analysis_${file.name.replace(/\.[^/.]+$/, '.json')}`,
            originalUrl: URL.createObjectURL(file),
            processedUrl: null,
            type: 'analyze',
            size: 0,
            format: 'json',
            analysis: {}
        };
        
        if (analyzeDimensions) {
            analysis.analysis.dimensions = {
                width: img.width,
                height: img.height,
                aspectRatio: (img.width / img.height).toFixed(2),
                megapixels: ((img.width * img.height) / 1000000).toFixed(2)
            };
        }
        
        if (analyzeFileInfo) {
            analysis.analysis.fileInfo = {
                name: file.name,
                size: file.size,
                sizeFormatted: this.formatFileSize(file.size),
                type: file.type,
                lastModified: new Date(file.lastModified).toISOString()
            };
        }
        
        if (analyzeColors) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            analysis.analysis.colors = this.extractDominantColors(ctx, canvas.width, canvas.height, colorCount);
        }
        
        if (analyzeQuality) {
            analysis.analysis.quality = await this.assessImageQuality(img, file);
        }
        
        // 显示分析结果
        this.displayAnalysisResults(analysis.analysis);
        
        return analysis;
    }

    extractDominantColors(ctx, width, height, count) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const colorMap = new Map();
        
        // 采样像素以提高性能
        const sampleRate = Math.max(1, Math.floor(data.length / (4 * 10000)));
        
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a > 128) { // 忽略透明像素
                // 量化颜色以减少噪音
                const quantizedR = Math.floor(r / 32) * 32;
                const quantizedG = Math.floor(g / 32) * 32;
                const quantizedB = Math.floor(b / 32) * 32;
                
                const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
                colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
            }
        }
        
        // 按频率排序并获取主要颜色
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, count);
        
        return sortedColors.map(([color, frequency]) => {
            const [r, g, b] = color.split(',').map(Number);
            const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            const percentage = ((frequency / colorMap.size) * 100).toFixed(1);
            
            return {
                hex,
                rgb: `rgb(${r}, ${g}, ${b})`,
                frequency,
                percentage: percentage + '%'
            };
        });
    }

    async assessImageQuality(img, file) {
        return {
            resolution: img.width * img.height,
            density: (img.width * img.height / (file.size / 1024)).toFixed(2) + ' pixels/KB',
            compressionRatio: ((file.size / (img.width * img.height * 3)) * 100).toFixed(1) + '%',
            estimated: '基于文件大小和像素数量的估算'
        };
    }

    displayAnalysisResults(analysis) {
        const resultsDiv = document.getElementById('analyzeResults');
        const contentDiv = document.getElementById('analyzeResultsContent');
        
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
            const colorBlocks = analysis.colors.map(color => 
                `<div class="flex items-center space-x-3 p-3 bg-gradient-to-r from-white to-morandi-pearl rounded-xl">
                    <div class="w-8 h-8 rounded-full border-2 border-white shadow-sm" style="background: ${color.hex}"></div>
                    <div class="flex-1">
                        <div class="font-medium text-morandi-deep">${color.hex}</div>
                        <div class="text-xs text-morandi-shadow">${color.percentage}</div>
                    </div>
                </div>`
            ).join('');
            
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
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }



    showProgress() {
        document.getElementById('progressSection').classList.remove('hidden');
    }

    hideProgress() {
        document.getElementById('progressSection').classList.add('hidden');
    }

    updateProgress(percent, task, completed, processing, pending) {
        document.getElementById('progressBar').style.width = percent + '%';
        document.getElementById('totalProgress').textContent = Math.round(percent) + '%';
        document.getElementById('currentTask').textContent = task;
        if (completed !== undefined) document.getElementById('completed').textContent = completed;
        if (processing !== undefined) document.getElementById('processing').textContent = processing;
        if (pending !== undefined) document.getElementById('pending').textContent = pending;
    }

    showResults() {
        const section = document.getElementById('resultsSection');
        const grid = document.getElementById('resultsGrid');
        
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
                        <img src="${result.originalUrl}" alt="原图" class="w-full h-20 object-cover">
                    </div>
                </div>
                <div>
                    <p class="text-xs text-morandi-shadow mb-2 font-medium">处理后</p>
                    <div class="relative overflow-hidden rounded-xl border-2 border-morandi-sage">
                        <img src="${result.processedUrl}" alt="处理后" class="w-full h-20 object-cover">
                    </div>
                </div>
            </div>
            ${result.size ? `<p class="text-xs text-morandi-shadow mb-4 font-medium">文件大小: <span class="text-morandi-deep">${this.formatFileSize(result.size)}</span></p>` : ''}
            ${result.error ? `<p class="text-xs text-red-500 mb-4 p-2 bg-red-50 rounded-lg">⚠️ ${result.error}</p>` : ''}
            <div class="flex space-x-3">
                <button onclick="app.downloadSingle(${index})" 
                        class="flex-1 btn-primary py-3 rounded-xl text-sm font-medium transition-all shadow-sm">
                    <span class="relative z-10">下载</span>
                </button>
                <button onclick="app.previewImage('${result.processedUrl}', '${result.processedName}')" 
                        class="flex-1 btn-secondary py-3 rounded-xl text-sm font-medium transition-all shadow-sm">
                    预览
                </button>
            </div>
        `;
        
        return div;
    }

    downloadSingle(index) {
        const result = this.results[index];
        this.downloadImage(result.processedUrl, result.processedName);
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
        if (this.results.length === 0) return;

        const zip = new JSZip();
        
        for (const result of this.results) {
            const response = await fetch(result.processedUrl);
            const blob = await response.blob();
            zip.file(result.processedName, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        
        const currentTime = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        this.downloadImage(zipUrl, `loki_atelier_${currentTime}.zip`);
    }

    previewImage(url, name) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="max-w-4xl max-h-full p-6">
                <div class="morandi-card rounded-3xl overflow-hidden shadow-2xl">
                    <div class="p-6 border-b border-morandi-cloud">
                        <div class="flex justify-between items-center">
                            <h3 class="serif-font text-xl font-medium text-morandi-deep">${name}</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.parentElement.parentElement.remove()" 
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
        if (this.files.length === 0) return;
        
        // 创建艺术化的预览弹窗
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
                                </div>
                            </div>
                            <div class="p-4 bg-gradient-to-r from-macaron-peach to-macaron-rose rounded-xl">
                                <h4 class="font-medium mb-2">📊 处理信息</h4>
                                <div class="text-sm grid grid-cols-2 gap-3">
                                    <div>文件数量: <span class="font-bold">${this.files.length}</span></div>
                                    <div>预计时间: <span class="font-bold">${Math.ceil(this.files.length * 2.5)}秒</span></div>
                                    <div>处理步骤: <span class="font-bold">5个</span></div>
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
        // 重置所有表单
        document.querySelectorAll('select, input[type="range"], input[type="number"], input[type="text"], textarea').forEach(input => {
            if (input.defaultValue !== undefined) {
                input.value = input.defaultValue;
            }
        });
        
        // 触发范围输入更新
        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.dispatchEvent(new Event('input'));
        });
        
        // 显示艺术化的成功提示
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
        
        // 动画显示
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动消失
        setTimeout(() => {
            toast.style.transform = 'translateX(full)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    clearResults() {
        this.results = [];
        document.getElementById('resultsSection').classList.add('hidden');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 初始化应用
window.app = new ArtisticImageProcessor();
// 在 script.js 文件的最后添加这段代码

// 全局变量和初始化
let app;

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    app = new ArtisticImageProcessor();
    
    // 设置全局引用以便在 HTML 中调用
    window.imageProcessor = app;
    
    console.log('🎨 Loki\'s Digital Atelier 已启动！');
});

// 兼容性检查
if (typeof window !== 'undefined') {
    window.app = app;
}
```