import { Client } from "https://cdn.jsdelivr.net/npm/@stable-canvas/comfyui-client@latest/dist/main.module.mjs";
import { galleryLoad } from './galleryLoader.js?cache-bust=1';
import { setWorkflow, validateInputs} from './workflows.js?cache-bust=1';

const FTP = window.location.origin;
const uid = document.body.dataset.username;
let queue = parseInt(sessionStorage.getItem('comfyQueueCount') || '0');
const queueLimit = 3;
const editors = ['colorizing', 'upscaling', 'outpainting'];

let updateTimeout;
let isUpdating = false;

function updateGridVariables(limit_start = null, limit_end = null) {
    clearTimeout(updateTimeout);

    updateTimeout = setTimeout(() => {
        if(isUpdating) return;
        isUpdating = true;
        
        const lastNum = Math.round(window.innerWidth / 202);
        const fullGallery = document.getElementById('fullGallery');
        const lastGallery = document.getElementById('lastGallery');
        const publicGallery = document.getElementById('publicGallery');
        fullGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;
        lastGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;
        publicGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;
        const mainContainer = document.getElementById('mainContainer');
        const galleryContainerTab = document.getElementById('galleryContainerTab');
        const publicGalleryContainerTab = document.getElementById('publicGalleryContainerTab');

        if (mainContainer.style.display === 'grid') {
            loadImages('lastGallery', uid, null, lastNum).finally(() => { isUpdating = false;});
        } else if (galleryContainerTab.style.display === 'grid') {
            loadImages('fullGallery', uid).finally(() => { isUpdating = false;});
        } else if (publicGalleryContainerTab.style.display === 'grid') {
            loadImages('publicGallery', null, null, null, '/api/public-iiif-manifest').finally(() => { isUpdating = false;});
        } else {
            isUpdating = false;
        }
    }, 100);
}

window.addEventListener('resize', updateGridVariables);

// Inicjalizacja klienta
const client = new Client({
	api_host: window.location.hostname,
	ssl: window.location.protocol === 'https:',
	api_base: '/cui/',
});

try {
	client.connect()
	console.log('Connected to server');

    setTimeout(() => {
        console.log('Initiating server queue polling after delay.');
        startComfyQueuePolling(5000);
    }, 2500);

} catch (error) {
	console.error('Failed to connect to ComfyUI server:', error);
}

function updateProgressBar(value, max) {
    const progressBar = document.getElementById('progressBar');
	const progressName = document.getElementById('progressName');
    const percentage = (value / max) * 100;
    progressBar.value = percentage;
	if (percentage > 0 && percentage < 100) {
		progressName.innerText = `Progress: ${Math.round(percentage)}%`;
	} else if (percentage == 100) {
		progressName.innerText = 'Image generated';
	} else {
		progressName.innerText = '';
	}
    updateQueueItemsIds();
}

let comfyQueuePollIntervalId = null; // For ComfyUI queue polling

