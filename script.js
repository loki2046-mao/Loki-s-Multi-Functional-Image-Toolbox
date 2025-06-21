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

        // 批量操作排序相关
        this.draggedItem = null;
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupRangeInputs();
        this.setupArtisticAnimations();
        this.setupDragAndDropReorder(); // 新增：初始化批量操作排序
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
            // 修改这里，点击时弹出选择模态框
            batchAllBtn.addEventListener('click', () => this.openBatchSelectModal());
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

    setupDragAndDropReorder() {
        const list = document.getElementById('batchOperationList');
        if (!list) return;

        let draggedItem = null;

        list.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('draggable-item')) {
                draggedItem = e.target;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
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
        const hasSelection = this.cropSelection && this.currentImage;
        
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
        if (!this.cropSelection || !this.currentImage) return;
        
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

    // 新增方法：打开批量操作选择模态框
    openBatchSelectModal() {
        document.getElementById('batchSelectModal').classList.remove('hidden');
    }

    // 新增方法：关闭批量操作选择模态框
    closeBatchSelectModal() {
        document.getElementById('batchSelectModal').classList.add('hidden');
    }

    // 新增方法：确认并开始批量操作
    async confirmBatchOperations() {
        this.closeBatchSelectModal(); // 关闭模态框
        
        // 获取用户选择的并排序后的操作
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
        
        if (this.isProcessing || this.files.length === 0) return;

        this.isProcessing = true;
        this.showProgress();
        
        const finalResults = []; // Changed from 'results' to 'finalResults' to avoid confusion
        const totalFiles = this.files.length;
        const operations = selectedOperations; // 使用用户选择和排序后的操作

        for (let i = 0; i < totalFiles; i++) {
            // For batch processing, we start with the original file, or the result of the previous batch process
            // If it's a new file from this.files, the 'file' object will have 'name', 'type', etc.
            // If it's a result from a previous step, it will have 'processedUrl', 'format', etc.
            let currentFileToProcess = this.files[i]; 

            // Track the original file's metadata for naming and initial format.
            // For subsequent operations in the chain, the 'file' object passed to processFile will be the output of the prior step.
            const originalFileInput = this.files[i]; 

            for (let j = 0; j < operations.length; j++) {
                const operation = operations[j];
                const progress = ((i * operations.length + j + 1) / (totalFiles * operations.length)) * 100;
                
                this.updateProgress(
                    progress, 
                    `${originalFileInput.name} - ${this.getOperationName(operation)}`, // Use original file name for display
                    i * operations.length + j + 1,
                    0,
                    totalFiles * operations.length - (i * operations.length + j + 1)
                );
                
                await this.sleep(300);

                // For the 'splice' and 'analyze' operations, they are terminal or multi-file operations.
                // We should handle them specially if they are selected in the batch.
                if (operation === 'splice') {
                    if (operations.length > 1) {
                         console.warn("Splice operation in batch mode might not behave as expected with other chained operations.");
                         alert("图像拼接功能在批量处理中，建议单独执行，或者作为最后一个操作，因为它通常会合并所有图片。");
                    }
                    // For splice, we use the original set of files
                    currentFileToProcess = await this.processSpliceBatch(this.files, operation); // Custom handler for batch splice
                    if (currentFileToProcess.error) {
                        console.error(`Splice failed for ${originalFileInput.name}:`, currentFileToProcess.error);
                        break; // Stop further processing for this file if splice fails
                    }
                } else if (operation === 'analyze') {
                    // Analyze typically doesn't modify the image, but outputs data.
                    // It can run as part of a chain.
                    currentFileToProcess = await this.processFile(currentFileToProcess, operation);
                    if (currentFileToProcess.error) {
                        console.error(`Analyze failed for ${originalFileInput.name}:`, currentFileToProcess.error);
                        break;
                    }
                } else {
                    // For other operations, chain the output of the previous step
                    currentFileToProcess = await this.processFile(currentFileToProcess, operation);
                    if (currentFileToProcess.error) {
                        console.error(`Operation ${operation} failed for ${originalFileInput.name}:`, currentFileToProcess.error);
                        break; // Stop further processing for this file if an operation fails
                    }
                }
            }
            
            // The last processedFile after all operations is the final result for this original file
            finalResults.push(currentFileToProcess);
        }

        this.results.push(...finalResults);
        this.showResults();
        this.hideProgress();
        this.isProcessing = false;
        this.updateUI();
    }

    // New helper for batch splice to return a single result object
    async processSpliceBatch(files, mode) {
        if (files.length < 2) {
            return { error: '图像拼接需要至少2张图片' };
        }
        
        const splicingResult = await this.createSplicedImage(
            await Promise.all(files.map(f => this.loadImage(f))),
            document.getElementById('spliceMode').value,
            parseInt(document.getElementById('imageSpacing').value) || 10,
            document.getElementById('spliceBackground').value,
            parseInt(document.getElementById('spliceWidth').value) || 1200,
            document.getElementById('maintainAspect').checked
        );
        
        return {
            originalName: 'spliced_batch_images', // A generic name for the batch
            processedName: splicingResult.processedName,
            originalUrl: null, // No single original for splice
            processedUrl: splicingResult.processedUrl,
            type: mode,
            size: splicingResult.size,
            format: splicingResult.format
        };
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

                    let compressResult = null;
                    // Determine the initial output format based on the input file's type.
                    // If 'file' is a File object, use its type. If it's a processed result, use its 'format'.
                    let initialOutputFormat = 'png'; 
                    if (file instanceof File) {
                        initialOutputFormat = file.type ? file.type.split('/')[1].toLowerCase() : 'png';
                    } else if (file.format) {
                        initialOutputFormat = file.format.toLowerCase();
                    }
                    let currentOutputFormat = initialOutputFormat; // This will be the format for canvas.toDataURL at the end of this function.

                    switch(mode) {
                        case 'convert':
                            currentOutputFormat = document.getElementById('targetFormat')?.value || 'png';
                            await this.applyFormatConversion(canvas, ctx, img);
                            break;
                        case 'compress':
                            // applyCompression will return the optimal quality and suggested format based on settings
                            compressResult = await this.applyCompression(canvas, ctx, img, file);
                            
                            // User's explicit format choice for compression output takes precedence
                            const selectedCompressFormat = document.getElementById('compressOutputFormat')?.value;
                            if (selectedCompressFormat && selectedCompressFormat !== 'original') {
                                currentOutputFormat = selectedCompressFormat;
                            } else {
                                // If 'original' is selected, try to maintain the original format
                                // If the original was PNG/WebP with transparency, we prioritize preserving it.
                                // If original was PNG/WebP without transparency, or JPEG, we can use the format from compressResult.
                                currentOutputFormat = compressResult.format || initialOutputFormat;
                            }
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
                            // For 'analyze' mode, the promise should resolve immediately after analysis
                            const analysisResult = await this.analyzeImage(file, img);
                            resolve(analysisResult);
                            return; // Exit here to prevent further processing
                    }

                    // Determine the quality for output. Only applies to lossy formats (JPEG, WebP).
                    let finalQualityForOutput = parseInt(document.getElementById('jpegQuality')?.value || 85) / 100;
                    if (mode === 'compress' && compressResult && compressResult.useTargetSize) {
                        finalQualityForOutput = compressResult.quality;
                    }
                    
                    // Final decision on MIME type for toDataURL
                    const mimeTypeForOutput = `image/${currentOutputFormat}`;
                    
                    const processedUrl = canvas.toDataURL(mimeTypeForOutput, finalQualityForOutput);
                    const fileSize = this.getCanvasSizeBytes(canvas, currentOutputFormat, finalQualityForOutput);
                    
                    // Use original file name for consistency in results, append processing mode
                    const originalName = file.name || (file.originalName ? file.originalName : 'processed_image');
                    const baseName = originalName.split('.')[0];
                    
                    resolve({
                        originalName: originalName,
                        processedName: `${baseName}_${mode}.${currentOutputFormat}`,
                        // For originalUrl, if input was a File, use URL.createObjectURL. If it was a previous processed result, use its originalUrl or processedUrl.
                        originalUrl: (file instanceof File) ? URL.createObjectURL(file) : (file.originalUrl || file.processedUrl),
                        processedUrl: processedUrl,
                        type: mode,
                        size: fileSize,
                        format: currentOutputFormat
                    });
                } catch (error) {
                    console.error(`文件处理失败 (模式: ${mode}):`, error);
                    // On failure, return an error object. Pass original details for context.
                    const originalName = file.name || (file.originalName ? file.originalName : 'error_image');
                    const originalFormat = file.type ? file.type.split('/')[1] : (file.format || 'unknown');
                    resolve({
                        originalName: originalName,
                        processedName: `${originalName.split('.')[0]}_${mode}_error.${originalFormat}`,
                        originalUrl: (file instanceof File) ? URL.createObjectURL(file) : (file.originalUrl || file.processedUrl),
                        // Attempt to return the last good processed URL or original if possible, or a placeholder.
                        processedUrl: (file.processedUrl && !file.error) ? file.processedUrl : (file instanceof File ? URL.createObjectURL(file) : '#'),
                        type: mode,
                        size: file.size || 0,
                        format: originalFormat,
                        error: `处理失败: ${error.message || error}`
                    });
                }
            };
            
            img.onerror = () => {
                console.error('图片加载失败，无法进行处理:', file);
                const originalName = file.name || (file.originalName ? file.originalName : 'broken_image');
                const originalFormat = file.type ? file.type.split('/')[1] : (file.format || 'unknown');
                resolve({
                    originalName: originalName,
                    processedName: `${originalName.split('.')[0]}_error_load.${originalFormat}`,
                    originalUrl: (file instanceof File) ? URL.createObjectURL(file) : (file.originalUrl || file.processedUrl),
                    processedUrl: '#', // Indicate failure to load/process
                    type: mode,
                    size: file.size || 0,
                    format: originalFormat,
                    error: '图片加载失败'
                });
            };
            
            // Load image: if it's a File object, use URL.createObjectURL. If it's a previous processed result, use its processedUrl.
            if (file instanceof File) {
                img.src = URL.createObjectURL(file);
            } else if (file && file.processedUrl) {
                img.src = file.processedUrl;
            } else {
                console.error('Invalid input file object for image loading:', file);
                reject(new Error('Invalid input file for image processing.'));
            }
        });
    }
    
    // 新增辅助函数：检查图片是否包含透明像素
    isImageTransparent(imgElement) {
        // If it's a File object, check its mime type
        if (imgElement instanceof File) {
            return imgElement.type.includes('png') || imgElement.type.includes('webp');
        }
        // If it's an Image element (already loaded on canvas)
        if (imgElement instanceof HTMLImageElement) {
            // Check if the original image was potentially transparent
            if (imgElement.src.includes('data:image/png') || imgElement.src.includes('data:image/webp')) {
                return true;
            }
            // For cross-origin images or complex cases, direct pixel access might be blocked by CORS.
            // If so, we can't reliably check pixels, so might have to rely on mime type.
            // For now, try pixel check for same-origin images.
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = imgElement.naturalWidth || imgElement.width;
            tempCanvas.height = imgElement.naturalHeight || imgElement.height;
            
            try {
                tempCtx.drawImage(imgElement, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                for (let i = 3; i < imageData.data.length; i += 4) {
                    if (imageData.data[i] < 255) {
                        return true;
                    }
                }
            } catch (e) {
                // If CORS error, fall back to checking if the original loaded URL implies transparency
                if (imgElement.src.startsWith('blob:')) {
                    // Blob URLs generally retain original type information from the file
                    const parts = imgElement.src.split('.');
                    const ext = parts[parts.length - 1];
                    if (ext === 'png' || ext === 'webp') return true;
                }
                console.warn("Could not check for transparency via pixel data (possibly CORS issue or image not fully loaded):", e);
                return false; // Cannot definitively determine
            }
        }
        // If it's a canvas itself, directly check its pixels
        if (imgElement instanceof HTMLCanvasElement) {
             const tempCtx = imgElement.getContext('2d');
             try {
                const imageData = tempCtx.getImageData(0, 0, imgElement.width, imgElement.height);
                for (let i = 3; i < imageData.data.length; i += 4) {
                    if (imageData.data[i] < 255) {
                        return true;
                    }
                }
             } catch (e) {
                console.warn("Could not check canvas transparency via pixel data (possibly