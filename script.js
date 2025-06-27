document.addEventListener('DOMContentLoaded', () => {

    const App = {
        
        files: [],
        resultURLs: [],
        resultData: {},
        cropper: null,
        activeFilter: null,
        isProcessing: false,
        histogramChart: null,
        inpaintingState: {
            painting: false,
            brushSize: 20,
            lastX: 0,
            lastY: 0,
        },
        
        elements: {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            selectFilesBtn: document.getElementById('selectFilesBtn'),
            fileList: document.getElementById('fileList'),
            fileItems: document.getElementById('fileItems'),
            fileCount: document.getElementById('fileCount'),
            clearFiles: document.getElementById('clearFiles'),
            tabsContainer: document.getElementById('tabsContainer'),
            panelsContainer: document.getElementById('panelsContainer'),
            progressSection: document.getElementById('progressSection'),
            progressBar: document.getElementById('progressBar'),
            totalProgress: document.getElementById('totalProgress'),
            currentTask: document.getElementById('currentTask'),
            resultsSection: document.getElementById('resultsSection'),
            resultsGrid: document.getElementById('resultsGrid'),
            downloadAll: document.getElementById('downloadAll'),
            clearResults: document.getElementById('clearResults'),
            startConvert: document.getElementById('startConvert'),
            startCompress: document.getElementById('startCompress'),
            startResize: document.getElementById('startResize'),
            startWatermark: document.getElementById('startWatermark'),
            startFilter: document.getElementById('startFilter'),
            qualityValue: document.getElementById('qualityValue'),
            jpegQuality: document.getElementById('jpegQuality'),
            customQualityValue: document.getElementById('customQualityValue'),
            customQuality: document.getElementById('customQuality'),
            compressLevel: document.getElementById('compressLevel'),
            targetSize: document.getElementById('targetSize'),
            resizeTypeRadios: document.querySelectorAll('input[name="resizeType"]'),
            resizeOptions: document.getElementById('resizeOptions'),
            cropOptions: document.getElementById('cropOptions'),
            targetWidth: document.getElementById('targetWidth'),
            targetHeight: document.getElementById('targetHeight'),
            keepAspectRatio: document.getElementById('keepAspectRatio'),
            resizeMode: document.getElementById('resizeMode'),
            cropContainer: document.getElementById('cropContainer'),
            cropImage: document.getElementById('cropImage'),
            cropPlaceholder: document.getElementById('cropPlaceholder'),
            confirmCropBtn: document.getElementById('confirmCropBtn'),
            cropDimensionsDisplay: document.getElementById('cropDimensionsDisplay'),
            cropWidthInput: document.getElementById('cropWidthInput'),
            cropHeightInput: document.getElementById('cropHeightInput'),
            cropScopeRadios: document.querySelectorAll('input[name="cropScope"]'),
            watermarkActionRadios: document.querySelectorAll('input[name="watermarkAction"]'),
            addWatermarkOptions: document.getElementById('addWatermarkOptions'),
            removeWatermarkOptions: document.getElementById('removeWatermarkOptions'),
            watermarkAddScopeRadios: document.querySelectorAll('input[name="watermarkAddScope"]'),
            watermarkRemoveScopeRadios: document.querySelectorAll('input[name="watermarkRemoveScope"]'),
            watermarkTypeRadios: document.querySelectorAll('input[name="watermarkType"]'),
            textWatermarkFields: document.getElementById('textWatermarkFields'),
            imageWatermarkFields: document.getElementById('imageWatermarkFields'),
            watermarkImage: document.getElementById('watermarkImage'),
            watermarkImageScale: document.getElementById('watermarkImageScale'),
            watermarkImageScaleValue: document.getElementById('watermarkImageScaleValue'),
            watermarkOpacity: document.getElementById('watermarkOpacity'),
            opacityValue: document.getElementById('opacityValue'),
            inpaintingContainer: document.getElementById('inpaintingContainer'),
            inpaintingCanvas: document.getElementById('inpaintingCanvas'),
            maskCanvas: document.getElementById('maskCanvas'),
            inpaintingPlaceholder: document.getElementById('inpaintingPlaceholder'),
            brushSize: document.getElementById('brushSize'),
            brushSizeValue: document.getElementById('brushSizeValue'),
            clearMaskBtn: document.getElementById('clearMaskBtn'),
            applyRemovalBtn: document.getElementById('applyRemovalBtn'),
            filterPresetBtns: document.querySelectorAll('.filter-preset'),
            filterSliders: document.querySelectorAll('.filter-slider'),
            applySingleFilterBtn: document.getElementById('applySingleFilterBtn'),
            filterPreviewCanvas: document.getElementById('filterPreviewCanvas'),
            filterPreviewContainer: document.getElementById('filterPreviewContainer'),
            filterPreviewPlaceholder: document.getElementById('filterPreviewPlaceholder'),
            brightness: document.getElementById('brightness'),
            brightnessValue: document.getElementById('brightnessValue'),
            contrast: document.getElementById('contrast'),
            contrastValue: document.getElementById('contrastValue'),
            saturation: document.getElementById('saturation'),
            saturationValue: document.getElementById('saturationValue'),
            blur: document.getElementById('blur'),
            blurValue: document.getElementById('blurValue'),
            startAddBackground: document.getElementById('startAddBackground'),
            paddingWidth: document.getElementById('paddingWidth'),
            backgroundTypeRadios: document.querySelectorAll('input[name="backgroundType"]'),
            solidBgOptions: document.getElementById('solidBgOptions'),
            gradientBgOptions: document.getElementById('gradientBgOptions'),
            bgColor: document.getElementById('bgColor'),
            gradientColor1: document.getElementById('gradientColor1'),
            gradientColor2: document.getElementById('gradientColor2'),
            gradientDirection: document.getElementById('gradientDirection'),
            startSplice: document.getElementById('startSplice'),
            spliceMode: document.getElementById('spliceMode'),
            spliceSpacing: document.getElementById('spliceSpacing'),
            spliceSpacingContainer: document.getElementById('spliceSpacingContainer'),
            spliceFixedSizeContainer: document.getElementById('spliceFixedSizeContainer'),
            spliceFixedWidth: document.getElementById('spliceFixedWidth'),
            spliceFixedHeight: document.getElementById('spliceFixedHeight'),
            analyzePanel: document.getElementById('analyzePanel'),
            analysisPlaceholder: document.getElementById('analysisPlaceholder'),
            analysisInfoSection: document.getElementById('analysisInfoSection'),
            analysisFilename: document.getElementById('analysisFilename'),
            analysisDimensions: document.getElementById('analysisDimensions'),
            analysisSize: document.getElementById('analysisSize'),
            analysisType: document.getElementById('analysisType'),
            histogramCanvas: document.getElementById('histogramCanvas'),
        },

        init() {
            this.bindEvents();
            this.updateUI();
            this.updateCropButtonText();
            this.updateWatermarkButtonText();
        },

        bindEvents() {
            this.elements.selectFilesBtn.addEventListener('click', () => this.elements.fileInput.click());
            this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files));

            const uploadArea = this.elements.uploadArea;
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults, false);
            });
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
            });
            uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);

            this.elements.clearFiles.addEventListener('click', () => this.clearFiles());
            
            this.elements.tabsContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    this.switchTab(e.target.dataset.tab);
                }
            });

            this.elements.startConvert.addEventListener('click', () => this.processFiles('convert'));
            this.elements.startCompress.addEventListener('click', () => this.processFiles('compress'));
            this.elements.startResize.addEventListener('click', () => this.processFiles('resize'));
            this.elements.startWatermark.addEventListener('click', () => {
                const watermarkType = document.querySelector('input[name="watermarkType"]:checked').value;
                if (watermarkType === 'image' && this.elements.watermarkImage.files.length === 0) {
                    alert('请选择一个水印图片文件。');
                    return;
                }
                const scope = document.querySelector('input[name="watermarkAddScope"]:checked').value;
                const filesToProcess = (scope === 'single' && this.files.length > 0) ? [this.files[0]] : this.files;
                this.processFiles('watermark', filesToProcess);
            });
            this.elements.startFilter.addEventListener('click', () => this.processFiles('filter'));
            this.elements.applySingleFilterBtn.addEventListener('click', () => this.applySingleFilter());
            this.elements.startAddBackground.addEventListener('click', () => this.processFiles('background'));
            this.elements.startSplice.addEventListener('click', () => this.processSplice());

            this.elements.confirmCropBtn.addEventListener('click', () => this.applyCrop());
            this.elements.applyRemovalBtn.addEventListener('click', () => this.applyWatermarkRemoval());
            
            this.elements.downloadAll.addEventListener('click', () => this.downloadAllResults());
            this.elements.clearResults.addEventListener('click', () => this.clearResults());
            this.elements.resultsGrid.addEventListener('click', (e) => this.handleResultAction(e));
            
            this.bindOptionEvents();
            this.bindInpaintingEvents();
            this.bindDragAndDropEvents();
            window.addEventListener('beforeunload', () => this.revokeResultURLs());
        },
        
        bindDragAndDropEvents() {
            const fileItems = this.elements.fileItems;
            let draggedItem = null;

            fileItems.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('draggable-item')) {
                    draggedItem = e.target;
                    setTimeout(() => {
                        if (draggedItem) draggedItem.classList.add('dragging');
                    }, 0);
                }
            });

            fileItems.addEventListener('dragend', () => {
                if (draggedItem) {
                    draggedItem.classList.remove('dragging');
                    
                    const newFileOrder = [];
                    const children = [...this.elements.fileItems.children];
                    children.forEach(child => {
                        const fileId = child.dataset.fileId;
                        const file = this.files.find(f => f.id === fileId);
                        if (file) newFileOrder.push(file);
                    });
                    this.files = newFileOrder;
                    
                    draggedItem = null;
                }
            });

            fileItems.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(fileItems, e.clientY);
                if (draggedItem) {
                    if (afterElement == null) {
                        fileItems.appendChild(draggedItem);
                    } else {
                        fileItems.insertBefore(draggedItem, afterElement);
                    }
                }
            });

            function getDragAfterElement(container, y) {
                const draggableElements = [...container.querySelectorAll('.draggable-item:not(.dragging)')];
                return draggableElements.reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                }, { offset: Number.NEGATIVE_INFINITY }).element;
            }
        },

        bindOptionEvents() {
            this.elements.jpegQuality.addEventListener('input', (e) => this.elements.qualityValue.textContent = e.target.value);
            
            this.elements.customQuality.addEventListener('input', (e) => {
                this.elements.customQualityValue.textContent = e.target.value;
                this.elements.compressLevel.value = 'custom';
            });
            this.elements.compressLevel.addEventListener('change', (e) => {
                if (e.target.value !== 'custom') {
                    const quality = Math.round(parseFloat(e.target.value) * 100);
                    this.elements.customQuality.value = quality;
                    this.elements.customQualityValue.textContent = quality;
                }
            });

            this.elements.resizeTypeRadios.forEach(radio => radio.addEventListener('change', (e) => {
                const isResize = e.target.value === 'resize';
                this.elements.resizeOptions.style.display = isResize ? 'block' : 'none';
                this.elements.cropOptions.style.display = isResize ? 'none' : 'block';
                this.elements.startResize.style.display = isResize ? 'block' : 'none';
                if (e.target.value === 'crop') {
                    this.initCropper();
                } else {
                    this.destroyCropper();
                }
            }));
            
            this.elements.cropWidthInput.addEventListener('change', () => this.setCropperDataFromInput());
            this.elements.cropHeightInput.addEventListener('change', () => this.setCropperDataFromInput());
            this.elements.cropScopeRadios.forEach(radio => radio.addEventListener('change', () => this.updateCropButtonText()));

            this.elements.keepAspectRatio.addEventListener('change', () => {
                 this.elements.targetHeight.disabled = this.elements.keepAspectRatio.checked;
            });
            
            this.elements.resizeMode.addEventListener('change', (e) => {
                const disableW = e.target.value === 'height';
                const disableH = e.target.value === 'width' || e.target.value === 'percentage';
                this.elements.targetWidth.disabled = disableW;
                this.elements.targetHeight.disabled = disableH || this.elements.keepAspectRatio.checked;                    });
            
            this.elements.watermarkActionRadios.forEach(radio => radio.addEventListener('change', e => {
                const isAdd = e.target.value === 'add';
                this.elements.addWatermarkOptions.style.display = isAdd ? 'block' : 'none';
                this.elements.removeWatermarkOptions.style.display = isAdd ? 'none' : 'block';
                this.elements.startWatermark.style.display = isAdd ? 'block' : 'none';
                this.elements.removeWatermarkOptions.querySelector('#applyRemovalBtn').style.display = isAdd ? 'none' : 'block';

                if (isAdd) {
                    this.destroyInpainting();
                } else {
                    this.initInpainting();
                }
                this.updateButtonStates();
                this.updateWatermarkButtonText();
            }));
            
            this.elements.watermarkAddScopeRadios.forEach(radio => radio.addEventListener('change', () => this.updateWatermarkButtonText()));
            this.elements.watermarkRemoveScopeRadios.forEach(radio => radio.addEventListener('change', () => this.updateWatermarkButtonText()));

            this.elements.watermarkTypeRadios.forEach(radio => radio.addEventListener('change', e => {
                const isText = e.target.value === 'text';
                this.elements.textWatermarkFields.style.display = isText ? 'block' : 'none';
                this.elements.imageWatermarkFields.style.display = isText ? 'none' : 'block';
            }));

            this.elements.watermarkImageScale.addEventListener('input', e => this.elements.watermarkImageScaleValue.textContent = Math.round(e.target.value * 100));
            this.elements.watermarkOpacity.addEventListener('input', e => this.elements.opacityValue.textContent = Math.round(e.target.value * 100));
            this.elements.brushSize.addEventListener('input', e => {
                this.inpaintingState.brushSize = e.target.value;
                this.elements.brushSizeValue.textContent = e.target.value;
            });
            this.elements.clearMaskBtn.addEventListener('click', () => this.clearMask());

            this.elements.filterPresetBtns.forEach(btn => btn.addEventListener('click', () => this.setActiveFilter(btn.dataset.filter)));
            
            ['brightness', 'contrast', 'saturation', 'blur'].forEach(type => {
                const el = this.elements[type];
                const valEl = this.elements[`${type}Value`];
                const suffix = type === 'blur' ? 'px' : '%';
                el.addEventListener('input', e => {
                    valEl.textContent = e.target.value + suffix;
                    this.clearActiveFilter();
                    this.updateFilterPreview();
                });
            });

            this.elements.backgroundTypeRadios.forEach(radio => radio.addEventListener('change', e => {
                const selectedType = e.target.value;
                this.elements.solidBgOptions.style.display = selectedType === 'solid' ? 'block' : 'none';
                this.elements.gradientBgOptions.style.display = selectedType === 'gradient' ? 'block' : 'none';
            }));

            this.elements.spliceMode.addEventListener('change', (e) => {
                const mode = e.target.value;
                const isScatter = mode === 'random-scatter';
                const isFixedCollage = mode === 'fixed-collage';
                
                this.elements.spliceSpacingContainer.style.display = isScatter || isFixedCollage ? 'none' : 'block';
                this.elements.spliceFixedSizeContainer.style.display = isFixedCollage ? 'grid' : 'none';
            });
        },

        preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        },

        handleDrop(e) {
            this.handleFileSelection(e.dataTransfer.files);
        },

        handleFileSelection(selectedFiles) {
            const newFiles = [...selectedFiles]
                .filter(file => new RegExp('^image/(jpeg|png|webp)$').test(file.type))
                .map(file => {
                    file.id = `file-${Date.now()}-${Math.random()}`;
                    return file;
                });
            this.files.push(...newFiles);
            this.updateUI();
        },

        clearFiles() {
            this.files = [];
            this.elements.fileInput.value = '';
            this.updateUI();
            this.resetAnalysisView();
        },

        removeFile(fileId) {
            this.files = this.files.filter(f => f.id !== fileId);
            this.updateUI();
            this.resetAnalysisView();
        },
        
        updateCropButtonText() {
            const scope = document.querySelector('input[name="cropScope"]:checked').value;
            this.elements.confirmCropBtn.textContent = scope === 'single' ? '应用裁剪到当前图' : '应用裁剪到全部图';
        },

        updateWatermarkButtonText() {
            const action = document.querySelector('input[name="watermarkAction"]:checked').value;
            if (action === 'add') {
                const scope = document.querySelector('input[name="watermarkAddScope"]:checked').value;
                this.elements.startWatermark.querySelector('span').textContent = scope === 'single' ? '开始添加水印' : '开始批量添加水印';
            } else {
                const scope = document.querySelector('input[name="watermarkRemoveScope"]:checked').value;
                this.elements.applyRemovalBtn.textContent = scope === 'single' ? '应用消除（当前图）' : '应用消除（全部图）';
            }
        },

        updateUI() {
            this.updateFileList();
            this.updateButtonStates();
            this.initCropper();
            this.updateFilterPreview();
            this.initInpainting();
        },

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        
        async analyzeImage(file) {
            if (!file) {
                this.resetAnalysisView();
                return;
            }
            
            const analyzeTabActive = document.querySelector('[data-tab="analyze"]').classList.contains('active');
            if (!analyzeTabActive) return;

            this.elements.analysisPlaceholder.classList.add('hidden');
            this.elements.analysisInfoSection.classList.remove('hidden');

            this.elements.analysisFilename.textContent = file.name;
            this.elements.analysisSize.textContent = this.formatFileSize(file.size);
            this.elements.analysisType.textContent = file.type;

            const img = new Image();
            const objectURL = URL.createObjectURL(file);
            img.onload = () => {
                this.elements.analysisDimensions.textContent = `${img.naturalWidth} x ${img.naturalHeight}`;
                URL.revokeObjectURL(objectURL);
            };
            img.src = objectURL;

            try {
                const histogramData = await this.imageOps.getHistogramData(file);
                this.renderHistogram(histogramData);
            } catch (error) {
                console.error("Error generating histogram:", error);
            }
        },

        resetAnalysisView() {
            this.elements.analysisInfoSection.classList.add('hidden');
            this.elements.analysisPlaceholder.classList.remove('hidden');
            if (this.histogramChart) {
                this.histogramChart.destroy();
                this.histogramChart = null;
            }
            this.elements.fileItems.querySelectorAll('.file-item.analyzing').forEach(el => {
                el.classList.remove('analyzing');
            });
        },

        renderHistogram(data) {
            if (this.histogramChart) {
                this.histogramChart.destroy();
            }

            const labels = Array.from({ length: 256 }, (_, i) => i);

            this.histogramChart = new Chart(this.elements.histogramCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Red',
                            data: data.r,
                            borderColor: 'rgba(255, 99, 132, 0.8)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: 'start',
                        },
                        {
                            label: 'Green',
                            data: data.g,
                            borderColor: 'rgba(75, 192, 192, 0.8)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: 'start',
                        },
                        {
                            label: 'Blue',
                            data: data.b,
                            borderColor: 'rgba(54, 162, 235, 0.8)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: 'start',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Pixel Intensity', color: 'var(--morandi-shadow)' },
                            ticks: { maxTicksLimit: 10, color: 'var(--morandi-stone)' }
                        },
                        y: {
                            title: { display: true, text: 'Pixel Count', color: 'var(--morandi-shadow)' },
                            beginAtZero: true,
                            ticks: {
                               color: 'var(--morandi-stone)',
                               callback: function(value) {
                                    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                                    return value;
                               }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: 'var(--morandi-deep)'
                            }
                        },
                        tooltip: {
                            enabled: true,
                        }
                    }
                }
            });
        },
        
        updateFileList() {
            this.elements.fileItems.innerHTML = '';
            if (this.files.length === 0) {
                this.elements.fileList.classList.add('hidden');
                return;
            }
            this.elements.fileList.classList.remove('hidden');
            this.elements.fileCount.textContent = this.files.length;
            
            const fragment = document.createDocumentFragment();
            this.files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item draggable-item flex items-center p-3 rounded-lg transition-colors duration-200 cursor-pointer';
                item.draggable = true;
                item.dataset.fileId = file.id;
                const objectURL = URL.createObjectURL(file);
                item.innerHTML = `
                    <div class="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-md overflow-hidden mr-4">
                        <img src="${objectURL}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-grow">
                        <p class="text-sm font-medium text-gray-800 truncate">${file.name}</p>
                        <p class="text-xs text-gray-500">${this.formatFileSize(file.size)}</p>
                    </div>
                    <button data-id="${file.id}" type="button" class="remove-file-btn flex-shrink-0 ml-4 text-gray-400 hover:text-red-500 transition-colors">&times;</button>
                `;
                item.querySelector('img').onload = () => URL.revokeObjectURL(objectURL);
                item.querySelector('.remove-file-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFile(file.id);
                });
                
                item.addEventListener('click', async () => {
                    const analyzeTabActive = document.querySelector('[data-tab="analyze"]').classList.contains('active');
                    if (analyzeTabActive) {
                        if (this.isProcessing) {
                            return;
                        }
                
                        try {
                            this.isProcessing = true;
                            this.updateButtonStates();
                
                            this.elements.fileItems.querySelectorAll('.file-item.analyzing').forEach(el => el.classList.remove('analyzing'));
                            item.classList.add('analyzing');
                
                            await this.analyzeImage(file);
                
                        } catch (error) {
                            console.error(`图像分析失败: ${file.name}`, error);
                        } finally {
                            this.isProcessing = false;
                            this.updateButtonStates();
                        }
                    }
                });

                fragment.appendChild(item);
            });
            this.elements.fileItems.appendChild(fragment);
        },
        
        updateButtonStates() {
            const hasFiles = this.files.length > 0;
            const canProcess = hasFiles && !this.isProcessing;

            [ 'startConvert', 'startCompress', 'startResize', 'startWatermark', 'startFilter', 'startAddBackground' ].forEach(id => {
                if(this.elements[id]) this.elements[id].disabled = !canProcess;
            });
            if (this.elements.startSplice) {
                this.elements.startSplice.disabled = this.files.length < 2 || this.isProcessing;
            }
            if (this.elements.confirmCropBtn) {
                this.elements.confirmCropBtn.disabled = !this.cropper || this.isProcessing;
            }
            if (this.elements.applySingleFilterBtn) {
                this.elements.applySingleFilterBtn.disabled = !canProcess;
            }
            if (this.elements.applyRemovalBtn) {
                this.elements.applyRemovalBtn.disabled = (!hasFiles || !this.isInpaintingActive()) || this.isProcessing;
            }
        },
        
        switchTab(tabId) {
            this.elements.tabsContainer.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });
            this.elements.panelsContainer.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.toggle('hidden', panel.id !== `${tabId}Panel`);
            });

            if (tabId !== 'analyze') {
                this.resetAnalysisView();
            }

            const isAddWatermark = document.querySelector('input[name="watermarkAction"]:checked').value === 'add';
            this.elements.startWatermark.style.display = (tabId === 'watermark' && isAddWatermark) ? 'block' : 'none';
            this.elements.applyRemovalBtn.style.display = (tabId === 'watermark' && !isAddWatermark) ? 'block' : 'none';

            this.updateUI();
        },

        async processFiles(operation, filesToProcess) {
            const files = filesToProcess || this.files;
            if (files.length === 0) {
                alert('请先选择文件');
                return;
            }
            if (this.isProcessing) {
                alert('正在处理中，请稍候...');
                return;
            }

            this.isProcessing = true;
            this.updateButtonStates();

            this.elements.progressSection.classList.remove('hidden');
            this.elements.resultsSection.classList.remove('hidden');
            this.elements.currentTask.textContent = `准备处理 ${files.length} 个文件...`;
            this.updateProgress(0);
            
            try {
                const options = this.getOptionsFor(operation);
                let processedCount = 0;
                const totalFiles = files.length;

                const processingPromises = files.map((file) =>
                    this.processSingleFile(file, operation, options)
                        .then(result => {
                            this.addResultItem(result);
                            return result;
                        })
                        .catch(error => {
                            console.error(`处理文件 ${file.name} 失败:`, error);
                            this.addResultItem({ originalName: file.name, error: error.message, operation: operation });
                            return { error: true };
                        })
                        .finally(() => {
                            processedCount++;
                            const progress = (processedCount / totalFiles) * 100;
                            this.updateProgress(progress);
                            this.elements.currentTask.textContent = `已处理 ${processedCount} / ${totalFiles} 个文件...`;
                        })
                );
                
                await Promise.all(processingPromises);

                this.elements.currentTask.textContent = '所有任务处理完成！';
                this.updateProgress(100);
            } catch (error) {
                alert(error.message);
                this.elements.currentTask.textContent = `处理失败: ${error.message}`;
            } finally {
                this.isProcessing = false;
                this.updateButtonStates();
                setTimeout(() => {
                    this.elements.progressSection.classList.add('hidden');
                    this.updateProgress(0);
                }, 2000);
            }
        },

        async processSplice() {
            if (this.files.length < 2) {
                alert('请至少选择两个文件进行拼接。');
                return;
            }

            this.isProcessing = true;
            this.updateButtonStates();

            this.elements.progressSection.classList.remove('hidden');
            this.elements.resultsSection.classList.remove('hidden');
            this.elements.currentTask.textContent = `开始拼接 ${this.files.length} 个文件...`;
            this.updateProgress(0);

            try {
                const mode = this.elements.spliceMode.value;
                const options = {
                    mode: mode,
                    spacing: parseInt(this.elements.spliceSpacing.value, 10) || 0,
                };

                if (mode === 'fixed-collage') {
                    options.width = parseInt(this.elements.spliceFixedWidth.value, 10);
                    options.height = parseInt(this.elements.spliceFixedHeight.value, 10);
                    if (!options.width || !options.height || options.width <= 0 || options.height <= 0) {
                        throw new Error('固定尺寸拼贴需要提供有效的宽度和高度。');
                    }
                }

                this.elements.currentTask.textContent = '正在加载所有图片...';
                const bitmaps = await Promise.all(this.files.map(file => createImageBitmap(file)));
                this.updateProgress(30);

                this.elements.currentTask.textContent = '正在拼接图片...';
                const resultBlob = await this.imageOps.splice(bitmaps, options);
                this.updateProgress(80);

                const newName = `spliced_image_${options.mode}.${resultBlob.type.split('/')[1]}`;
                this.addResultItem({
                    newName: newName,
                    blob: resultBlob,
                    url: URL.createObjectURL(resultBlob),
                    operation: 'splice'
                });
                this.updateProgress(100);
                this.elements.currentTask.textContent = '拼接完成！';
            } catch (error) {
                console.error('拼接失败:', error);
                this.elements.currentTask.textContent = `拼接失败: ${error.message}`;
                this.addResultItem({ originalName: '拼接任务', error: error.message, operation: 'splice' });
            } finally {
                this.isProcessing = false;
                this.updateButtonStates();
                setTimeout(() => {
                    this.elements.progressSection.classList.add('hidden');
                    this.updateProgress(0);
                }, 2000);
            }
        },
        
        async processSingleFile(file, operation, options) {
            this.elements.currentTask.textContent = `正在处理: ${file.name}`;
            let resultBlob;

            if (operation === 'compress') {
                resultBlob = await this.imageOps.compress(file, options);
            } else {
                let imageBitmap = null;
                try {
                    imageBitmap = await createImageBitmap(file);
                    switch (operation) {
                        case 'convert': resultBlob = await this.imageOps.convert(imageBitmap, options); break;
                        case 'resize': resultBlob = await this.imageOps.resize(imageBitmap, options); break;
                        case 'watermark': resultBlob = await this.imageOps.watermark(imageBitmap, options); break;
                        case 'watermark_remove': resultBlob = await this.imageOps.removeWatermark(imageBitmap, options); break;
                        case 'filter': resultBlob = await this.imageOps.filter(imageBitmap, options); break;
                        case 'background': resultBlob = await this.imageOps.addBackground(imageBitmap, options); break;
                        default: throw new Error('未知的操作');
                    }
                } finally {
                    if (imageBitmap) {
                        imageBitmap.close();
                    }
                }
            }
            
            let newName;
            if (operation === 'convert') {
                 newName = `${file.name.split('.').slice(0, -1).join('.')}.${options.format}`;
            } else {
                 const extension = resultBlob.type.split('/')[1];
                 newName = `${file.name.split('.').slice(0, -1).join('.')}_${operation}.${extension}`;
            }

            return {
                originalName: file.name,
                newName: newName,
                blob: resultBlob,
                url: URL.createObjectURL(resultBlob),
                operation: operation
            };
        },
        
        getOptionsFor(operation) {
            switch (operation) {
                case 'convert':
                    return {
                        format: document.getElementById('targetFormat').value,
                        quality: parseInt(this.elements.jpegQuality.value, 10) / 100,
                        backgroundColor: document.getElementById('backgroundColor').value
                    };
                case 'compress':
                    const targetSizeKB = parseFloat(this.elements.targetSize.value);
                    const opts = {
                        maxIteration: 10,
                        useWebWorker: true,
                    };
                    if (!isNaN(targetSizeKB) && targetSizeKB > 0) {
                        opts.maxSizeMB = targetSizeKB / 1024;
                    } else {
                        opts.initialQuality = parseInt(this.elements.customQuality.value, 10) / 100;
                    }
                    return opts;
                case 'resize':
                    return {
                        type: 'resize',
                        mode: this.elements.resizeMode.value,
                        width: parseInt(this.elements.targetWidth.value, 10) || 0,
                        height: parseInt(this.elements.targetHeight.value, 10) || 0,
                        keepAspectRatio: this.elements.keepAspectRatio.checked,
                    };
                case 'watermark':
                case 'watermark_remove':
                    const action = document.querySelector('input[name="watermarkAction"]:checked').value;
                    if (action === 'add') {
                        const watermarkType = document.querySelector('input[name="watermarkType"]:checked').value;
                        const baseOptions = {
                            action: 'add',
                            type: watermarkType,
                            opacity: parseFloat(this.elements.watermarkOpacity.value),
                            position: document.getElementById('watermarkPosition').value
                        };

                        if (watermarkType === 'text') {
                            return {
                                ...baseOptions,
                                text: document.getElementById('watermarkText').value || ' ',
                                font: `${parseInt(document.getElementById('fontSize').value, 10) || 24}px Inter`,
                                color: document.getElementById('fontColor').value,
                            };
                        } else {
                            const imageFile = this.elements.watermarkImage.files[0];
                            if (!imageFile) throw new Error("请选择一个水印图片文件。");
                            return {
                                ...baseOptions,
                                imageFile: imageFile,
                                scale: parseFloat(this.elements.watermarkImageScale.value)
                            };
                        }
                    } else {
                        const maskCanvas = this.elements.maskCanvas;
                        const maskCtx = maskCanvas.getContext('2d');
                        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                        return {
                            action: 'remove',
                            maskData: maskData,
                            previewWidth: maskCanvas.width,
                            previewHeight: maskCanvas.height,
                        }
                    }
                case 'filter':
                     return {
                        preset: this.activeFilter,
                        brightness: this.elements.brightness.value,
                        contrast: this.elements.contrast.value,
                        saturation: this.elements.saturation.value,
                        blur: this.elements.blur.value,
                    };
                case 'background':
                    const backgroundType = document.querySelector('input[name="backgroundType"]:checked').value;
                    const padding = parseInt(this.elements.paddingWidth.value, 10) || 0;
                    
                    if (backgroundType === 'gradient') {
                        return {
                            type: 'gradient',
                            padding: padding,
                            color1: this.elements.gradientColor1.value,
                            color2: this.elements.gradientColor2.value,
                            direction: this.elements.gradientDirection.value
                        };
                    } else if (backgroundType === 'solid') {
                        return {
                            type: 'solid',
                            padding: padding,
                            color: this.elements.bgColor.value,
                        };
                    } else { // random
                        return {
                            type: 'solid',
                            padding: padding,
                            color: 'random',
                        };
                    }
                default: return {};
            }
        },
        
        updateProgress(percentage) {
            const p = Math.round(percentage);
            this.elements.totalProgress.textContent = `${p}%`;
            this.elements.progressBar.style.transform = `scaleX(${p / 100})`;
        },
        
        addResultItem(result) {
            const resultCard = document.createElement('div');
            resultCard.className = 'bg-white/80 p-4 rounded-xl shadow-md flex flex-col result-card';
            
            const operationMap = {
                convert: '格式转换',
                compress: '压缩优化',
                resize: '尺寸调整',
                crop: '图像裁剪',
                watermark: '添加水印',
                watermark_remove: '消除水印',
                filter: '艺术滤镜',
                background: '一键加底',
                splice: '图像拼接'
            };
            const operationLabel = operationMap[result.operation] || '处理结果';
            
            if (result.error) {
                resultCard.innerHTML = `
                    <p class="font-bold text-red-600 truncate">${result.originalName}</p>
                    <p class="text-xs text-morandi-shadow">来自: ${operationLabel}</p>
                    <p class="text-sm text-red-500 mt-2">处理失败: ${result.error}</p>
                `;
            } else {
                if (result.url) {
                    this.resultData[result.url] = result;
                    this.resultURLs.push(result.url);
                }
                resultCard.dataset.id = result.url;
                const displayName = result.newName || result.originalName;
                resultCard.innerHTML = `
                    <div class="w-full h-40 bg-gray-200 rounded-lg mb-3 overflow-hidden">
                        <img src="${result.url}" class="w-full h-full object-contain" alt="Processed image preview">
                    </div>
                    <p class="text-xs text-morandi-deep font-semibold mb-1">${operationLabel}</p>
                    <p class="text-sm font-medium text-gray-800 truncate" title="${displayName}">${displayName}</p>
                    <p class="text-xs text-gray-500 mb-3">${this.formatFileSize(result.blob.size)}</p>
                    <div class="mt-auto text-center card-actions">
                        <button type="button" data-action="preview">预览</button>
                        <button type="button" data-action="download">下载</button>
                        <button type="button" data-action="re-edit">再次编辑</button>
                    </div>
                `;
            }
            this.elements.resultsGrid.appendChild(resultCard);
            this.elements.resultsSection.classList.remove('hidden');
        },

        handleResultAction(e) {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const resultCard = button.closest('.result-card[data-id]');
            if (!resultCard) return;

            const action = button.dataset.action;
            const id = resultCard.dataset.id;

            switch (action) {
                case 'preview':
                    this.previewImage(id);
                    break;
                case 'download':
                    this.downloadResult(id);
                    break;
                case 're-edit':
                    this.reEditImage(id);
                    break;
            }
        },

        previewImage(id) {
            window.open(id, '_blank');
        },

        downloadResult(id) {
            const result = this.resultData[id];
            if (!result) return;

            const link = document.createElement('a');
            link.href = result.url;
            link.download = result.newName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        revokeResultURLs() {
            this.resultURLs.forEach(url => URL.revokeObjectURL(url));
            this.resultURLs = [];
        },

        clearResults() {
            this.revokeResultURLs();
            this.resultData = {};
            this.elements.resultsGrid.innerHTML = '';
            this.elements.resultsSection.classList.add('hidden');
            this.updateProgress(0);
            this.elements.progressSection.classList.add('hidden');
        },

        async reEditImage(id) {
            const result = this.resultData[id];
            if (!result) return;
        
            try {
                const { blob, newName } = result;
                const file = new File([blob], `edited_${newName}`, { type: blob.type });
                file.id = `file-${Date.now()}-${Math.random()}`;
        
                this.files = [file];
                this.elements.fileInput.value = '';
        
                this.updateUI();
        
                this.elements.uploadArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
            } catch (err) {
                console.error('Error re-editing image:', err);
                alert('无法重新编辑图片，请重试。');
            }
        },

        async downloadAllResults() {
            const zip = new JSZip();
            const resultsToDownload = Object.values(this.resultData).filter(r => !r.error);

            if (resultsToDownload.length === 0) {
                alert('没有可下载的结果。');
                return;
            }

            for (const result of resultsToDownload) {
                 zip.file(result.newName, result.blob);
            }
            
            zip.generateAsync({ type: 'blob' }).then(content => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'loki_processed_images.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            });
        },

        destroyCropper() {
            if (this.cropper) {
                this.cropper.destroy();
                this.cropper = null;
            }
            this.elements.cropImage.classList.add('hidden');
            this.elements.cropImage.src = '';
            this.elements.cropPlaceholder.style.display = 'flex';
            if (this.elements.confirmCropBtn) this.elements.confirmCropBtn.disabled = true;
            if (this.elements.cropDimensionsDisplay) this.elements.cropDimensionsDisplay.textContent = '0 x 0';
            if (this.elements.cropWidthInput) this.elements.cropWidthInput.value = '';
            if (this.elements.cropHeightInput) this.elements.cropHeightInput.value = '';
        },

        initCropper() {
            if (document.querySelector('input[name="resizeType"]:checked').value !== 'crop') {
                this.destroyCropper();
                return;
            }
            
            this.destroyCropper();
            
            const file = this.files[0];
            if (file) {
                this.elements.cropPlaceholder.style.display = 'none';
                this.elements.cropImage.classList.remove('hidden');
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.elements.cropImage.src = e.target.result;
                    this.cropper = new Cropper(this.elements.cropImage, {
                        viewMode: 1,
                        autoCropArea: 0.8,
                        background: false,
                        ready: () => {
                            this.elements.confirmCropBtn.disabled = false;
                            const cropData = this.cropper.getData(true);
                            this.elements.cropDimensionsDisplay.textContent = `${cropData.width} x ${cropData.height}`;
                            this.elements.cropWidthInput.value = cropData.width;
                            this.elements.cropHeightInput.value = cropData.height;
                        },
                        crop: (event) => {
                            const { width, height } = event.detail;
                            const roundedWidth = Math.round(width);
                            const roundedHeight = Math.round(height);
                            this.elements.cropDimensionsDisplay.textContent = `${roundedWidth} x ${roundedHeight}`;
                            if (document.activeElement !== this.elements.cropWidthInput) {
                                this.elements.cropWidthInput.value = roundedWidth;
                            }
                            if (document.activeElement !== this.elements.cropHeightInput) {
                                this.elements.cropHeightInput.value = roundedHeight;
                            }
                        }
                    });
                };
                reader.readAsDataURL(file);
            } else {
                this.destroyCropper();
            }
        },
        
        setCropperDataFromInput() {
            if (!this.cropper) return;

            const data = {
                width: parseInt(this.elements.cropWidthInput.value, 10),
                height: parseInt(this.elements.cropHeightInput.value, 10),
            };

            const validData = Object.entries(data).reduce((acc, [key, value]) => {
                if (!isNaN(value) && value > 0) {
                    acc[key] = value;
                }
                return acc;
            }, {});
            
            if (Object.keys(validData).length > 0) {
                this.cropper.setData(validData);
            }
        },

        async applyCrop() {
            if (!this.cropper || this.files.length === 0 || this.isProcessing) return;

            this.isProcessing = true;
            this.updateButtonStates();

            const scope = document.querySelector('input[name="cropScope"]:checked').value;
            const cropData = this.cropper.getData(true);

            this.elements.progressSection.classList.remove('hidden');
            this.elements.resultsSection.classList.remove('hidden');
            this.updateProgress(0);

            try {
                if (scope === 'single') {
                    const originalFile = this.files[0];
                    this.elements.currentTask.textContent = `正在裁剪 ${originalFile.name}...`;

                    const canvas = this.cropper.getCroppedCanvas({
                        imageSmoothingEnabled: true,
                        imageSmoothingQuality: 'high',
                    });

                    if (!canvas) {
                        throw new Error('无法生成裁剪后的图像。');
                    }
                    
                    this.updateProgress(50);

                    const blob = await new Promise(resolve => canvas.toBlob(resolve, originalFile.type, 0.95));
                    
                    if (!blob) {
                        throw new Error('裁剪失败，无法生成 Blob。');
                    }
                    
                    const extension = blob.type.split('/')[1] || 'png';
                    const originalFilenameBase = originalFile.name.split('.').slice(0, -1).join('.') || originalFile.name;
                    const newName = `cropped_${originalFilenameBase}.${extension}`;

                    this.addResultItem({
                        originalName: originalFile.name,
                        newName: newName,
                        blob: blob,
                        url: URL.createObjectURL(blob),
                        operation: 'crop'
                    });

                    this.elements.currentTask.textContent = '裁剪完成！';

                } else { // scope === 'all'
                    this.elements.currentTask.textContent = `准备批量裁剪 ${this.files.length} 个文件...`;
                    let processedCount = 0;
                    const totalFiles = this.files.length;
                    const cropPromises = this.files.map(file => 
                        (async () => {
                            try {
                                let imageBitmap = await createImageBitmap(file);
                                const { canvas, ctx } = this.imageOps.createCanvas(cropData.width, cropData.height);
                                ctx.drawImage(imageBitmap, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, cropData.width, cropData.height);
                                imageBitmap.close();
                                
                                const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type, 0.95));

                                if (!blob) throw new Error('裁剪失败');

                                const extension = blob.type.split('/')[1] || 'png';
                                const originalFilenameBase = file.name.split('.').slice(0, -1).join('.') || file.name;
                                const newName = `cropped_${originalFilenameBase}.${extension}`;
                                this.addResultItem({
                                    originalName: file.name,
                                    newName: newName,
                                    blob: blob,
                                    url: URL.createObjectURL(blob),
                                    operation: 'crop'
                                });

                            } catch (error) {
                                console.error(`处理文件 ${file.name} 失败:`, error);
                                this.addResultItem({ originalName: file.name, error: error.message, operation: 'crop' });
                            } finally {
                                processedCount++;
                                const progress = (processedCount / totalFiles) * 100;
                                this.updateProgress(progress);
                                this.elements.currentTask.textContent = `已处理 ${processedCount} / ${totalFiles} 个文件...`;
                            }
                        })()
                    );
                    
                    await Promise.all(cropPromises);

                    this.elements.currentTask.textContent = '所有任务处理完成！';
                }
            } catch(error) {
                console.error('裁剪操作失败:', error);
                const fileForError = scope === 'single' && this.files.length > 0 ? this.files[0] : { name: '批量裁剪任务' };
                this.addResultItem({ originalName: fileForError.name, error: error.message, operation: 'crop' });
                this.elements.currentTask.textContent = `处理失败: ${error.message}`;
            } finally {
                this.updateProgress(100);
                this.isProcessing = false;
                this.updateButtonStates();
                setTimeout(() => {
                    this.elements.progressSection.classList.add('hidden');
                    this.updateProgress(0);
                }, 2000);
            }
        },
        
        async applySingleFilter() {
            if (this.files.length === 0) {
                alert('请先选择一个文件。');
                return;
            }
            if (this.isProcessing) {
                alert('正在处理中，请稍候...');
                return;
            }

            this.isProcessing = true;
            this.updateButtonStates();

            const originalFile = this.files[0];
            this.elements.progressSection.classList.remove('hidden');
            this.updateProgress(0);
            this.elements.currentTask.textContent = `正在为 ${originalFile.name} 应用滤镜...`;

            try {
                const options = this.getOptionsFor('filter');
                const imageBitmap = await createImageBitmap(originalFile);
                this.updateProgress(50);

                const resultBlob = await this.imageOps.filter(imageBitmap, options);
                imageBitmap.close();

                if (!resultBlob) {
                    throw new Error('应用滤镜失败，无法生成图像。');
                }

                const extension = 'png';
                const originalFilenameBase = originalFile.name.split('.').slice(0, -1).join('.') || originalFile.name;
                const newName = `filtered_${originalFilenameBase}.${extension}`;
                
                const result = {
                    originalName: originalFile.name,
                    newName: newName,
                    blob: resultBlob,
                    url: URL.createObjectURL(resultBlob),
                    operation: 'filter'
                };
                
                this.addResultItem(result);
                
                this.updateProgress(100);
                this.elements.currentTask.textContent = '滤镜应用完成！';

            } catch (error) {
                console.error('应用滤镜失败:', error);
                this.addResultItem({ originalName: originalFile.name, error: error.message, operation: 'filter' });
                this.updateProgress(100);
                this.elements.currentTask.textContent = `应用滤镜失败: ${error.message}`;
            } finally {
                this.isProcessing = false;
                this.updateButtonStates();
                setTimeout(() => {
                    this.elements.progressSection.classList.add('hidden');
                    this.updateProgress(0);
                }, 2000);
            }
        },

        async applyWatermarkRemoval() {
            if (this.isProcessing) {
                alert('正在处理中，请稍候...');
                return;
            }
            if (!this.isInpaintingActive() || this.files.length === 0) {
                alert('请先选择一个文件并切换到消除水印模式。');
                return;
            }
        
            const options = this.getOptionsFor('watermark');
            if (options.action !== 'remove') return;
        
            const maskPixels = options.maskData.data;
            let isMaskDrawn = false;
            for (let i = 3; i < maskPixels.length; i += 4) {
                if (maskPixels[i] > 0) {
                    isMaskDrawn = true;
                    break;
                }
            }
        
            if (!isMaskDrawn) {
                alert('请先在图片上绘制需要消除的区域。');
                return;
            }

            const scope = document.querySelector('input[name="watermarkRemoveScope"]:checked').value;
            const filesToProcess = (scope === 'single' && this.files.length > 0) ? [this.files[0]] : this.files;

            this.processFiles('watermark_remove', filesToProcess).then(() => {
                this.clearMask();
            });
        },

        isInpaintingActive() {
            return document.querySelector('input[name="watermarkAction"]:checked').value === 'remove';
        },

        getCanvasCoordinates(e) {
            const rect = this.elements.maskCanvas.getBoundingClientRect();
            let x, y;
            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }
            return { x, y };
        },

        bindInpaintingEvents() {
            const { maskCanvas } = this.elements;

            const handlePaintStart = (e) => {
                if (!this.isInpaintingActive()) return;
                e.preventDefault();
                this.inpaintingState.painting = true;
                const { x, y } = this.getCanvasCoordinates(e);
                this.inpaintingState.lastX = x;
                this.inpaintingState.lastY = y;
            };
            
            const handlePaintMove = (e) => {
                if (!this.isInpaintingActive() || !this.inpaintingState.painting) return;
                e.preventDefault();
                const { x, y } = this.getCanvasCoordinates(e);
                this.drawOnMask(this.inpaintingState.lastX, this.inpaintingState.lastY, x, y);
                this.inpaintingState.lastX = x;
                this.inpaintingState.lastY = y;
            };

            const handlePaintEnd = () => {
                this.inpaintingState.painting = false;
            };

            maskCanvas.addEventListener('mousedown', handlePaintStart);
            maskCanvas.addEventListener('mousemove', handlePaintMove);
            maskCanvas.addEventListener('mouseup', handlePaintEnd);
            maskCanvas.addEventListener('mouseout', handlePaintEnd);
            
            maskCanvas.addEventListener('touchstart', handlePaintStart, { passive: false });
            maskCanvas.addEventListener('touchmove', handlePaintMove, { passive: false });
            maskCanvas.addEventListener('touchend', handlePaintEnd);
        },

        drawOnMask(x1, y1, x2, y2) {
            const ctx = this.elements.maskCanvas.getContext('2d');
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 87, 34, 0.7)';
            ctx.lineWidth = this.inpaintingState.brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.closePath();
        },

        clearMask() {
            const { maskCanvas } = this.elements;
            const ctx = maskCanvas.getContext('2d');
            ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        },
        
        initInpainting() {
            if (!this.isInpaintingActive() || this.files.length === 0) {
                this.destroyInpainting();
                return;
            }

            const file = this.files[0];
            if (!file) { 
                this.destroyInpainting();
                return;
            }

            this.elements.inpaintingPlaceholder.style.display = 'none';
            const { inpaintingCanvas, maskCanvas, inpaintingContainer } = this.elements;
            
            inpaintingCanvas.classList.remove('hidden');
            maskCanvas.classList.remove('hidden');
            this.elements.applyRemovalBtn.disabled = false;

            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    inpaintingContainer.style.height = `400px`;

                    const containerWidth = inpaintingContainer.clientWidth;
                    const containerHeight = 400;
                    const imgAspectRatio = img.naturalWidth / img.naturalHeight;
                    const containerAspectRatio = containerWidth / containerHeight;

                    let canvasWidth, canvasHeight;

                    if (imgAspectRatio > containerAspectRatio) {
                        canvasWidth = containerWidth;
                        canvasHeight = containerWidth / imgAspectRatio;
                    } else {
                        canvasHeight = containerHeight;
                        canvasWidth = containerHeight * imgAspectRatio;
                    }

                    canvasWidth = Math.round(canvasWidth);
                    canvasHeight = Math.round(canvasHeight);

                    const topOffset = (containerHeight - canvasHeight) / 2;
                    const leftOffset = (containerWidth - canvasWidth) / 2;

                    [inpaintingCanvas, maskCanvas].forEach(canvas => {
                        canvas.width = canvasWidth;
                        canvas.height = canvasHeight;
                        canvas.style.position = 'absolute';
                        canvas.style.top = `${topOffset}px`;
                        canvas.style.left = `${leftOffset}px`;
                    });
                    maskCanvas.style.zIndex = '10';

                    const ctx = inpaintingCanvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                    this.clearMask();
                }
                img.src = e.target.result;
            }
            reader.readAsDataURL(file);
        },

        destroyInpainting() {
            this.elements.inpaintingPlaceholder.style.display = 'flex';
            this.elements.inpaintingCanvas.classList.add('hidden');
            this.elements.maskCanvas.classList.add('hidden');
            this.elements.inpaintingContainer.style.height = '';
            this.elements.applyRemovalBtn.disabled = true;
        },

        setActiveFilter(filterName) {
            this.activeFilter = filterName;
            this.elements.filterPresetBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filterName);
            });
            this.elements.filterSliders.forEach(slider => slider.disabled = true);
            this.updateFilterPreview();
        },

        clearActiveFilter() {
            this.activeFilter = null;
            this.elements.filterPresetBtns.forEach(btn => btn.classList.remove('active'));
            this.elements.filterSliders.forEach(slider => slider.disabled = false);
        },

        async updateFilterPreview() {
            const canvas = this.elements.filterPreviewCanvas;
            const placeholder = this.elements.filterPreviewPlaceholder;
            const container = this.elements.filterPreviewContainer;
            const file = this.files[0];

            if (!file) {
                canvas.classList.add('hidden');
                placeholder.style.display = 'flex';
                return;
            }

            canvas.classList.remove('hidden');
            placeholder.style.display = 'none';
            
            let bitmap = null;
            try {
                bitmap = await createImageBitmap(file);
                const options = this.getOptionsFor('filter');
                
                const containerWidth = container.clientWidth;
                const maxHeight = 400;
                const imgWidth = bitmap.width;
                const imgHeight = bitmap.height;

                let targetWidth = imgWidth;
                let targetHeight = imgHeight;

                if (imgWidth > containerWidth || imgHeight > maxHeight) {
                    const widthRatio = containerWidth / imgWidth;
                    const heightRatio = maxHeight / imgHeight;
                    const ratio = Math.min(widthRatio, heightRatio);
                    targetWidth = imgWidth * ratio;
                    targetHeight = imgHeight * ratio;
                }

                canvas.width = Math.round(targetWidth);
                canvas.height = Math.round(targetHeight);
                
                const ctx = canvas.getContext('2d');
                this.imageOps._applyFilterToContext(ctx, canvas, bitmap, options);

            } catch (error) {
                console.error("Error updating filter preview:", error);
            } finally {
                if (bitmap) {
                    bitmap.close();
                }
            }
        },
        
        imageOps: {
            createCanvas(width, height) {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                return { canvas, ctx: canvas.getContext('2d') };
            },
            
            async convert(bitmap, options) {
                const { canvas, ctx } = this.createCanvas(bitmap.width, bitmap.height);
                if (options.format === 'jpeg' && options.backgroundColor !== 'transparent') {
                    ctx.fillStyle = options.backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(bitmap, 0, 0);
                const type = `image/${options.format}`;
                const quality = type === 'image/jpeg' ? options.quality : undefined;
                return await new Promise(resolve => canvas.toBlob(resolve, type, quality));
            },

            async compress(file, options) {
                if (!window.imageCompression) {
                    throw new Error('压缩库未加载。');
                }
                return await window.imageCompression(file, options);
            },

            async resize(bitmap, options) {
                let targetWidth = options.width, targetHeight = options.height;
                
                if(options.keepAspectRatio) {
                    const ratio = bitmap.width / bitmap.height;
                    if (options.mode === 'fixed') {
                        if (targetWidth && targetHeight) {
                             if (targetWidth / targetHeight > ratio) {
                                targetWidth = targetHeight * ratio;
                            } else {
                                targetHeight = targetWidth / ratio;
                            }
                        } else if(targetWidth) {
                            targetHeight = targetWidth / ratio;
                        } else if(targetHeight) {
                            targetWidth = targetHeight * ratio;
                        }
                    } else if (options.mode === 'width') {
                        targetHeight = targetWidth / ratio;
                    } else if (options.mode === 'height') {
                        targetWidth = targetHeight * ratio;
                    } else if (options.mode === 'percentage') {
                        const percent = options.width / 100;
                        targetWidth = bitmap.width * percent;
                        targetHeight = bitmap.height * percent;
                    }
                }

                targetWidth = Math.round(targetWidth);
                targetHeight = Math.round(targetHeight);

                if (!isFinite(targetWidth) || !isFinite(targetHeight) || targetWidth <= 0 || targetHeight <= 0) {
                    console.warn("Invalid resize dimensions, returning original image", targetWidth, targetHeight);
                    const { canvas, ctx } = this.createCanvas(bitmap.width, bitmap.height);
                    ctx.drawImage(bitmap, 0, 0);
                    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                }

                const { canvas, ctx } = this.createCanvas(targetWidth, targetHeight);
                ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            },
            
            async watermark(bitmap, options) {
                const { canvas, ctx } = this.createCanvas(bitmap.width, bitmap.height);
                ctx.drawImage(bitmap, 0, 0);
                
                ctx.globalAlpha = options.opacity;
                const margin = 20;

                if (options.type === 'text') {
                    ctx.font = options.font;
                    ctx.fillStyle = options.color;
                    let x, y;

                    switch(options.position) {
                        case 'top-left': x = margin; y = margin; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; break;
                        case 'top-right': x = canvas.width - margin; y = margin; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; break;
                        case 'bottom-left': x = margin; y = canvas.height - margin; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; break;
                        case 'center': x = canvas.width / 2; y = canvas.height / 2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; break;
                        default: // bottom-right
                            x = canvas.width - margin;
                            y = canvas.height - margin;
                            ctx.textAlign = 'right'; 
                            ctx.textBaseline = 'bottom';
                    }
                    ctx.fillText(options.text, x, y);
                } else if (options.type === 'image') {
                    let watermarkBitmap = null;
                    try {
                        watermarkBitmap = await createImageBitmap(options.imageFile);
                        const w = watermarkBitmap.width;
                        const h = watermarkBitmap.height;
                        const baseSize = Math.min(bitmap.width, bitmap.height);
                        const targetWidth = baseSize * options.scale;
                        const scaleFactor = targetWidth / w;
                        const targetHeight = h * scaleFactor;
                        let x, y;
                        switch(options.position) {
                            case 'top-left': x = margin; y = margin; break;
                            case 'top-right': x = canvas.width - targetWidth - margin; y = margin; break;
                            case 'bottom-left': x = margin; y = canvas.height - targetHeight - margin; break;
                            case 'center': x = (canvas.width - targetWidth) / 2; y = (canvas.height - targetHeight) / 2; break;
                            default: // bottom-right
                                x = canvas.width - targetWidth - margin;
                                y = canvas.height - targetHeight - margin;
                        }
                        ctx.drawImage(watermarkBitmap, x, y, targetWidth, targetHeight);
                    } finally {
                        if (watermarkBitmap) watermarkBitmap.close();
                    }
                }

                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            },

            async removeWatermark(bitmap, options) {
                const { canvas, ctx } = this.createCanvas(bitmap.width, bitmap.height);
                ctx.drawImage(bitmap, 0, 0);
            
                const resultData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const { maskData, previewWidth, previewHeight } = options;
                const scaleX = canvas.width / previewWidth;
                const scaleY = canvas.height / previewHeight;
            
                const mask = new Uint8Array(canvas.width * canvas.height);
                let pixelsToFillCount = 0;
            
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const maskX = Math.floor(x / scaleX);
                        const maskY = Math.floor(y / scaleY);
                        const clampedMaskX = Math.max(0, Math.min(maskData.width - 1, maskX));
                        const clampedMaskY = Math.max(0, Math.min(maskData.height - 1, maskY));
                        const maskIndex = (clampedMaskY * maskData.width + clampedMaskX) * 4;
            
                        if (maskData.data[maskIndex + 3] > 0) {
                            const idx = y * canvas.width + x;
                            mask[idx] = 1;
                            pixelsToFillCount++;
                        }
                    }
                }
            
                if (pixelsToFillCount === 0) {
                    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                }
            
                let filledInLastPass = -1;
                while(filledInLastPass !== 0) {
                    filledInLastPass = 0;
                    const pixelsToProcessThisPass = [];
                    
                    for (let y = 0; y < canvas.height; y++) {
                        for (let x = 0; x < canvas.width; x++) {
                            const idx = y * canvas.width + x;
                            if (mask[idx] !== 1) continue;
            
                            let isBoundary = false;
                            for (let j = -1; j <= 1; j++) {
                                for (let i = -1; i <= 1; i++) {
                                    if (i === 0 && j === 0) continue;
                                    const nX = x + i;
                                    const nY = y + j;
                                    if (nX >= 0 && nX < canvas.width && nY >= 0 && nY < canvas.height) {
                                        if (mask[nY * canvas.width + nX] === 0) {
                                            isBoundary = true;
                                            break;
                                        }
                                    }
                                }
                                if (isBoundary) break;
                            }
                            if (isBoundary) {
                                pixelsToProcessThisPass.push({ x, y });
                            }
                        }
                    }
            
                    if (pixelsToProcessThisPass.length === 0) break;
            
                    const passChanges = {};
                    for (const p of pixelsToProcessThisPass) {
                        let r = 0, g = 0, b = 0, count = 0;
                        for (let j = -1; j <= 1; j++) {
                            for (let i = -1; i <= 1; i++) {
                                if (i === 0 && j === 0) continue;
                                const nX = p.x + i;
                                const nY = p.y + j;
                                if (nX >= 0 && nX < canvas.width && nY >= 0 && nY < canvas.height) {
                                    const nIdx = nY * canvas.width + nX;
                                    if (mask[nIdx] === 0) {
                                        const sourceIdx = nIdx * 4;
                                        r += resultData.data[sourceIdx];
                                        g += resultData.data[sourceIdx + 1];
                                        b += resultData.data[sourceIdx + 2];
                                        count++;
                                    }
                                }
                            }
                        }
            
                        if (count > 0) {
                            const pIdx = p.y * canvas.width + p.x;
                            passChanges[pIdx] = { r: r / count, g: g / count, b: b / count };
                        }
                    }
            
                    for (const pIdx in passChanges) {
                        const colors = passChanges[pIdx];
                        const dataIdx = parseInt(pIdx) * 4;
                        resultData.data[dataIdx] = colors.r;
                        resultData.data[dataIdx + 1] = colors.g;
                        resultData.data[dataIdx + 2] = colors.b;
                        mask[pIdx] = 0;
                        filledInLastPass++;
                    }
                }
            
                ctx.putImageData(resultData, 0, 0);
                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            },

            async filter(bitmap, options) {
                const { canvas, ctx } = this.createCanvas(bitmap.width, bitmap.height);
                this._applyFilterToContext(ctx, canvas, bitmap, options);
                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            },

            applyCinematicTone(imageData) {
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i];
                    let g = data[i + 1];
                    let b = data[i + 2];
                    
                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

                    const highlightFactor = Math.min(brightness / 180, 1);
                    r = r + highlightFactor * 25;
                    g = g + highlightFactor * 10;
                    b = b - highlightFactor * 25;

                    const shadowFactor = Math.min((255 - brightness) / 200, 1);
                    r = r - shadowFactor * 20;
                    b = b + shadowFactor * 20;
                    
                    data[i] = Math.max(0, Math.min(255, r));
                    data[i+1] = Math.max(0, Math.min(255, g));
                    data[i+2] = Math.max(0, Math.min(255, b));
                }
                return imageData;
            },

            _applyFilterToContext(ctx, canvas, bitmap, options) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.filter = 'none';
                const scaledWidth = canvas.width;
                const scaledHeight = canvas.height;

                if (options.preset === 'sharpen') {
                    ctx.drawImage(bitmap, 0, 0, scaledWidth, scaledHeight);
                    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
                    const sharpenedData = this.applyConvolution(imageData, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
                    ctx.putImageData(sharpenedData, 0, 0);
                    return;
                } else if (options.preset === 'cinematic') {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = scaledWidth;
                    tempCanvas.height = scaledHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.filter = 'contrast(120%) saturate(90%)';
                    tempCtx.drawImage(bitmap, 0, 0, scaledWidth, scaledHeight);
                    const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
                    const cinematicData = this.applyCinematicTone(imageData);
                    ctx.putImageData(cinematicData, 0, 0);
                    return;
                }

                let filterString = '';
                if (options.preset) {
                    switch (options.preset) {
                        case 'grayscale': filterString = 'grayscale(100%)'; break;
                        case 'sepia': filterString = 'sepia(100%)'; break;
                        case 'invert': filterString = 'invert(100%)'; break;
                        case 'gaussian_blur': filterString = `blur(4px)`; break;
                        case 'lomo': filterString = 'contrast(140%) saturate(120%)'; break;
                        case 'cyberpunk': filterString = 'contrast(140%) brightness(85%) hue-rotate(-20deg) saturate(180%)'; break;
                        case 'jp_fresh': filterString = 'contrast(90%) brightness(110%) saturate(80%) sepia(10%)'; break;
                        case 'ins_style': filterString = 'brightness(110%) contrast(110%) saturate(120%) sepia(6%)'; break;
                    }
                } else {
                    filterString = `brightness(${options.brightness}%) contrast(${options.contrast}%) saturate(${options.saturation}%) blur(${options.blur}px)`;
                }

                ctx.filter = filterString;
                ctx.drawImage(bitmap, 0, 0, scaledWidth, scaledHeight);
                ctx.filter = 'none';
                
                if (options.preset === 'lomo' || options.preset === 'vignette') {
                    ctx.globalCompositeOperation = 'source-over';
                    const outerRadius = Math.sqrt(Math.pow(scaledWidth / 2, 2) + Math.pow(scaledHeight / 2, 2));
                    const innerRadiusRatio = (options.preset === 'lomo') ? 3 : 2.5;
                    const gradient = ctx.createRadialGradient(
                        scaledWidth / 2, scaledHeight / 2, scaledWidth / innerRadiusRatio,
                        scaledWidth / 2, scaledHeight / 2, outerRadius
                    );
                    if (options.preset === 'lomo') {
                        gradient.addColorStop(0, 'rgba(0,0,0,0)');
                        gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');
                        gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
                    } else { // vignette
                        gradient.addColorStop(0, 'rgba(0,0,0,0)');
                        gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)');
                        gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
                    }
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
                } else if (options.preset === 'cyberpunk') {
                    ctx.globalCompositeOperation = 'color-dodge';
                    ctx.fillStyle = 'rgba(50, 100, 255, 0.15)';
                    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
                    ctx.globalCompositeOperation = 'overlay';
                    ctx.fillStyle = 'rgba(255, 20, 147, 0.1)';
                    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
                    ctx.globalCompositeOperation = 'source-over';
                } else if (options.preset === 'jp_fresh') {
                     ctx.globalCompositeOperation = 'soft-light';
                     ctx.fillStyle = 'rgba(173, 216, 230, 0.2)';
                     ctx.fillRect(0, 0, scaledWidth, scaledHeight);
                     ctx.globalCompositeOperation = 'source-over';
                }
            },
            
            applyConvolution(imageData, kernel) {
                const src = imageData.data;
                const width = imageData.width;
                const height = imageData.height;
                const dst = new Uint8ClampedArray(src.length);
                const kernelSize = Math.sqrt(kernel.length);
                const halfKernel = Math.floor(kernelSize / 2);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const dstOff = (y * width + x) * 4;
                        let r = 0, g = 0, b = 0;

                        for (let ky = 0; ky < kernelSize; ky++) {
                            for (let kx = 0; kx < kernelSize; kx++) {
                                const scy = y + ky - halfKernel;
                                const scx = x + kx - halfKernel;

                                if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                                    const srcOff = (scy * width + scx) * 4;
                                    const weight = kernel[ky * kernelSize + kx];
                                    r += src[srcOff] * weight;
                                    g += src[srcOff + 1] * weight;
                                    b += src[srcOff + 2] * weight;
                                }
                            }
                        }
                        dst[dstOff] = r;
                        dst[dstOff + 1] = g;
                        dst[dstOff + 2] = b;
                        dst[dstOff + 3] = src[dstOff + 3];
                    }
                }
                return new ImageData(dst, width, height);
            },

            async addBackground(bitmap, options) {
                const { padding } = options;
                if (padding <= 0) return this.convert(bitmap, { format: 'png' });

                const newWidth = bitmap.width + padding * 2;
                const newHeight = bitmap.height + padding * 2;
                const { canvas, ctx } = this.createCanvas(newWidth, newHeight);

                if (options.type === 'gradient') {
                    let grad;
                    switch (options.direction) {
                        case 'to-right':
                            grad = ctx.createLinearGradient(0, 0, newWidth, 0);
                            break;
                        case 'to-top-right':
                            grad = ctx.createLinearGradient(0, newHeight, newWidth, 0);
                            break;
                        case 'to-bottom-right':
                            grad = ctx.createLinearGradient(0, 0, newWidth, newHeight);
                            break;
                        case 'to-bottom':
                        default:
                            grad = ctx.createLinearGradient(0, 0, 0, newHeight);
                            break;
                    }
                    grad.addColorStop(0, options.color1);
                    grad.addColorStop(1, options.color2);
                    ctx.fillStyle = grad;
                } else { // solid
                    if (options.color === 'random') {
                        ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                    } else {
                        ctx.fillStyle = options.color;
                    }
                }

                ctx.fillRect(0, 0, newWidth, newHeight);
                ctx.drawImage(bitmap, padding, padding);

                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            },

            async getHistogramData(file) {
                let bitmap = null;
                try {
                    bitmap = await createImageBitmap(file);
                    const { canvas, ctx } = this.createCanvas(bitmap.width, bitmap.height);
                    ctx.drawImage(bitmap, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    const rData = new Array(256).fill(0);
                    const gData = new Array(256).fill(0);
                    const bData = new Array(256).fill(0);

                    for (let i = 0; i < data.length; i += 4) {
                        rData[data[i]]++;
                        gData[data[i + 1]]++;
                        bData[data[i + 2]]++;
                    }

                    return { r: rData, g: gData, b: bData };
                } finally {
                    if (bitmap) {
                        bitmap.close();
                    }
                }
            },

            async splice(bitmaps, options) {
                if (bitmaps.length === 0) throw new Error("没有图片可供拼接。");

                switch (options.mode) {
                    case 'nine-square':
                        return this._spliceNineSquare(bitmaps, options);
                    case 'random-scatter':
                        return this._spliceRandomScatter(bitmaps, options);
                    case 'fixed-collage':
                        return this._spliceFixedCollage(bitmaps, options);
                    case 'vertical':
                    case 'horizontal':
                    default:
                        return this._spliceLinear(bitmaps, options);
                }
            },

            async _spliceLinear(bitmaps, options) {
                const { mode, spacing } = options;
                let totalWidth = 0;
                let totalHeight = 0;

                if (mode === 'horizontal') {
                    totalHeight = Math.max(...bitmaps.map(b => b.height));
                    totalWidth = bitmaps.reduce((sum, b) => sum + b.width, 0) + spacing * (bitmaps.length - 1);
                } else {
                    totalWidth = Math.max(...bitmaps.map(b => b.width));
                    totalHeight = bitmaps.reduce((sum, b) => sum + b.height, 0) + spacing * (bitmaps.length - 1);
                }

                const { canvas, ctx } = this.createCanvas(totalWidth, totalHeight);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                let currentX = 0;
                let currentY = 0;

                bitmaps.forEach(bitmap => {
                    if (mode === 'horizontal') {
                        const yOffset = (totalHeight - bitmap.height) / 2;
                        ctx.drawImage(bitmap, currentX, yOffset);
                        currentX += bitmap.width + spacing;
                    } else {
                        const xOffset = (totalWidth - bitmap.width) / 2;
                        ctx.drawImage(bitmap, xOffset, currentY);
                        currentY += bitmap.height + spacing;
                    }
                    bitmap.close();
                });

                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            },

            async _spliceNineSquare(bitmaps, options) {
                const images = bitmaps.slice(0, 9);
                const { spacing } = options;

                if (images.length === 0) throw new Error("没有图片可供拼接。");

                const cellWidth = Math.max(...images.map(b => b.width));
                const cellHeight = Math.max(...images.map(b => b.height));
                const numCols = images.length < 3 ? images.length : 3;
                const numRows = Math.ceil(images.length / 3);

                const totalWidth = cellWidth * numCols + spacing * (numCols - 1);
                const totalHeight = cellHeight * numRows + spacing * (numRows - 1);

                const { canvas, ctx } = this.createCanvas(totalWidth, totalHeight);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                images.forEach((bitmap, i) => {
                    const row = Math.floor(i / 3);
                    const col = i % 3;

                    const cellX = col * (cellWidth + spacing);
                    const cellY = row * (cellHeight + spacing);

                    const drawX = cellX + (cellWidth - bitmap.width) / 2;
                    const drawY = cellY + (cellHeight - bitmap.height) / 2;

                    ctx.drawImage(bitmap, drawX, drawY);
                    bitmap.close();
                });
                
                bitmaps.slice(9).forEach(b => b.close());

                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            },

            async _spliceRandomScatter(bitmaps, options) {
                if (bitmaps.length === 0) throw new Error("没有图片可供拼接。");
                
                const totalArea = bitmaps.reduce((sum, b) => sum + (b.width * b.height), 0);
                const canvasDim = Math.max(Math.sqrt(totalArea) * 1.8, 500); // Ensure a minimum size
                const { canvas, ctx } = this.createCanvas(canvasDim, canvasDim);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                bitmaps.forEach(bitmap => {
                    const scale = Math.random() * 0.4 + 0.7; 
                    const scaledWidth = bitmap.width * scale;
                    const scaledHeight = bitmap.height * scale;
                    
                    const angle = (Math.random() - 0.5) * (30 * Math.PI / 180);

                    const x = Math.random() * (canvas.width - scaledWidth);
                    const y = Math.random() * (canvas.height - scaledHeight);
                    
                    ctx.save();
                    ctx.translate(x + scaledWidth / 2, y + scaledHeight / 2);
                    ctx.rotate(angle);
                    ctx.drawImage(bitmap, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                    ctx.restore();
                    
                    bitmap.close();
                });

                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            },

            async _spliceFixedCollage(bitmaps, options) {
                const { width: targetWidth, height: targetHeight } = options;
                const numImages = bitmaps.length;

                if (numImages === 0) throw new Error("没有图片可供拼接。");

                const { canvas, ctx } = this.createCanvas(targetWidth, targetHeight);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const canvasRatio = targetWidth / targetHeight;
                let cols = Math.ceil(Math.sqrt(numImages * canvasRatio));
                let rows = Math.ceil(numImages / cols);
                
                while (cols > 1 && (cols - 1) * rows >= numImages) {
                    cols--;
                }
                while (rows > 1 && cols * (rows - 1) >= numImages) {
                    rows--;
                }

                const cellWidth = targetWidth / cols;
                const cellHeight = targetHeight / rows;

                bitmaps.forEach((bitmap, i) => {
                    const row = Math.floor(i / cols);
                    const col = i % cols;

                    const cellX = col * cellWidth;
                    const cellY = row * cellHeight;

                    const imgRatio = bitmap.width / bitmap.height;
                    const cellRatio = cellWidth / cellHeight;
                    
                    let drawWidth, drawHeight;
                    if (imgRatio > cellRatio) {
                        drawWidth = cellWidth;
                        drawHeight = cellWidth / imgRatio;
                    } else {
                        drawHeight = cellHeight;
                        drawWidth = cellHeight * imgRatio;
                    }

                    const drawX = cellX + (cellWidth - drawWidth) / 2;
                    const drawY = cellY + (cellHeight - drawHeight) / 2;

                    ctx.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
                    bitmap.close();
                });

                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            }
        }
    };

    App.init();
});
