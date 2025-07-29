import { queue, client, uid, i18next } from './main.js';
import { getTaskIdByUniqueId, removeTaskByTaskId, updateQueueItemsIds, fetchAndUpdateComfyUIQueueDisplay, wait, updateGridVariables } from './main.js';

// Odnośniki
const generatorTab = document.getElementById('generatorTab');
const editorTab = document.getElementById('editorTab');

const progressBar = document.getElementById('progressBar');
const progressName = document.getElementById('progressName');
const comfyQueueOutputEl = document.getElementById('comfyQueueOutput');
const outputDiv = document.getElementById('output');
const queueDisplay = document.getElementById('queueDisplay');
const imageInput = document.getElementById('imageInput');
const queueOutput = document.getElementById('queueOutput');

const modelSelect = document.getElementById('modelSelect');
const editorSelect = document.getElementById('editorSelect');
const leftMask = document.getElementById('leftMask');
const topMask = document.getElementById('topMask');
const rightMask = document.getElementById('rightMask');
const bottomMask = document.getElementById('bottomMask');

export async function generateImage(workflow) {
    try {
        fetchAndUpdateComfyUIQueueDisplay();
        let editorImgFN = null;
        const comfyQueueOutputValue = comfyQueueOutputEl.innerText.charAt(comfyQueueOutputEl.innerText.length-1);
        if (editorTab.classList.contains('active')) {
            editorImgFN = imageInput.value;
        }
        if (comfyQueueOutputValue > 0) {
            progressName.innerText = i18next.t('queuedGen');
        } else {
            progressName.innerText = i18next.t('processingGen');
        }
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        const metaUniqueId = workflow["99"]._meta.title;
        const taskNoText = document.createElement('span');
        taskNoText.innerText = `Task #${queue.queueItems.length + 1}`;
        taskNoText.className = 'task-no-text';
        taskNoText.id = `${metaUniqueId}`;
        queueItem.appendChild(taskNoText);
        const queueItemDeleteBtn = document.createElement('button');
        queueItemDeleteBtn.textContent = i18next.t('cancelGen');
        queueItemDeleteBtn.addEventListener('click', async () => {
            const taskId = await getTaskIdByUniqueId(metaUniqueId);
            removeTaskByTaskId(taskId);
            queueDisplay.removeChild(queueItem);
            const index = queue.queueItems.indexOf(queueItem);
            if (index > -1) {
                queue.queueItems.splice(index, 1);
            }
            updateQueueItemsIds();
            queue.queue = queue.queue - 1;
            sessionStorage.setItem('comfyQueueCount', queue.queue.toString());
            await wait(500);
            queueOutput.innerText = `${i18next.t('queueOutput')}: ${queue.queue}/${queue.queueLimit}`;
            updateProgressBar(0, 100);
            progressName.innerText = i18next.t('cancelledGen');
        });
        queueItem.appendChild(queueItemDeleteBtn);
        queue.queueItems.push(queueItem);
        queueDisplay.appendChild(queue.queueItems[queue.queueItems.length - 1]);
        updateQueueItemsIds();
        const hasIntermediate = workflow.hasOwnProperty('31');
        // Wysłanie zapytania do kolejki serwera ComfyUI
        console.log('Sending workflow');
        const result = await client.enqueue(workflow, {
            progress: ({max,value}) => updateProgressBar(value, max, hasIntermediate),
        });

        console.log('Result received');
    
        // Sprawdzenie, czy odpowiedź zawiera dane obrazu
        if (!result || !result.images || result.images.length === 0) {
            throw new Error('No image data returned from the server.');
        }
        // Wydobycie adresu URL obrazu z odpowiedzi
        const imageUrl = result.images[0].data.replace('/cui//', '/cui/');
        if (generatorTab.classList.contains('active')) {
        }
    
        const img = document.createElement('img');
        img.src = imageUrl;
        console.log('Image URL:', imageUrl);
        console.log('Image src:', img.src);
    
        // Obsługa błędów
        img.onerror = () => {
            alert(i18next.t('failedLoadGeneratedAlert'));
        };

        outputDiv.innerHTML = '';

        if (editorImgFN) {
            img.className = "comparison-image image-top";
            img.alt = i18next.t('imgAfterAlt');
                    
            const imgBefore = document.createElement('img');
            imgBefore.src = `gallery/${uid}/${editorImgFN}`;
            imgBefore.className = "comparison-image image-bottom";
            imgBefore.alt = i18next.t('imgBeforeAlt');
            imgBefore.onerror = () => {
                alert(i18next.t('failedLoadGeneratedAlert'));
            };

            const draggableLine = document.createElement('div');
            draggableLine.className = 'comparison-draggable-line';
        
            let initialPercentage = 50;
            
            if (editorSelect.value === 'outpainting') {
                img.style.opacity = initialPercentage / 100;
                draggableLine.style.left = `${initialPercentage}%`;
            
                let isDragging = false;
            
                draggableLine.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    draggableLine.classList.add('dragging');
                
                    e.preventDefault();
                
                    const currentContainerRect = comparisonContainer.getBoundingClientRect();
                
                    function onMouseMove(moveEvent) {
                        if (!isDragging) return;
                    
                        let newX = moveEvent.clientX - currentContainerRect.left;
                    
                        if (newX < 0) newX = 0;
                        if (newX > currentContainerRect.width) newX = currentContainerRect.width;
                    
                        let percentage = (newX / currentContainerRect.width) * 100;
                    
                        percentage = Math.max(0, Math.min(100, percentage));
                    
                        draggableLine.style.left = `${percentage}%`;
                    
                        img.style.opacity = percentage / 100;
                    }
                
                    function onMouseUp() {
                        if (isDragging) {
                            isDragging = false;
                            draggableLine.classList.remove('dragging');
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                        }
                    }
                
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            
                img.onload = () => {
                    const leftMaskV = parseInt(leftMask.value);
                    const topMaskV = parseInt(topMask.value);
                    const rightMaskV = parseInt(rightMask.value);
                    const bottomMaskV = parseInt(bottomMask.value);

                    const renderedWidth = img.offsetWidth;
                    const renderedHeight = img.offsetHeight;
                                        
                    const scaleX = renderedWidth / img.naturalWidth;
                    const scaleY = renderedHeight / img.naturalHeight;
                                        
                    const imgBeforeWidth = renderedWidth - (leftMaskV + rightMaskV) * scaleX;
                    const imgBeforeHeight = renderedHeight - (topMaskV + bottomMaskV) * scaleY;
                                        
                    const imgBeforeLeft = leftMaskV * scaleX;
                    const imgBeforeTop = topMaskV * scaleY;
                                                            
                    imgBefore.style.position = "absolute";
                    imgBefore.style.width = `${imgBeforeWidth}px`;
                    imgBefore.style.height = `${imgBeforeHeight}px`;
                    imgBefore.style.left = `${imgBeforeLeft}px`;
                    imgBefore.style.top = `${imgBeforeTop}px`;
                                        
                    comparisonContainer.style.position = "relative";
                    comparisonContainer.style.width = `${renderedWidth}px`;
                    comparisonContainer.style.height = `${renderedHeight}px`;
                                        
                    imgBefore.style.display = "block";
                    img.style.display = "block";
                                        
                    console.log("imgBefore styles:", {
                        top: imgBefore.style.top,
                        left: imgBefore.style.left,
                        width: imgBefore.style.width,
                        height: imgBefore.style.height,
                    });
                    console.log("comparison styles:", {
                        height: comparisonContainer.style.height,
                        width: comparisonContainer.style.width,
                    });
                };
            } else {
                img.style.clipPath = `polygon(${initialPercentage}% 0, 100% 0, 100% 100%, ${initialPercentage}% 100%)`;
                draggableLine.style.left = `${initialPercentage}%`;

                let isDragging = false;

                draggableLine.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    draggableLine.classList.add('dragging');

                    e.preventDefault(); // Prevents text selection during drag

                    const currentContainerRect = comparisonContainer.getBoundingClientRect();

                    function onMouseMove(moveEvent) {
                        if (!isDragging) return;

                        let newX = moveEvent.clientX - currentContainerRect.left;

                        if (newX < 0) newX = 0;
                        if (newX > currentContainerRect.width) newX = currentContainerRect.width;

                        let percentage = (newX / currentContainerRect.width) * 100;

                        percentage = Math.max(0, Math.min(100, percentage));

                        draggableLine.style.left = `${percentage}%`;

                        img.style.clipPath = `polygon(${percentage}% 0, 100% 0, 100% 100%, ${percentage}% 100%)`;
                    }

                    function onMouseUp() {
                        if (isDragging) {
                            isDragging = false;
                            draggableLine.classList.remove('dragging');
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                        }
                    }

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            }

            const comparisonContainer = document.createElement('div');
            comparisonContainer.className = 'image-comparison-container';
            comparisonContainer.appendChild(imgBefore);
            comparisonContainer.appendChild(img);
            comparisonContainer.appendChild(draggableLine);
            outputDiv.appendChild(comparisonContainer);
        } else {
            outputDiv.appendChild(img);
        }
        editorImgFN = null;
        updateGridVariables();
        updateQueueItemsIds();
    } catch (error) {
        console.error('Error generating image:', error);
        alert(i18next.t('failedGen'));
    }
    queue.queue = queue.queue - 1;
    queueDisplay.removeChild(queue.queueItems[0]);
    queue.queueItems.shift();
    sessionStorage.setItem('comfyQueueCount', queue.queue.toString());
    document.getElementById('queueOutput').innerText = `${i18next.t('queueOutput')}: ${queue.queue}/${queue.queueLimit}`;
}

function updateProgressBar(value, max, hasIntermediate) {
    const percentage = (value / max) * 100;
    progressBar.value = percentage;
	if (percentage > 0 && percentage < 100) {
		progressName.innerText = `${i18next.t('progressGen')}: ${Math.round(percentage)}%`;
        if (value % 4 == 0 && hasIntermediate) {
            try {
                outputDiv.innerHTML = '';
                const img = document.createElement('img');
                img.src = `gallery/${uid}/intermediate.png`;
                outputDiv.appendChild(img);
            }
            catch (error) {
                console.error('Error updating intermediate result:', error);
            }
        }
	} else if (percentage == 100) {
		progressName.innerText = i18next.t('generatedGen');
	} else {
		progressName.innerText = '';
	}
    updateQueueItemsIds();
}