async function fetchAndUpdateComfyUIQueueDisplay() {
    try {
        const response = await fetch('/api/get-server-queue-count');
        if (!response.ok) {
            // Attempt to parse error from Python if available
            let errorMsg = `Server error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Ignore if response is not JSON
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        updateQueueItemsIds();

        if (data.success) {
            const latestComfyUIServerQueueCount = data.queue_count;
            const comfyQueueOutputEl = document.getElementById('comfyQueueOutput');
            if (comfyQueueOutputEl) {
                if (latestComfyUIServerQueueCount === -1) {
                    comfyQueueOutputEl.innerText = "Server Queue: N/A";
                } else {
                    comfyQueueOutputEl.innerText = `Server Queue: ${latestComfyUIServerQueueCount}`;
                }
            }
        } else {
            throw new Error(data.error || 'Failed to fetch queue count from server.');
        }
    } catch (error) {
        console.error('Error fetching ComfyUI queue count via Python backend:', error);
        latestComfyUIServerQueueCount = -1;
        const comfyQueueOutputEl = document.getElementById('comfyQueueOutput');
        if (comfyQueueOutputEl) {
            comfyQueueOutputEl.innerText = "Server Queue: Error";
        }
    }
}

function startComfyQueuePolling(intervalMs = 5000) {
    if (comfyQueuePollIntervalId) {
        clearInterval(comfyQueuePollIntervalId);
    }
    fetchAndUpdateComfyUIQueueDisplay(); 
    comfyQueuePollIntervalId = setInterval(fetchAndUpdateComfyUIQueueDisplay, intervalMs);
    console.log(`Started ComfyUI server queue polling every ${intervalMs / 1000} seconds.`);
}

function stopComfyQueuePolling() {
    if (comfyQueuePollIntervalId) {
        clearInterval(comfyQueuePollIntervalId);
        comfyQueuePollIntervalId = null;
        console.log("Stopped ComfyUI server queue polling.");
    }
}

function changeModel() {
    if (document.getElementById('generatorTab')?.classList.contains('active')) {
        // Default behavior, for SD3.5 & HDi1f
        document.getElementById('positivePromptBox').hidden = false;
        document.getElementById('negativePromptBox').hidden = false;
        document.getElementById('positivePrompt').placeholder = "Elvish sword";
        document.getElementById('negativePrompt').placeholder = "Bad";
        document.getElementById('stepsRefineInput').hidden = true;
        document.getElementById('stepsRefineLabel').hidden = true;
        document.getElementById('schedulerSelect').hidden = false;
        document.getElementById('schedulerLabel').hidden = false;
        document.getElementById('cfgInput').hidden = false;
        document.getElementById('cfgLabel').hidden = false;
        document.getElementById('guidanceInput').hidden = true;
        document.getElementById('guidanceLabel').hidden = true;
        document.getElementById('ratioLabel').hidden = true;
        document.getElementById('ratioInput').hidden = true;
        document.getElementById('widthInput').hidden = false;
        document.getElementById('widthLabel').hidden = false;
        document.getElementById('heightInput').hidden = false;
        document.getElementById('heightLabel').hidden = false;
        document.getElementById('ratioOutput').hidden = false;
        document.getElementById('stepsInput').hidden = false;
        document.getElementById('stepsLabel').hidden = false;
        document.getElementById('stepsInput').max = 70;
        document.getElementById('blendInput').hidden = true;
        document.getElementById('blendLabel').hidden = true;
        document.getElementById('loraSelect').hidden = true;
        document.getElementById('loraLabel').hidden = true;
        document.getElementById('loraStrengthInput').hidden = true;
        document.getElementById('loraStrengthLabel').hidden = true;
        
        if (document.getElementById('modelSelect').value === 'sd_xl_base_1.0.safetensors') {
            document.getElementById('stepsRefineInput').hidden = false;
            document.getElementById('stepsRefineLabel').hidden = false;
        } 
        if (document.getElementById('modelSelect').value === 'sd_xl_turbo_1.0_fp16.safetensors') {
            document.getElementById('schedulerSelect').hidden = true;
            document.getElementById('schedulerLabel').hidden = true;
            document.getElementById('cfgInput').hidden = true;
            document.getElementById('cfgLabel').hidden = true;
            document.getElementById('stepsInput').max = 10;
        } 
        if (document.getElementById('modelSelect').value === 'flux1-dev-Q8_0.gguf') {
            document.getElementById('negativePromptBox').hidden = true;
            document.getElementById('cfgInput').hidden = true;
            document.getElementById('cfgLabel').hidden = true;
            document.getElementById('guidanceInput').hidden = false;
            document.getElementById('guidanceLabel').hidden = false;
            document.getElementById('loraSelect').hidden = false;
            document.getElementById('loraLabel').hidden = false;
            document.getElementById('loraStrengthInput').hidden = false;
            document.getElementById('loraStrengthLabel').hidden = false;
        } 
        if (document.getElementById('modelSelect').value === 'PixArt-Sigma-XL-2-2K-MS.pth') {
            document.getElementById('ratioLabel').hidden = false;
            document.getElementById('ratioInput').hidden = false;
            document.getElementById('widthInput').hidden = true;
            document.getElementById('widthLabel').hidden = true;
            document.getElementById('heightInput').hidden = true;
            document.getElementById('heightLabel').hidden = true;
            document.getElementById('ratioOutput').hidden = true;
        }
        if (document.getElementById('modelSelect').value === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
            document.getElementById('negativePromptBox').hidden = true;
        }
    } else if (document.getElementById('editorTab')?.classList.contains('active')) {
        document.getElementById('positivePromptBox').hidden = true;
        document.getElementById('negativePromptBox').hidden = true;
        document.getElementById('stepsInput').hidden = true;
        document.getElementById('stepsLabel').hidden = true;
        document.getElementById('stepsRefineInput').hidden = true;
        document.getElementById('stepsRefineLabel').hidden = true;
        document.getElementById('schedulerSelect').hidden = true;
        document.getElementById('schedulerLabel').hidden = true;
        document.getElementById('samplerSelect').hidden = true;
        document.getElementById('samplerLabel').hidden = true;
        document.getElementById('cfgInput').hidden = true;
        document.getElementById('cfgLabel').hidden = true;
        document.getElementById('guidanceInput').hidden = true;
        document.getElementById('guidanceLabel').hidden = true;
        document.getElementById('ratioLabel').hidden = true;
        document.getElementById('ratioInput').hidden = true;
        document.getElementById('widthInput').hidden = true;
        document.getElementById('widthLabel').hidden = true;
        document.getElementById('heightInput').hidden = true;
        document.getElementById('heightLabel').hidden = true;
        document.getElementById('ratioOutput').hidden = true;
        document.getElementById('blendInput').hidden = true;
        document.getElementById('blendLabel').hidden = true;
        document.getElementById('loraSelect').hidden = true;
        document.getElementById('loraLabel').hidden = true;
        document.getElementById('loraStrengthInput').hidden = true;
        document.getElementById('loraStrengthLabel').hidden = true;
        document.getElementById('featheringInput').hidden = true;
        document.getElementById('featheringLabel').hidden = true;
        document.getElementById('leftMask').hidden = true;
        document.getElementById('leftMaskLabel').hidden = true;
        document.getElementById('topMask').hidden = true;
        document.getElementById('topMaskLabel').hidden = true;
        document.getElementById('rightMask').hidden = true;
        document.getElementById('rightMaskLabel').hidden = true;
        document.getElementById('bottomMask').hidden = true;
        document.getElementById('bottomMaskLabel').hidden = true;
        if (document.getElementById('editorSelect').value === 'colorizing') {
            document.getElementById('positivePromptBox').hidden = false;
            document.getElementById('positivePrompt').placeholder = "vibrant, color portrait photo, (masterpiece), sharp, high quality, 8k, epic";
            document.getElementById('negativePromptBox').hidden = false;
            document.getElementById('negativePrompt').placeholder = "vintage, grayscale, grain, blur  CGI, Unreal, Airbrushed, Digital, sepia, watermark";
            document.getElementById('samplerSelect').hidden = false;
            document.getElementById('samplerLabel').hidden = false;
            document.getElementById('schedulerSelect').hidden = false;
            document.getElementById('schedulerLabel').hidden = false;
            document.getElementById('cfgInput').hidden = false;
            document.getElementById('cfgLabel').hidden = false;
            document.getElementById('stepsInput').hidden = false;
            document.getElementById('stepsLabel').hidden = false;
            document.getElementById('stepsInput').max = 10;
            document.getElementById('blendInput').hidden = false;
            document.getElementById('blendLabel').hidden = false;
        } else if (document.getElementById('editorSelect').value === 'outpainting') {
            document.getElementById('positivePromptBox').hidden = false;
            document.getElementById('samplerSelect').hidden = false;
            document.getElementById('samplerLabel').hidden = false;
            document.getElementById('schedulerSelect').hidden = false;
            document.getElementById('schedulerLabel').hidden = false;
            document.getElementById('guidanceInput').hidden = false;
            document.getElementById('guidanceLabel').hidden = false;
            document.getElementById('stepsInput').hidden = false;
            document.getElementById('stepsLabel').hidden = false;
            document.getElementById('featheringInput').hidden = false;
            document.getElementById('featheringLabel').hidden = false;
            document.getElementById('leftMask').hidden = false;
            document.getElementById('leftMaskLabel').hidden = false;
            document.getElementById('topMask').hidden = false;
            document.getElementById('topMaskLabel').hidden = false;
            document.getElementById('rightMask').hidden = false;
            document.getElementById('rightMaskLabel').hidden = false;
            document.getElementById('bottomMask').hidden = false;
            document.getElementById('bottomMaskLabel').hidden = false;
        }
    }
}

let queueItems = [];

async function getTaskIdByUniqueId(uniqueTaskId) {
    const queue = await client.getQueue();

    const runningTasks = (Array.isArray(queue.Running) ? queue.Running : []).map(task => ({
        queue: "Running",
        task
    }));
    const pendingTasks = (Array.isArray(queue.Pending) ? queue.Pending : []).map(task => ({
        queue: "Pending",
        task
    }));

    const allTasks = runningTasks.concat(pendingTasks);

    const found = allTasks.find(
        ({ task }) => task.prompt[2]?.["99"]?._meta?.title === uniqueTaskId
    );

    return found ? [found.queue, found.task.prompt[1]] : null;
}

async function getTaskNoByUniqueId(uniqueTaskId) {
    const queue = await client.getQueue();

    const runningTasks = (Array.isArray(queue.Running) ? queue.Running : []).map(task => ({
        queue: "Running",
        task
    }));
    const pendingTasks = (Array.isArray(queue.Pending) ? queue.Pending : []).map(task => ({
        queue: "Pending",
        task
    }));

    const allTasks = runningTasks.concat(pendingTasks);

    const foundIndex = allTasks.findIndex(
        ({ task }) => task.prompt[2]?.["99"]?._meta?.title === uniqueTaskId
    );

    return foundIndex ? foundIndex + 1 : (foundIndex === 0 ? 1 : -1);
}



async function removeTaskByTaskId(task) {
    if (!task) {
        console.error("Task not found!");
        return;
    }
    
    if (task[0] === 'Running') {
        try {
            console.log("Task is running, interrupting it.");
            await client.interrupt(task[1]);
        } catch (error) {
            console.error("Error interrupting task:", error);
        }
    } else {
        try {
            await client.deleteItem('queue', task[1]);
            console.log(`Task ${task[1]} removed successfully from queue.`);
        } catch (error) {
            console.error("Error removing task:", error);
        }
    }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateQueueItemsIds() {
    if (!queueItems || queueItems.length === 0) {
        return;
    }
    for (let index = 0; index < queueItems.length; index++) {
        const taskNoText = queueItems[index].querySelector('.task-no-text');
        const serverQueueNo = await getTaskNoByUniqueId(taskNoText.id);
        taskNoText.innerHTML = `Task #${index + 1}<br>TaskID: ${taskNoText.id}<br>Server Queue: ${serverQueueNo}`;
    }
}

async function generateImage(workflow) {
    try {
        const outputDiv = document.getElementById('output');
        const queueDisplay = document.getElementById('queueDisplay');
        fetchAndUpdateComfyUIQueueDisplay();
	    const progressName = document.getElementById('progressName');
        const comfyQueueOutputEl = document.getElementById('comfyQueueOutput');
        let editorImgFN = null;
        const comfyQueueOutputValue = comfyQueueOutputEl.innerText.charAt(comfyQueueOutputEl.innerText.length-1);
        if (document.getElementById('editorTab')?.classList.contains('active')) {
            editorImgFN = document.getElementById('imageInput').value;
        }
        if (comfyQueueOutputValue > 0) {
            progressName.innerText = 'Queued...';
        } else {
            progressName.innerText = 'Processing...';
        }
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        const metaUniqueId = workflow["99"]._meta.title;
        const taskNoText = document.createElement('span');
        taskNoText.innerText = `Task #${queueItems.length + 1}`;
        taskNoText.className = 'task-no-text';
        taskNoText.id = `${metaUniqueId}`;
        queueItem.appendChild(taskNoText);
        const queueItemDeleteBtn = document.createElement('button');
        queueItemDeleteBtn.textContent = 'Cancel';
        queueItemDeleteBtn.addEventListener('click', async () => {
            const taskId = await getTaskIdByUniqueId(metaUniqueId);
            removeTaskByTaskId(taskId);
            queueDisplay.removeChild(queueItem);
            const index = queueItems.indexOf(queueItem);
            if (index > -1) {
                queueItems.splice(index, 1);
            }
            updateQueueItemsIds();
            queue = queue - 1;
            sessionStorage.setItem('comfyQueueCount', queue.toString());
            await wait(500);
            document.getElementById('queueOutput').innerText = `Queue: ${queue}/${queueLimit}`;
            updateProgressBar(0, 100);
            progressName.innerText = 'Canceled by user';
        });
        queueItem.appendChild(queueItemDeleteBtn);
        queueItems.push(queueItem);
        queueDisplay.appendChild(queueItems[queueItems.length - 1]);
        updateQueueItemsIds();
        // Wysłanie zapytania do kolejki serwera ComfyUI
		console.log('Sending workflow');
        const result = await client.enqueue(workflow, {
			progress: ({max,value}) => updateProgressBar(value, max),
		});

		console.log('Result received');
    
        // Sprawdzenie, czy odpowiedź zawiera dane obrazu
        if (!result || !result.images || result.images.length === 0) {
            throw new Error('No image data returned from the server.');
        }
        // Wydobycie adresu URL obrazu z odpowiedzi
        const imageUrl = result.images[0].data;
        if (document.getElementById('generatorTab')?.classList.contains('active')) {
        }
    
        const img = document.createElement('img');
        img.src = imageUrl;
    
        // Obsługa błędów
        img.onerror = () => {
            alert('Failed to load the generated image. Please check the server response.');
        };

        outputDiv.innerHTML = '';

        if (editorImgFN) {
            img.className = "comparison-image image-top";
            img.alt = "After";
                    
            const imgBefore = document.createElement('img');
            imgBefore.src = `gallery/${uid}/${editorImgFN}`;
            imgBefore.className = "comparison-image image-bottom";
            imgBefore.alt = "Before";
            imgBefore.onerror = () => {
                alert('Failed to load the generated image. Please check the server response.');
            };

            const draggableLine = document.createElement('div');
            draggableLine.className = 'comparison-draggable-line';
        
            let initialPercentage = 50;
            
            if (document.getElementById('editorSelect').value === 'outpainting') {
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
	                const leftMask = parseInt(document.getElementById('leftMask').value);
	                const topMask = parseInt(document.getElementById('topMask').value);
	                const rightMask = parseInt(document.getElementById('rightMask').value);
	                const bottomMask = parseInt(document.getElementById('bottomMask').value);

                    const renderedWidth = img.offsetWidth;
                    const renderedHeight = img.offsetHeight;
                                        
                    const scaleX = renderedWidth / img.naturalWidth;
                    const scaleY = renderedHeight / img.naturalHeight;
                                        
                    const imgBeforeWidth = renderedWidth - (leftMask + rightMask) * scaleX;
                    const imgBeforeHeight = renderedHeight - (topMask + bottomMask) * scaleY;
                                        
                    const imgBeforeLeft = leftMask * scaleX;
                    const imgBeforeTop = topMask * scaleY;
                                                            
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
        alert('Failed to generate image. Check the console for details.');
    }
    queue = queue - 1;
    queueDisplay.removeChild(queueItems[0]);
    queueItems.shift();
    sessionStorage.setItem('comfyQueueCount', queue.toString());
    document.getElementById('queueOutput').innerText = `Queue: ${queue}/${queueLimit}`;
}

export function switchTab(tab) {
    const generatorTab = document.getElementById('generatorTab');
    const editorTab = document.getElementById('editorTab');
    const galleryTab = document.getElementById('galleryTab');
    const publicGalleryTab = document.getElementById('publicGalleryTab');
    const mainContainer = document.getElementById('mainContainer');
    const modelParameters = document.getElementById('modelParameters');
    const editorParameters = document.getElementById('editorParameters');
    const galleryContainerTab = document.getElementById('galleryContainerTab');
    const publicGalleryContainerTab = document.getElementById('publicGalleryContainerTab');
    let current_active_tab = null;

    if (generatorTab.classList.contains('active') && tab === 'generator') {
        current_active_tab = 'generator';
    } else if (editorTab.classList.contains('active') && tab === 'editor') {
        current_active_tab = 'editor';
    }
    generatorTab.classList.remove('active');
    editorTab.classList.remove('active');
    galleryTab.classList.remove('active');
    publicGalleryTab.classList.remove('active');
    mainContainer.style.display = 'none';
    modelParameters.style.display = 'none';
    editorParameters.style.display = 'none';
    galleryContainerTab.style.display = 'none';
    publicGalleryContainerTab.style.display = 'none';

    if (tab === 'generator') {
        generatorTab.classList.add('active');
        mainContainer.style.display = 'grid';
        mainContainer.style.gridTemplateColumns = `1fr 1fr`;
        modelParameters.style.display = 'flex';
        document.getElementById('queueOutput').innerText = `Queue: ${queue}/${queueLimit}`;
        if (current_active_tab !== 'generator') {
            changeModel();
            restoreModelDefaults();
        }
        updateGridVariables();
    } else if (tab === 'editor') {
        editorTab.classList.add('active');
        mainContainer.style.display = 'grid';
        mainContainer.style.gridTemplateColumns = `1fr 1fr`;
        editorParameters.style.display = 'flex';
        document.getElementById('queueOutput').innerText = `Queue: ${queue}/${queueLimit}`;
        if (current_active_tab !== 'editor') {
            changeModel();
            restoreModelDefaults();
        }
        updateGridVariables();
    } else if (tab === 'gallery') {
        galleryTab.classList.add('active');
        galleryContainerTab.style.display = 'grid';
        updateGridVariables();
    } else if (tab === 'publicGallery') {
        publicGalleryTab.classList.add('active');
        publicGalleryContainerTab.style.display = 'grid';
        updateGridVariables();
    }
}

// Greatest common divider
function gcd(a, b) {
    if (b === 0) {
        return a;
    }
    return gcd(b, a % b);
}

export function updateResRatio() {
    const widthInput = parseInt(document.getElementById('widthInput').value);
    const heightInput = parseInt(document.getElementById('heightInput').value);
    if (!isNaN(widthInput) && !isNaN(heightInput) && widthInput > 0 && heightInput > 0) {
        const divisor = gcd(widthInput, heightInput);
        const ratioX = widthInput / divisor;
        const ratioY = heightInput / divisor;
        document.getElementById('ratioOutput').innerText = `Ratio: ${ratioX}:${ratioY}`;
    } else {
        document.getElementById('ratioOutput').innerText = 'Wrong resolution values';
    }
}

export function restoreModelDefaults() {
    const checkpointName = document.getElementById('modelSelect').value;
    const editorCheckpointName = document.getElementById('editorSelect').value;
    if (document.getElementById('generatorTab')?.classList.contains('active')) {
        if (checkpointName === 'sd_xl_base_1.0.safetensors') {
            document.getElementById('schedulerSelect').value = "normal";
            document.getElementById('samplerSelect').value = "euler";
            document.getElementById('cfgInput').value = 8;
            document.getElementById('stepsInput').value = 20;
            document.getElementById('stepsRefineInput').value = 5;
            document.getElementById('widthInput').value = 1024;
            document.getElementById('heightInput').value = 1024;
        } else if (checkpointName === 'sd3.5_large_fp8_scaled.safetensors') {
            document.getElementById('schedulerSelect').value = "sgm_uniform";
            document.getElementById('samplerSelect').value = "euler";
            document.getElementById('cfgInput').value = 4;
            document.getElementById('stepsInput').value = 20;
            document.getElementById('widthInput').value = 1024;
            document.getElementById('heightInput').value = 1024;
        } else if (checkpointName === 'sd_xl_turbo_1.0_fp16.safetensors') {
            document.getElementById('samplerSelect').value = "euler_ancestral";
            document.getElementById('cfgInput').value = 1;
            document.getElementById('stepsInput').value = 5;
            document.getElementById('widthInput').value = 512;
            document.getElementById('heightInput').value = 512;
        } else if (checkpointName === 'flux1-dev-Q8_0.gguf') {
            document.getElementById('schedulerSelect').value = "normal";
            document.getElementById('samplerSelect').value = "euler";
            document.getElementById('guidanceInput').value = 2;
            document.getElementById('stepsInput').value = 25;
            document.getElementById('widthInput').value = 1024;
            document.getElementById('heightInput').value = 1024;
            document.getElementById('loraSelect').value = "none";
            document.getElementById('loraStrengthInput').value = 0.7;
        } else if (checkpointName === 'PixArt-Sigma-XL-2-2K-MS.pth') {
            document.getElementById('schedulerSelect').value = "normal";
            document.getElementById('samplerSelect').value = "euler_ancestral";
            document.getElementById('cfgInput').value = 7;
            document.getElementById('stepsInput').value = 20;
            document.getElementById('ratioInput').value = 1;
        } else if (checkpointName === 'hidream_i1_fast_fp8.safetensors') {
            document.getElementById('schedulerSelect').value = 'normal';
            document.getElementById('samplerSelect').value = 'lcm';
            document.getElementById('cfgInput').value = 1;
            document.getElementById('stepsInput').value = 16;
            document.getElementById('widthInput').value = 1024;
            document.getElementById('heightInput').value = 1024;
        } else if (checkpointName === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
            document.getElementById('schedulerSelect').value = 'beta';
            document.getElementById('samplerSelect').value = 'euler';
            document.getElementById('cfgInput').value = 3.5;
            document.getElementById('stepsInput').value = 25;
            document.getElementById('widthInput').value = 1024;
            document.getElementById('heightInput').value = 1024;
        }
    } else if (document.getElementById('editorTab')?.classList.contains('active')) {
        if (editorCheckpointName === 'colorizing') {
            document.getElementById('schedulerSelect').value = "karras";
            document.getElementById('samplerSelect').value = "dpmpp_sde";
            document.getElementById('cfgInput').value = 1.98;
            document.getElementById('stepsInput').value = 5;
            document.getElementById('blendInput').value = 0.7;
        } else if (editorCheckpointName === 'outpainting') {
            document.getElementById('schedulerSelect').value = "normal";
            document.getElementById('samplerSelect').value = "euler";
            document.getElementById('guidanceInput').value = 30.0;
            document.getElementById('stepsInput').value = 20;
            document.getElementById('featheringInput').value = 24;
            document.getElementById('leftMask').value = 0;
            document.getElementById('topMask').value = 0;
            document.getElementById('rightMask').value = 0;
            document.getElementById('bottomMask').value = 0;
        }
    }
}

export function restoreModelDefaultPrompts() {
    const checkpointName = document.getElementById('modelSelect').value;
    const editorCheckpointName = document.getElementById('editorSelect').value;
    if (document.getElementById('editorTab')?.classList.contains('active')) {
        if (editorCheckpointName === 'colorizing') {
            document.getElementById('positivePrompt').value = "vibrant, color portrait photo, (masterpiece), sharp, high quality, 8k, epic";
            document.getElementById('negativePrompt').value = "vintage, grayscale, grain, blur  CGI, Unreal, Airbrushed, Digital, sepia, watermark";
        }
    }
}

window.loadImages = galleryLoad;

// EventListeners

document.getElementById('submitButton').addEventListener('click', async () => {
    if (queue >= queueLimit) {
        alert('Queue limit reached. Please wait for the current tasks to finish.');
        return;
    }
    try {
	    validateInputs();
    } catch (error) {
        console.error('Validation failed:', error);
        return;
    }
    const workflow = await setWorkflow(uid);
    queue = queue + 1;
    sessionStorage.setItem('comfyQueueCount', queue.toString());
    document.getElementById('queueOutput').innerText = `Queue: ${queue}/${queueLimit}`;
    console.log(`Queue: ${queue}`);
    generateImage(workflow);
});
document.getElementById('modelSelect').addEventListener('change', changeModel);
document.getElementById('editorSelect').addEventListener('change', changeModel);
document.getElementById('generatorTab').addEventListener('click', () => {
    switchTab('generator');
});
document.getElementById('editorTab').addEventListener('click', () => {
    switchTab('editor');
});
document.getElementById('galleryTab').addEventListener('click', () => {
    switchTab('gallery');
});
document.getElementById('publicGalleryTab').addEventListener('click', () => {
    switchTab('publicGallery');
});
document.getElementById('widthInput').addEventListener('input', updateResRatio);
document.getElementById('heightInput').addEventListener('input', updateResRatio);
document.getElementById('logoutButton').addEventListener('click', () => {
    stopComfyQueuePolling();
    sessionStorage.removeItem('comfyQueueCount');
    window.location.href = '/logout';
});

const Rbuttons = document.querySelectorAll('.refresh-button');
Rbuttons.forEach(button => {
    button.addEventListener('click', () => {
        updateGridVariables();
    });
});

const modelDefaultBtn = document.getElementById('modelDefaults');
modelDefaultBtn.addEventListener('click', () => {
    restoreModelDefaults();
    updateResRatio();
});

const editorDefaultBtn = document.getElementById('editorDefaults');
editorDefaultBtn.addEventListener('click', () => {
    restoreModelDefaults();
    updateResRatio();
});

const editorDefaultPromptsBtn = document.getElementById('editorPrompts');
editorDefaultPromptsBtn.addEventListener('click', () => {
    restoreModelDefaultPrompts();
});

export async function init() {
    switchTab('generator');
    //updateGridVariables();
    updateResRatio();
    restoreModelDefaults();
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Running init...");
    init();
});

window.init = init;

// Lightbox
const lightbox = document.getElementById('simpleLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeBtn = document.getElementById('lightboxCloseButton');
const deleteBtn = document.getElementById('lightboxDeleteButton');
const lightboxTogglePublicBtn = document.getElementById('lightboxTogglePublicButton');
const lightboxCopyParametersBtn = document.getElementById('lightboxCopyParametersButton');
const lightboxEditImageBtn = document.getElementById('lightboxEditImageButton');
let currentImageToDeleteUrl = null;
let currentLightboxImageOwnerUid = null;
let currentLightboxImageFilename = null;

function openLightbox(imageUrl, workflowData, imageOwnerUid = null, isPublic = false, filename = null) {
    if (lightbox && lightboxImage) {
        lightboxImage.hidden = false;
        lightboxImage.src = imageUrl;
        lightbox.style.display = 'flex';

        currentLightboxImageOwnerUid = imageOwnerUid || uid;
        currentLightboxImageFilename = filename || imageUrl.substring(imageUrl.lastIndexOf('/') + 1);

        if (deleteBtn) {
            deleteBtn.dataset.imageUrl = imageUrl;
            // Only show delete button if the current user owns the image in the lightbox
            deleteBtn.style.display = (currentLightboxImageOwnerUid === uid) ? 'inline-block' : 'none';
        }

        if (lightboxEditImageBtn) {
            lightboxEditImageBtn.style.display = (currentLightboxImageOwnerUid === uid) ? 'inline-block' : 'none';
        }

        if (lightboxTogglePublicBtn) {
            lightboxTogglePublicBtn.dataset.filename = currentLightboxImageFilename;
            lightboxTogglePublicBtn.dataset.ownerUid = currentLightboxImageOwnerUid;
            if (isPublic) {
                lightboxTogglePublicBtn.textContent = 'Hide from public';
                lightboxTogglePublicBtn.classList.add('is-public');
            } else {
                lightboxTogglePublicBtn.textContent = 'Show in public';
                lightboxTogglePublicBtn.classList.remove('is-public');
            }
            // Only show toggle public button if the current user owns the image
            lightboxTogglePublicBtn.style.display = (currentLightboxImageOwnerUid === uid) ? 'inline-block' : 'none';
        }

        if (lightboxCopyParametersBtn) {
            lightboxCopyParametersBtn.dataset.workflowData = JSON.stringify(workflowData);
        } else {
            console.warn("Lightbox copy parameters button not found.");
        }

        if (lightboxEditImageBtn) {
            lightboxEditImageBtn.dataset.filename = currentLightboxImageFilename;
        }
    }
    const prompts = document.getElementById('lightboxPrompts');
    const parameters = document.getElementById('lightboxParameters');
    const comparison = document.getElementById('lightboxComparison');
    if (workflowData) {
        try {
            comparison.innerHTML = '';
            if (editors.includes(workflowData.checkpointName)) {
                const imageBeforeUrl = workflowData.editof;
                lightboxImage.hidden = true;
                comparison.style.display = 'block';
                const img = document.createElement('img');
                img.src = imageUrl;
                img.onerror = () => {
                    alert('Failed to load the generated image. Please check the server response.');
                };
                img.className = "comparison-image image-top";
                img.alt = "After";
            
                const imgBefore = document.createElement('img');
                imgBefore.src = `gallery/${imageBeforeUrl}`;
                imgBefore.className = "comparison-image image-bottom";
                imgBefore.alt = "Before";
                imgBefore.onerror = () => {
                    alert('Failed to load the generated image. Please check the server response.');
                };
            
                const draggableLine = document.createElement('div');
                draggableLine.className = 'comparison-draggable-line';
            
                let initialPercentage = 50;
            
                if (workflowData.checkpointName === 'outpainting') {
                    img.style.opacity = initialPercentage / 100;
                    draggableLine.style.left = `${initialPercentage}%`;

                    let isDragging = false;

                    draggableLine.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        draggableLine.classList.add('dragging');

                        e.preventDefault();

                        const currentContainerRect = comparison.getBoundingClientRect();

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
                        const topMask = parseInt(workflowData.topMask || 0, 10);
                        const bottomMask = parseInt(workflowData.bottomMask || 0, 10);
                        const leftMask = parseInt(workflowData.leftMask || 0, 10);
                        const rightMask = parseInt(workflowData.rightMask || 0, 10);

                        const renderedWidth = img.offsetWidth;
                        const renderedHeight = img.offsetHeight;
                                        
                        const scaleX = renderedWidth / img.naturalWidth;
                        const scaleY = renderedHeight / img.naturalHeight;
                                        
                        const imgBeforeWidth = renderedWidth - (leftMask + rightMask) * scaleX;
                        const imgBeforeHeight = renderedHeight - (topMask + bottomMask) * scaleY;
                                        
                        const imgBeforeLeft = leftMask * scaleX;
                        const imgBeforeTop = topMask * scaleY;
                                                            
                        imgBefore.style.position = "absolute";
                        imgBefore.style.width = `${imgBeforeWidth}px`;
                        imgBefore.style.height = `${imgBeforeHeight}px`;
                        imgBefore.style.left = `${imgBeforeLeft}px`;
                        imgBefore.style.top = `${imgBeforeTop}px`;
                                        
                        comparison.style.position = "relative";
                        comparison.style.width = `${renderedWidth}px`;
                        comparison.style.height = `${renderedHeight}px`;
                                        
                        imgBefore.style.display = "block";
                        img.style.display = "block";
                                        
                        console.log("imgBefore styles:", {
                            top: imgBefore.style.top,
                            left: imgBefore.style.left,
                            width: imgBefore.style.width,
                            height: imgBefore.style.height,
                        });
                        console.log("comparison styles:", {
                            height: comparison.style.height,
                            width: comparison.style.width,
                        });
                    };
                } else {
                    img.style.clipPath = `polygon(${initialPercentage}% 0, 100% 0, 100% 100%, ${initialPercentage}% 100%)`;
                    draggableLine.style.left = `${initialPercentage}%`;

                    let isDragging = false;

                    draggableLine.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        draggableLine.classList.add('dragging');

                        e.preventDefault();

                        const currentContainerRect = comparison.getBoundingClientRect();

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
                
                comparison.appendChild(imgBefore);
                comparison.appendChild(img);
                comparison.appendChild(draggableLine);
            }

            parameters.innerHTML = '';
            prompts.hidden = false;
            if (imageOwnerUid && imageOwnerUid !== uid) {
                parameters.innerHTML += `<strong>Shared by:</strong> ${imageOwnerUid}<br>`;
            }
            if (workflowData.checkpointName === 'sd_xl_base_1.0.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> Stable Diffusion XL`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Refiner Steps:</strong> ${workflowData.stepsRefiner}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'sd3.5_large_fp8_scaled.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> Stable Diffusion 3.5 Large (fp8)`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'sd_xl_turbo_1.0_fp16.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> Stable Diffusion XL Turbo (fp16)`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'FLUX1/flux1-dev-Q8_0.gguf') {
                parameters.innerHTML += `<strong>Model:</strong> FLUX 1. Dev (Q8)`;
                parameters.innerHTML += `<br><strong>Lora:</strong> ${workflowData.lora}`;
                if (workflowData.lora !== 'none') {
                    parameters.innerHTML += `<br><strong>Lora Strength:</strong> ${workflowData.loraStrength}`;
                }
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>Guidance:</strong> ${workflowData.guidance}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'PixArt-Sigma-XL-2-2K-MS.pth') {
                parameters.innerHTML += `<strong>Model:</strong> PixArt Sigma XL 2K`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Ratio:</strong> ${workflowData.ratio}`;
            } else if (workflowData.checkpointName === 'hidream_i1_fast_fp8.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> HiDream I1 Fast (fp8)`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> Verus Vision 1.0b Transformer (fp8)`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'colorizing') {
                parameters.innerHTML += `<strong>Edition type:</strong> Colorizing`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Blend:</strong> ${workflowData.blend}`;
            } else if (workflowData.checkpointName === 'upscaling') {
                prompts.hidden = true;
                parameters.innerHTML += `<strong>Edition type:</strong> Upscaling`;
            } else if (workflowData.checkpointName === 'outpainting') {
                parameters.innerHTML += `<strong>Edition type:</strong> Outpainting`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>Guidance:</strong> ${workflowData.guidance}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Feathering:</strong> ${workflowData.feathering}`;
                parameters.innerHTML += `<br><strong>Left Mask:</strong> ${workflowData.leftMask}`;
                parameters.innerHTML += `<br><strong>Top Mask:</strong> ${workflowData.topMask}`;
                parameters.innerHTML += `<br><strong>Right Mask:</strong> ${workflowData.rightMask}`;
                parameters.innerHTML += `<br><strong>Bottom Mask:</strong> ${workflowData.bottomMask}`;
            }
        } catch (e) {
            console.error("Error displaying metadata from workflow data:", e);
            if (prompts) prompts.innerHTML = "Error loading metadata.";
            if (parameters) parameters.innerHTML = "Error loading metadata.";
        }
    } else {
      if (prompts) prompts.innerHTML = "Metadata not available.";
      if (parameters) parameters.innerHTML = "Metadata not available.";
    }
}

if (lightboxTogglePublicBtn) {
    lightboxTogglePublicBtn.addEventListener('click', async () => {
        const filename = lightboxTogglePublicBtn.dataset.filename;
        const ownerUid = lightboxTogglePublicBtn.dataset.ownerUid;

        if (!filename || !ownerUid) {
            alert("Error: Image details not found for toggling public status.");
            return;
        }
        // Ensure current logged-in user is the owner before sending request
        if (ownerUid !== uid) {
            alert("You can only toggle the public status of your own images.");
            return;
        }

        try {
            const response = await fetch('/api/toggle-public-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename, image_owner_uid: ownerUid })
            });
            const result = await response.json();
            if (result.success) {
                if (result.is_public) {
                    lightboxTogglePublicBtn.textContent = 'Hide from public';
                    lightboxTogglePublicBtn.classList.add('is-public');
                } else {
                    lightboxTogglePublicBtn.textContent = 'Show in public';
                    lightboxTogglePublicBtn.classList.remove('is-public');
                }
                // Refresh public gallery if it's the active tab
                if (document.getElementById('publicGalleryTab')?.classList.contains('active')) {
                    updateGridVariables();
                }
            } else {
                alert(`Error: ${result.error || 'Failed to toggle public status.'}`);
            }
        } catch (error) {
            console.error("Error toggling public status:", error);
            alert("An error occurred. Please try again.");
        }
    });
}

function showCustomConfirm() {
    if (customConfirmModal) {
        customConfirmModal.style.display = 'flex';
    }
}

function hideCustomConfirm() {
    if (customConfirmModal) {
        customConfirmModal.style.display = 'none';
    }
    currentImageToDeleteUrl = null;
}

async function performDeleteImage() {
    if (!currentImageToDeleteUrl) {
        console.error("No image URL set for deletion.");
        hideCustomConfirm();
        return;
    }

    try {
        const url = new URL(currentImageToDeleteUrl);
        const pathParts = url.pathname.split('/');
        const filename = pathParts.pop();

        const response = await fetch('/api/delete-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uid: uid, filename: filename }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            closeLightbox();
            updateGridVariables();
        } else {
            throw new Error(result.error || 'Failed to delete image.');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
    } finally {
        hideCustomConfirm();
    }
}

function closeLightbox() {
  if (lightbox) {
    lightbox.style.display = 'none';
    lightboxImage.src = '';
    if (lightboxImage) lightboxImage.src = '';
    if (deleteBtn) deleteBtn.dataset.imageUrl = '';
  }
}

if (closeBtn) {
  closeBtn.addEventListener('click', closeLightbox);
}

if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
        currentImageToDeleteUrl = deleteBtn.dataset.imageUrl;
        if (currentImageToDeleteUrl) {
            showCustomConfirm();
        } else {
            alert("Could not determine which image to delete.");
        }
    });
}

if (lightbox) {
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
}

if (lightboxCopyParametersBtn) {
    lightboxCopyParametersBtn.addEventListener('click', () => {
        closeLightbox();
        switchTab('generator');
        let workflowData = null;
        try {
            workflowData = JSON.parse(lightboxCopyParametersBtn.dataset.workflowData);
        } catch (error) {
            console.error('Error parsing workflow data:', error);
            return;
        }
        if (!editors.includes(workflowData.checkpointName)) {
            document.getElementById('modelSelect').value = workflowData.checkpointName;
        }
        //changeModel()
        document.getElementById('positivePrompt').value = workflowData.promptP;
        document.getElementById('samplerSelect').value = workflowData.sampler;

        if (workflowData.checkpointName === 'sd_xl_base_1.0.safetensors') {
            document.getElementById('negativePrompt').value = workflowData.promptN;
            document.getElementById('schedulerSelect').value = workflowData.scheduler;
            document.getElementById('cfgInput').value = workflowData.cfg;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('stepsRefineInput').value = workflowData.stepsRefiner;
            document.getElementById('widthInput').value = workflowData.width;
            document.getElementById('heightInput').value = workflowData.height;
        } else if (workflowData.checkpointName === 'sd3.5_large_fp8_scaled.safetensors') {
            document.getElementById('negativePrompt').value = workflowData.promptN;
            document.getElementById('schedulerSelect').value = workflowData.scheduler;
            document.getElementById('cfgInput').value = workflowData.cfg;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('widthInput').value = workflowData.width;
            document.getElementById('heightInput').value = workflowData.height;
        } else if (workflowData.checkpointName === 'sd_xl_turbo_1.0_fp16.safetensors') {
            document.getElementById('negativePrompt').value = workflowData.promptN;
            document.getElementById('cfgInput').value = workflowData.cfg;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('widthInput').value = workflowData.width;
            document.getElementById('heightInput').value = workflowData.height;
        } else if (workflowData.checkpointName === 'FLUX1/flux1-dev-Q8_0.gguf') {
            document.getElementById('modelSelect').value = 'flux1-dev-Q8_0.gguf';
            document.getElementById('loraSelect').value = workflowData.lora;
            document.getElementById('loraStrengthInput').value = workflowData.loraStrength;
            document.getElementById('schedulerSelect').value = workflowData.scheduler;
            document.getElementById('guidanceInput').value = workflowData.guidance;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('widthInput').value = workflowData.width;
            document.getElementById('heightInput').value = workflowData.height;
        } else if (workflowData.checkpointName === 'PixArt-Sigma-XL-2-2K-MS.pth') {
            document.getElementById('negativePrompt').value = workflowData.promptN;
            document.getElementById('schedulerSelect').value = workflowData.scheduler;
            document.getElementById('cfgInput').value = workflowData.cfg;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('ratioInput').value = workflowData.ratio;
        } else if (workflowData.checkpointName === 'hidream_i1_fast_fp8.safetensors') {
            document.getElementById('negativePrompt').value = workflowData.promptN;
            document.getElementById('schedulerSelect').value = workflowData.scheduler;
            document.getElementById('cfgInput').value = workflowData.cfg;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('widthInput').value = workflowData.width;
            document.getElementById('heightInput').value = workflowData.height;
        } else if (workflowData.checkpointName === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
            document.getElementById('schedulerSelect').value = workflowData.scheduler;
            document.getElementById('cfgInput').value = workflowData.cfg;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('widthInput').value = workflowData.width;
            document.getElementById('heightInput').value = workflowData.height;
        } else if (workflowData.checkpointName === 'colorizing') {
            switchTab('editor');
            document.getElementById('editorSelect').value = 'colorizing';
            document.getElementById('positivePrompt').value = workflowData.promptP;
            document.getElementById('negativePrompt').value = workflowData.promptN;
            document.getElementById('schedulerSelect').value = workflowData.scheduler;
            document.getElementById('cfgInput').value = workflowData.cfg;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('blendInput').value = workflowData.blend;
        } else if (workflowData.ckeckPointName === 'upscaling') {
            switchTab('editor');
            document.getElementById('editorSelect').value = 'upscaling';
        } else if (workflowData.checkpointName === 'outpainting') {
            switchTab('editor');
            document.getElementById('editorSelect').value = 'outpainting';
            document.getElementById('positivePrompt').value = workflowData.promptP;
            document.getElementById('samplerSelect').value = workflowData.sampler;
            document.getElementById('schedulerSelect').value = workflowData.scheduler;
            document.getElementById('guidanceInput').value = workflowData.guidance;
            document.getElementById('stepsInput').value = workflowData.steps;
            document.getElementById('featheringInput').value = workflowData.feathering;
            document.getElementById('leftMask').value = workflowData.leftMask;
            document.getElementById('topMask').value = workflowData.topMask;
            document.getElementById('rightMask').value = workflowData.rightMask;
            document.getElementById('bottomMask').value = workflowData.bottomMask;
        }
        changeModel();
        updateResRatio();
        lightboxCopyParametersBtn.dataset.workflowData = null;
    });
}

if (lightboxEditImageBtn) {
    lightboxEditImageBtn.addEventListener('click', () => {
        let filename = null;
        try {
            filename = lightboxEditImageBtn.dataset.filename;
        } catch (error) {
            console.error('Error getting filename for editing:', error);
            return;
        }
        closeLightbox();
        switchTab('editor');
        document.getElementById('imageInput').value = filename;
        const img = document.createElement('img');
        img.src = `gallery/${uid}/${filename}`;

        img.onerror = () => {
            alert('Failed to load the generated image. Please check the server response.');
        };
        img.alt = "Image to edit";
        const outputDiv = document.getElementById('output');
        outputDiv.innerHTML = '';
        outputDiv.appendChild(img);
    });
}

const customConfirmYesBtn = document.getElementById('customConfirmYes');
const customConfirmNoBtn = document.getElementById('customConfirmNo');

if (customConfirmYesBtn) {
    customConfirmYesBtn.addEventListener('click', () => {
        if (lightboxTogglePublicBtn.classList.contains('is-public')) {
            lightboxTogglePublicBtn.click();
        }
        performDeleteImage();
    });
} else {
  console.warn("Custom confirm 'Yes' button not found.");
}

if (customConfirmNoBtn) {
    customConfirmNoBtn.addEventListener('click', hideCustomConfirm);
} else {
  console.warn("Custom confirm 'No' button not found.");
}

window.openLightbox = openLightbox;

const imageUploadBtn = document.getElementById('imageUpload');
const imageInput = document.getElementById('imageInput');
const uploadDialog = document.getElementById('uploadDialog');

if (imageUploadBtn) {
    imageUploadBtn.addEventListener('click', () => {
        uploadDialog.click();
    });
}

uploadDialog.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected.");
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert('Invalid file type. Please select a JPG, JPEG, or PNG file.');
        uploadDialog.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('imageFile', file);

    try {
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
        });

        if (response.status === 413) {
            const errorData = await response.json();
            alert(errorData.error || "File is too large. Server limit for file is " + errorData.limit + "MB.");
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Server error during upload.' }));
            throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.filename) {
            if (imageInput) {
                imageInput.value = result.filename;
                const img = document.createElement('img');
                img.src = `gallery/${uid}/${result.filename}`;

                img.onerror = () => {
                    alert('Failed to load the generated image. Please check the server response.');
                };
                img.alt = "Uploaded Image";
                const outputDiv = document.getElementById('output');
                outputDiv.innerHTML = '';
                outputDiv.appendChild(img);
            }
        } else {
            throw new Error(result.error || 'Upload failed: No filename returned.');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Error uploading file: ${error.message}`);
    } finally {
        uploadDialog.value = '';
    }
});

imageInput.addEventListener('dragover',  (e) => {
    e.preventDefault();
    imageInput.classList.add('dragover');
});
      
imageInput.addEventListener('dragleave', () => {
    imageInput.classList.remove('dragover');
});
      
imageInput.addEventListener('drop', async (e) => {
    e.preventDefault();
    imageInput.classList.remove('dragover');
    const file = e.dataTransfer.files[0];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert('Invalid file type. Please select a JPG, JPEG, or PNG file.');
        uploadDialog.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('imageFile', file);

    try {
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
        });

        if (response.status === 413) {
            const errorData = await response.json();
            alert(errorData.error || "File is too large. Server limit for file is " + errorData.limit + "MB.");
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Server error during upload.' }));
            throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.filename) {
            if (imageInput) {
                imageInput.value = result.filename;
                const img = document.createElement('img');
                img.src = `gallery/${uid}/${result.filename}`;

                img.onerror = () => {
                    alert('Failed to load the generated image. Please check the server response.');
                };
                img.alt = "Uploaded Image";
                const outputDiv = document.getElementById('output');
                outputDiv.innerHTML = '';
                outputDiv.appendChild(img);
            }
        } else {
            throw new Error(result.error || 'Upload failed: No filename returned.');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Error uploading file: ${error.message}`);
    } finally {
        uploadDialog.value = '';
    }
});