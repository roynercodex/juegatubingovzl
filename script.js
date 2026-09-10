const columnRanges = [
            { min: 1, max: 15, name: 'B' },
            { min: 16, max: 30, name: 'I' },
            { min: 31, max: 45, name: 'N' },
            { min: 46, max: 60, name: 'G' },
            { min: 61, max: 75, name: 'O' }
        ];

        let speechEnabled = false;

        function createEmptyCard() {
            const card = Array(25).fill("");
            card[12] = ".es";
            return card;
        }

        function createEmptySheet(id = "") {
            return {
                title: String(id),
                cards: [createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard()]
            };
        }

        let sheetsData = [createEmptySheet("1"), createEmptySheet("2")];
        let currentUploadSheetIndex = null;

        let allPatterns = {
            v1: {
                groupLabel: "Modalidades Standard (V1)",
                modes: {
                    "1": { label: "1era Modalidad (V1)", indices: [0, 1, 2, 4, 5, 6, 9, 10, 14, 19, 20, 21, 22, 23, 24] },
                    "2": { label: "2da Modalidad (V1)", indices: [0, 1, 2, 3, 5, 9, 10, 11, 12, 13, 15, 18, 20, 24] },
                    "3": { label: "3era Modalidad (V1)", indices: [0, 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 17, 19, 21, 23, 24] },
                    "4": { label: "Cartón Lleno", indices: Array.from({length: 25}, (_, i) => i) }
                }
            },
            v2: {
                groupLabel: "Modalidades Pro (V2)",
                modes: {
                    "1": { label: "1era Modalidad (V2)", indices: [0, 1, 2, 3, 5, 7, 9, 10, 11, 14, 19, 22, 23, 24] },
                    "2": { label: "2da Modalidad (V2)", indices: [5, 6, 8, 10, 11, 13, 15, 16, 17, 18, 19, 20, 21, 24] },
                    "3": { label: "3era Modalidad (V2)", indices: [1, 2, 3, 8, 10, 11, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24] },
                    "4": { label: "Cartón Lleno", indices: Array.from({length: 25}, (_, i) => i) }
                }
            }
        };

        let markedHistory = [];
        let createdModesCount = 0;
        let editingGroupId = null;

        /* LECTURA POR VOZ */
        function toggleSpeech() {
            speechEnabled = !speechEnabled;
            const btn = document.getElementById('speechBtn');
            if (speechEnabled) {
                btn.classList.add('active');
                btn.innerHTML = '<i data-lucide="volume-2"></i>';
                speakText("Voz activada");
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i data-lucide="volume-x"></i>';
                window.speechSynthesis.cancel();
            }
            lucide.createIcons();
        }

        function speakText(text) {
            if (!speechEnabled || !('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }

        function speakNumber(num) {
            const n = parseInt(num, 10);
            if (isNaN(n)) return;
            let letter = '';
            if (n >= 1 && n <= 15) letter = 'B';
            else if (n >= 16 && n <= 30) letter = 'I';
            else if (n >= 31 && n <= 45) letter = 'N';
            else if (n >= 46 && n <= 60) letter = 'G';
            else if (n >= 61 && n <= 75) letter = 'O';

            speakText(`${letter}, ${n}`);
        }

        /* AREA 3: COPIAR PROMPT DE LECTURA PARA IA */
        function copyPromptToClipboard() {
            const promptText = `Analiza esta imagen de cartones de bingo. Necesito que extraigas los números de cada uno de los 4 cartones visibles y me generes un archivo de texto (.txt) plano con la información.
Instrucciones de formato para el TXT:

El archivo debe contener solo números y espacios.
Cada línea del archivo corresponderá a un cartón completo (leyendo fila por fila, de izquierda a derecha, de arriba a abajo).
Debes listar 24 números por línea (omitiendo el espacio central 'FREE' o '.es', ya que la aplicación lo pone automáticamente).
Los números deben estar separados por un solo espacio.
El orden de las líneas en el TXT debe ser estricto:
Línea 1: Cartón superior izquierdo.
Línea 2: Cartón superior derecho.
Línea 3: Cartón inferior izquierdo.
Línea 4: Cartón inferior derecho.
Dame solo el bloque de código de texto para copiar y pegar directamente en un archivo .txt.`;

            navigator.clipboard.writeText(promptText).then(() => {
                alert("¡Prompt copiado al portapapeles con éxito!");
            }).catch(err => {
                alert("Error al copiar el prompt: " + err);
            });
        }

        function setThemeClass(themeClassName) {
            document.body.className = document.body.className.replace(/\btheme-\S+/g, '');
            document.body.classList.add(themeClassName);
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('active'));
            if (event && event.target) event.target.classList.add('active');
        }

        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            document.getElementById('themeBtn').innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
            lucide.createIcons();
        }

        /* AREA 1: FUNCIONES DE GRUPO MODALIDAD */
        function refreshVersionSelectOptions() {
            const versionSelect = document.getElementById('versionSelect');
            if(!versionSelect) return;
            const currentVal = versionSelect.value;
            versionSelect.innerHTML = '';

            for (let key in allPatterns) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = allPatterns[key].groupLabel || key;
                versionSelect.appendChild(opt);
            }
            versionSelect.value = allPatterns[currentVal] ? currentVal : Object.keys(allPatterns)[0];
        }

        function changeVersionGroup() {
            const version = document.getElementById('versionSelect').value;
            const modeSelect = document.getElementById('modeSelect');
            modeSelect.innerHTML = '';

            if (allPatterns[version] && allPatterns[version].modes) {
                const modes = allPatterns[version].modes;
                for (let key in modes) {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = modes[key].label;
                    modeSelect.appendChild(opt);
                }
            }
            updatePatterns();
        }

        function openGroupModal(editKey = null) {
            editingGroupId = editKey;
            const container = document.getElementById('newModesContainer');
            container.innerHTML = '';
            createdModesCount = 0;

            if (editKey && allPatterns[editKey]) {
                document.getElementById('groupModalTitle').innerHTML = '<i data-lucide="edit"></i> Editar Grupo Modalidad';
                document.getElementById('newGroupName').value = allPatterns[editKey].groupLabel || '';
                
                const modes = allPatterns[editKey].modes;
                for (let mKey in modes) {
                    addModeFieldToCreator(modes[mKey].label, modes[mKey].indices);
                }
            } else {
                document.getElementById('groupModalTitle').innerHTML = '<i data-lucide="plus-circle"></i> Crear Grupo Modalidad';
                document.getElementById('newGroupName').value = '';
                addModeFieldToCreator();
            }

            document.getElementById('groupModal').classList.add('active');
            lucide.createIcons();
        }

        function closeGroupModal() {
            document.getElementById('groupModal').classList.remove('active');
            editingGroupId = null;
        }

        function addModeFieldToCreator(defaultName = '', activeIndices = []) {
            createdModesCount++;
            const container = document.getElementById('newModesContainer');
            const box = document.createElement('div');
            box.className = 'pattern-item-box';

            let gridCells = '';
            for (let i = 0; i < 25; i++) {
                const isSelected = activeIndices.includes(i) ? 'selected' : '';
                gridCells += `<div class="pattern-grid-cell ${isSelected}" data-idx="${i}" onclick="togglePatternCell(this)"></div>`;
            }

            box.innerHTML = `
                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 0.8em; font-weight: bold;">Modalidad ${createdModesCount}:</label>
                    <input type="text" class="new-mode-name" value="${defaultName}" placeholder="Ej. Cuatro Esquinas, Cruz..." style="width: 100%;">
                </div>
                <div>
                    <label style="font-size: 0.75em; font-weight: bold; display: block; text-align: center; margin-bottom: 4px;">Patrón:</label>
                    <div class="pattern-grid-creator">
                        ${gridCells}
                    </div>
                </div>
            `;
            container.appendChild(box);
        }

        function togglePatternCell(cellEl) {
            cellEl.classList.toggle('selected');
        }

        function saveNewModalitiesGroup() {
            const groupName = document.getElementById('newGroupName').value.trim();
            if (!groupName) {
                alert("Ingresa un nombre para el grupo de modalidades.");
                return;
            }

            const boxes = document.querySelectorAll('#newModesContainer .pattern-item-box');
            let newModesObj = {};
            let validCount = 0;

            boxes.forEach((box, index) => {
                const nameInput = box.querySelector('.new-mode-name').value.trim();
                const selectedCells = box.querySelectorAll('.pattern-grid-cell.selected');
                
                if (nameInput) {
                    let indices = [];
                    selectedCells.forEach(cell => {
                        indices.push(parseInt(cell.dataset.idx, 10));
                    });

                    newModesObj[String(index + 1)] = {
                        label: nameInput,
                        indices: indices
                    };
                    validCount++;
                }
            });

            if (validCount === 0) {
                alert("Añade al menos una modalidad válida con su patrón.");
                return;
            }

            const targetGroupId = editingGroupId ? editingGroupId : ("custom_" + Date.now());
            allPatterns[targetGroupId] = {
                groupLabel: groupName,
                modes: newModesObj
            };

            refreshVersionSelectOptions();
            document.getElementById('versionSelect').value = targetGroupId;
            changeVersionGroup();
            closeGroupModal();
        }

        /* CLIC DERECHO EN GRUPO MODALIDAD */
        const versionSelectEl = document.getElementById('versionSelect');
        const contextMenuEl = document.getElementById('groupContextMenu');

        if(versionSelectEl) {
            versionSelectEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const groupKey = versionSelectEl.value;
                if (!groupKey) return;

                contextMenuEl.style.top = `${e.clientY}px`;
                contextMenuEl.style.left = `${e.clientX}px`;
                contextMenuEl.style.display = 'flex';
            });
        }

        window.addEventListener('click', () => {
            if(contextMenuEl) contextMenuEl.style.display = 'none';
        });

        function editSelectedGroup() {
            const groupKey = versionSelectEl.value;
            if (!groupKey) return;
            openGroupModal(groupKey);
        }

        /* DUPLICAR GRUPO MODALIDAD */
        function duplicateSelectedGroup() {
            const groupKey = versionSelectEl.value;
            if (!groupKey || !allPatterns[groupKey]) return;

            const newKey = "custom_" + Date.now();
            const originalGroup = allPatterns[groupKey];
            
            allPatterns[newKey] = JSON.parse(JSON.stringify(originalGroup));
            allPatterns[newKey].groupLabel += " (Copia)";

            refreshVersionSelectOptions();
            document.getElementById('versionSelect').value = newKey;
            changeVersionGroup();
        }

        function deleteSelectedGroup() {
            const groupKey = versionSelectEl.value;
            if (!groupKey) return;

            const groupName = allPatterns[groupKey]?.groupLabel || groupKey;
            if (confirm(`¿Eliminar el grupo "${groupName}"?`)) {
                delete allPatterns[groupKey];
                
                if (Object.keys(allPatterns).length === 0) {
                    allPatterns['v1'] = { groupLabel: "Modalidades V1", modes: { "1": { label: "Cartón Lleno", indices: Array.from({length: 25}, (_, i) => i) } } };
                }

                refreshVersionSelectOptions();
                changeVersionGroup();
            }
        }

        function renderGame() {
            const container = document.getElementById('sheetsContainer');
            if(!container) return;
            container.innerHTML = '';

            sheetsData.forEach((sheet) => {
                const sheetDiv = document.createElement('div');
                sheetDiv.className = 'sheet';

                let html = `<div class="sheet-title">${sheet.title || 'HOJA'}</div><div class="cards-grid">`;

                sheet.cards.forEach((cardNumbers) => {
                    html += `<div class="card">
                        <div class="card-header"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div>
                        <div class="card-grid">`;

                    cardNumbers.forEach((val, idx) => {
                        if (idx === 12 || val === ".es") {
                            html += `<div class="cell free-space marked" data-cell-idx="${idx}" data-val=".es">★</div>`;
                        } else {
                            html += `<div class="cell" data-cell-idx="${idx}" data-val="${val}">${val !== "" ? val : ""}</div>`;
                        }
                    });

                    html += `</div>
                        <div class="card-progress">Progreso: 0 / 0</div>
                        <div class="card-footer">BINGO APP PRO</div>
                    </div>`;
                });

                html += `</div>`;
                sheetDiv.innerHTML = html;
                container.appendChild(sheetDiv);
            });

            document.querySelectorAll('.cell').forEach(cell => {
                cell.addEventListener('click', () => {
                    toggleNumber(cell.getAttribute('data-val'));
                });
            });

            markedHistory.forEach(num => {
                document.querySelectorAll(`.cell[data-val="${num}"]`).forEach(c => c.classList.add('marked'));
            });

            renderHistory();
            updatePatterns();
            lucide.createIcons();
        }

        function toggleNumber(val) {
            if (!val || val === "" || val === ".es") return;

            const matching = document.querySelectorAll(`.cell[data-val="${val}"]`);
            if (matching.length === 0) return;

            const isMarked = matching[0].classList.contains('marked');

            matching.forEach(c => c.classList.toggle('marked', !isMarked));

            if (isMarked) {
                markedHistory = markedHistory.filter(n => String(n) !== String(val));
            } else {
                markedHistory = markedHistory.filter(n => String(n) !== String(val));
                markedHistory.unshift(val);
                speakNumber(val);
            }

            renderHistory();
            updatePatterns();
        }

        function undoLastNumber() {
            if (markedHistory.length === 0) return;
            const lastNum = markedHistory[0];
            toggleNumber(lastNum);
        }

        function renderHistory() {
            const container = document.getElementById('bingoBoardContainer');
            const countEl = document.getElementById('historyCount');
            const lastValEl = document.getElementById('lastNumberValue');

            if(!container || !countEl) return;
            countEl.textContent = markedHistory.length;
            
            if (lastValEl) {
                lastValEl.textContent = markedHistory.length > 0 ? markedHistory[0] : '--';
            }

            container.innerHTML = '';

            columnRanges.forEach(col => {
                const colDiv = document.createElement('div');
                colDiv.className = 'bingo-col';

                const annotatedInCol = markedHistory
                    .map(n => parseInt(n, 10))
                    .filter(n => n >= col.min && n <= col.max)
                    .sort((a, b) => a - b);

                let colHtml = `<div class="bingo-col-header">${col.name}</div><div class="bingo-col-cells">`;

                annotatedInCol.forEach(num => {
                    colHtml += `<div class="history-number-chip" onclick="toggleNumber(${num})">${num}</div>`;
                });

                colHtml += `</div>`;
                colDiv.innerHTML = colHtml;
                container.appendChild(colDiv);
            });
        }

        /* AREA 2: MODALIDAD JUEGO & INDICADORES DE PROGRESO */
        function updatePatterns() {
            const versionSelect = document.getElementById('versionSelect');
            const modeSelect = document.getElementById('modeSelect');
            if(!versionSelect || !modeSelect) return;

            const version = versionSelect.value;
            const mode = modeSelect.value;
            
            const targetIndices = (allPatterns[version] && allPatterns[version].modes && allPatterns[version].modes[mode]) 
                ? allPatterns[version].modes[mode].indices 
                : [];

            document.querySelectorAll('.card').forEach(card => {
                const cells = card.querySelectorAll('.cell');
                let hitCount = 0;

                cells.forEach((cell) => {
                    const cellIdx = parseInt(cell.getAttribute('data-cell-idx'), 10);
                    const isTarget = targetIndices.includes(cellIdx);
                    
                    cell.classList.toggle('pattern-target', isTarget);

                    if (cell.classList.contains('marked') && isTarget) {
                        hitCount++;
                    }
                });

                const progressDiv = card.querySelector('.card-progress');
                if (progressDiv) {
                    const remaining = targetIndices.length - hitCount;
                    progressDiv.textContent = `Faltan: ${remaining} (${hitCount}/${targetIndices.length})`;
                }

                const isComplete = (hitCount === targetIndices.length) && (targetIndices.length > 0);
                const hasOverlay = card.querySelector('.bingo-overlay');

                if (isComplete && !hasOverlay) {
                    card.classList.add('winning-card');
                    const overlay = document.createElement('div');
                    overlay.className = 'bingo-overlay';
                    overlay.innerHTML = '<i data-lucide="trophy" size="48"></i> ¡BINGO!';
                    card.appendChild(overlay);
                    triggerFullscreenBingo(card);
                } else if (!isComplete) {
                    if (hasOverlay) hasOverlay.remove();
                    card.classList.remove('winning-card');
                }
            });
            lucide.createIcons();
        }

        function triggerFullscreenBingo(winningCard) {
            const fsOverlay = document.getElementById('fullscreenBingo');
            if(!fsOverlay) return;
            fsOverlay.classList.add('active');
            confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 } });
            speakText("¡Bingo! ¡Cartón Ganador!");

            if (winningCard) {
                winningCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            setTimeout(() => fsOverlay.classList.remove('active'), 3000);
        }

        function markFromInput() {
            const input = document.getElementById('numberInput');
            if(!input) return;
            const val = input.value.trim();
            if (val !== "") {
                toggleNumber(val);
                input.value = "";
                input.focus();
            }
        }

        const numInputEl = document.getElementById('numberInput');
        if(numInputEl) {
            numInputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') markFromInput();
            });
        }

        function resetAll() {
            document.querySelectorAll('.cell.marked:not(.free-space)').forEach(c => c.classList.remove('marked'));
            document.querySelectorAll('.bingo-overlay').forEach(el => el.remove());
            document.querySelectorAll('.winning-card').forEach(c => c.classList.remove('winning-card'));
            markedHistory = [];
            renderHistory();
            updatePatterns();
        }

        /* AREA 3: MODAL EDITAR CARTONES */
        function openFillModal() { 
            renderModalSheets(); 
            document.getElementById('fillModal').classList.add('active'); 
        }

        function closeFillModal() { 
            document.getElementById('fillModal').classList.remove('active'); 
        }

        function renderModalSheets() {
            const wrapper = document.getElementById('modalSheetsWrapper');
            if(!wrapper) return;
            wrapper.innerHTML = '';

            sheetsData.forEach((sheet, sIdx) => {
                const sheetBlock = document.createElement('div');
                sheetBlock.className = 'sheet-fill-block';

                let htmlHeader = `
                    <div class="sheet-fill-header">
                        <input type="text" id="sheetNum${sIdx}" value="${sheet.title || `Hoja ${sIdx + 1}`}" placeholder="Hoja ${sIdx + 1}" style="font-weight:bold;">
                        <button class="btn btn-danger" style="padding:4px 8px; font-size:0.7em; width:auto;" onclick="removeSheet(${sIdx})" title="Eliminar Hoja"><i data-lucide="trash"></i></button>
                    </div>
                    <div class="sheet-actions-row">
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75em;" onclick="triggerSheetTxtUpload(${sIdx})">
                            <i data-lucide="file-text" size="14"></i> Cargar TXT
                        </button>
                        <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75em;" onclick="clearSingleSheet(${sIdx})" title="Vaciar números de la hoja">
                            <i data-lucide="eraser" size="14"></i> Limpiar
                        </button>
                    </div>
                    <div class="fill-grid-container" id="fillContainer${sIdx}"></div>
                `;
                sheetBlock.innerHTML = htmlHeader;
                wrapper.appendChild(sheetBlock);

                const container = document.getElementById(`fillContainer${sIdx}`);

                sheet.cards.forEach((card, cIdx) => {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'fill-card';

                    const cardLabel = document.createElement('div');
                    cardLabel.className = 'fill-card-title';
                    cardLabel.textContent = `Cartón ${cIdx + 1}`;
                    cardDiv.appendChild(cardLabel);

                    const matrix = document.createElement('div');
                    matrix.className = 'fill-matrix';

                    card.forEach((val, cellIdx) => {
                        const input = document.createElement('input');
                        input.type = 'number';
                        input.dataset.sheet = sIdx;
                        input.dataset.card = cIdx;
                        input.dataset.cell = cellIdx;

                        if (cellIdx === 12) {
                            input.type = 'text';
                            input.value = '★';
                            input.disabled = true;
                        } else {
                            const colIdx = cellIdx % 5;
                            const range = columnRanges[colIdx];
                            
                            input.dataset.col = colIdx;
                            input.dataset.min = range.min;
                            input.dataset.max = range.max;
                            input.title = `Columna ${range.name} (${range.min}-${range.max})`;

                            input.value = (val !== "" && val !== ".es") ? val : "";

                            input.addEventListener('input', function() {
                                if (this.value.length > 2) {
                                    this.value = this.value.slice(0, 2);
                                }
                                validateCardInput(this);
                            });
                        }
                        matrix.appendChild(input);
                    });

                    cardDiv.appendChild(matrix);
                    container.appendChild(cardDiv);

                    // Ejecutar validación inicial para cada columna del cartón cargado
                    for (let col = 0; col < 5; col++) {
                        const sampleInput = matrix.querySelector(`input[data-col="${col}"]`);
                        if (sampleInput) validateCardInput(sampleInput);
                    }
                });
            });
            lucide.createIcons();
        }

        /* FUNCIÓN DE VALIDACIÓN EN TIEMPO REAL */
        function validateCardInput(inputEl) {
            const sIdx = inputEl.dataset.sheet;
            const cIdx = inputEl.dataset.card;
            const colIdx = inputEl.dataset.col;

            const cardInputs = Array.from(
                document.querySelectorAll(`input[data-sheet="${sIdx}"][data-card="${cIdx}"]`)
            );
            const colInputs = cardInputs.filter(inp => inp.dataset.col === colIdx);

            const valueCounts = {};
            colInputs.forEach(inp => {
                const val = inp.value.trim();
                if (val !== "") {
                    valueCounts[val] = (valueCounts[val] || 0) + 1;
                }
            });

            colInputs.forEach(inp => {
                const valStr = inp.value.trim();
                if (valStr === "") {
                    inp.classList.remove('input-invalid');
                    inp.title = `Columna ${columnRanges[inp.dataset.col].name} (${inp.dataset.min}-${inp.dataset.max})`;
                    return;
                }

                const val = parseInt(valStr, 10);
                const min = parseInt(inp.dataset.min, 10);
                const max = parseInt(inp.dataset.max, 10);
                const colName = columnRanges[inp.dataset.col].name;

                let errorMessage = "";

                if (isNaN(val) || val < min || val > max) {
                    errorMessage = `Número fuera de rango para la columna ${colName} (${min}-${max})`;
                } else if (valueCounts[valStr] > 1) {
                    errorMessage = `Número ${val} duplicado en la columna ${colName}`;
                }

                if (errorMessage !== "") {
                    inp.classList.add('input-invalid');
                    inp.title = errorMessage;
                } else {
                    inp.classList.remove('input-invalid');
                    inp.title = `Columna ${colName} (${min}-${max})`;
                }
            });
        }

        function addNewSheet() { 
            sheetsData.push(createEmptySheet(sheetsData.length + 1)); 
            renderModalSheets(); 
        }

        function removeSheet(sIdx) { 
            if (sheetsData.length > 1) { 
                sheetsData.splice(sIdx, 1); 
                renderModalSheets(); 
            } else {
                alert("Debe existir al menos una hoja.");
            }
        }

        function clearSingleSheet(sIdx) {
            if (confirm(`¿Vaciar los números de la Hoja ${sIdx + 1}?`)) {
                sheetsData[sIdx] = createEmptySheet(sheetsData[sIdx].title || (sIdx + 1));
                renderModalSheets();
            }
        }

        function autoFillRandom() {
            for (let s = 0; s < sheetsData.length; s++) {
                for (let c = 0; c < 4; c++) {
                    for (let col = 0; col < 5; col++) {
                        const { min, max } = columnRanges[col];
                        const nums = [];
                        while (nums.length < 5) {
                            const r = Math.floor(Math.random() * (max - min + 1)) + min;
                            if (!nums.includes(r)) nums.push(r);
                        }
                        for (let row = 0; row < 5; row++) {
                            const idx = row * 5 + col;
                            if (idx !== 12) {
                                const input = document.querySelector(`input[data-sheet="${s}"][data-card="${c}"][data-cell="${idx}"]`);
                                if (input) {
                                    input.value = nums[row];
                                    validateCardInput(input);
                                }
                            }
                        }
                    }
                }
            }
        }

        function triggerSheetTxtUpload(sIdx) {
            currentUploadSheetIndex = sIdx;
            const fileInput = document.getElementById('sheetTxtFileInput');
            fileInput.value = '';
            fileInput.click();
        }

        function handleSheetTxtUpload(input) {
            const file = input.files[0];
            if (!file || currentUploadSheetIndex === null) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                processSingleSheetTxt(content, currentUploadSheetIndex);
            };
            reader.readAsText(file);
        }

        function processSingleSheetTxt(text, sIdx) {
            const lines = text.split('\n')
                              .map(line => line.trim())
                              .filter(line => line.length > 0 && !line.startsWith('[') && !line.toLowerCase().startsWith('hoja'));

            if (lines.length < 4) {
                alert("El archivo TXT debe contener al menos 4 líneas (una para cada cartón de esta hoja).");
                return;
            }

            for (let c = 0; c < 4; c++) {
                const numbers = lines[c].split(/[\s,]+/).filter(n => n.length > 0);
                if (numbers.length >= 24) {
                    let numIdx = 0;
                    for (let i = 0; i < 25; i++) {
                        if (i === 12) continue;
                        if (numIdx < numbers.length) {
                            if (numbers.length === 25 && numIdx === 12 && isNaN(parseInt(numbers[numIdx], 10))) {
                                numIdx++;
                            }
                            if (numIdx < numbers.length) {
                                const val = parseInt(numbers[numIdx], 10);
                                const input = document.querySelector(`input[data-sheet="${sIdx}"][data-card="${c}"][data-cell="${i}"]`);
                                if (input) {
                                    input.value = isNaN(val) ? "" : String(val).slice(0, 2);
                                    validateCardInput(input);
                                }
                                numIdx++;
                            }
                        }
                    }
                }
            }
            alert(`¡Se han cargado los 4 cartones en la Hoja ${sIdx + 1}!`);
        }

        function saveModalChanges() {
            const invalidInputs = document.querySelectorAll('#modalSheetsWrapper input.input-invalid');
            if (invalidInputs.length > 0) {
                alert("Por favor corrije los números duplicados o fuera de rango antes de guardar.");
                invalidInputs[0].focus();
                return;
            }

            for (let s = 0; s < sheetsData.length; s++) {
                const titleInput = document.getElementById(`sheetNum${s}`);
                if (titleInput) {
                    sheetsData[s].title = titleInput.value.trim() || `Hoja ${s + 1}`;
                }

                for (let c = 0; c < 4; c++) {
                    for (let i = 0; i < 25; i++) {
                        if (i !== 12) {
                            const input = document.querySelector(`input[data-sheet="${s}"][data-card="${c}"][data-cell="${i}"]`);
                            if (input) {
                                const valStr = input.value.trim();
                                sheetsData[s].cards[c][i] = valStr !== "" ? parseInt(valStr, 10) : "";
                            }
                        } else {
                            sheetsData[s].cards[c][12] = ".es";
                        }
                    }
                }
            }
            closeFillModal();
            renderGame();
        }

        function saveCurrentSlot() {
            const name = prompt("Nombre de la partida:");
            if (!name) return;

            const savedData = JSON.parse(localStorage.getItem('bingo_saved_slots') || '{}');
            savedData[name.trim()] = { sheetsData, markedHistory, allPatterns };
            localStorage.setItem('bingo_saved_slots', JSON.stringify(savedData));
            updateSavedSlotsDropdown();
        }

        function updateSavedSlotsDropdown() {
            const select = document.getElementById('savedSlotsSelect');
            if(!select) return;
            select.innerHTML = '<option value="">-- Partidas Guardadas --</option>';
            const savedData = JSON.parse(localStorage.getItem('bingo_saved_slots') || '{}');
            for (let name in savedData) {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                select.appendChild(opt);
            }
        }

        function loadSelectedSlot() {
            const select = document.getElementById('savedSlotsSelect');
            if(!select) return;
            const name = select.value;
            if (!name) return;
            const savedData = JSON.parse(localStorage.getItem('bingo_saved_slots') || '{}');
            if (savedData[name]) {
                sheetsData = savedData[name].sheetsData;
                markedHistory = savedData[name].markedHistory || [];
                if (savedData[name].allPatterns) {
                    allPatterns = savedData[name].allPatterns;
                    refreshVersionSelectOptions();
                }
                renderGame(); 
                renderHistory();
            }
        }

        function deleteSelectedSlot() {
            const select = document.getElementById('savedSlotsSelect');
            if(!select) return;
            const slotName = select.value;
            if (!slotName) return;
            if(!confirm(`¿Eliminar la partida "${slotName}"?`)) return;
            const savedData = JSON.parse(localStorage.getItem('bingo_saved_slots') || '{}');
            delete savedData[slotName];
            localStorage.setItem('bingo_saved_slots', JSON.stringify(savedData));
            updateSavedSlotsDropdown();
        }

        function exportGameData() {
            const exportObj = { sheetsData, markedHistory, allPatterns };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `bingo_backup_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }

        function importGameData(input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedObj = JSON.parse(e.target.result);
                    if (importedObj.sheetsData) sheetsData = importedObj.sheetsData;
                    if (importedObj.markedHistory) markedHistory = importedObj.markedHistory;
                    if (importedObj.allPatterns) {
                        allPatterns = importedObj.allPatterns;
                        refreshVersionSelectOptions();
                    }
                    renderGame();
                    renderHistory();
                    alert("¡Configuración cargada con éxito!");
                } catch (err) {
                    alert("Error al leer el archivo JSON: " + err.message);
                }
            };
            reader.readAsText(file);
        }

        window.onload = function() {
            refreshVersionSelectOptions();
            changeVersionGroup();
            renderGame();
            updateSavedSlotsDropdown();
            lucide.createIcons();
        };
