import { Client } from "https://cdn.jsdelivr.net/npm/@stable-canvas/comfyui-client@latest/dist/main.module.mjs";
import { galleryLoad } from './galleryLoader.js';
import { setWorkflow, validateInputs} from './workflows.js?cache-bust=1';
import { switchTab, changeModel, restoreModelDefaults, restoreModelDefaultPrompts } from './formUpdate.js';
import { openLightbox, closeLightbox, showCustomConfirm, hideCustomConfirm, performDeleteImage, lightboxCopySet } from './lightbox.js';
import { generateImage } from './generate.js';
import i18next from 'https://cdn.jsdelivr.net/npm/i18next@25.3.2/+esm';
import Backend from 'https://cdn.jsdelivr.net/npm/i18next-http-backend@3.0.2/+esm';
import { updateLocale } from './localeUpdate.js';

// Zmienne globalne
const FTP = window.location.origin;
export const uid = document.body.dataset.username;
export const queue = {
    queue: parseInt(sessionStorage.getItem('comfyQueueCount') || '0'),
    queueLimit: 3,
    queueItems: []
};
export const editors = ['colorizing', 'upscaling', 'outpainting'];

let updateTimeout;
let isUpdating = false;

export const lightboxVars = {
currentImageToDeleteUrl: null,
currentLightboxImageOwnerUid: null,
currentLightboxImageFilename:  null
};

// Obsługa języków
export { i18next }

i18next.use(Backend).init({
  lng: 'en',
  fallbackLng: 'en',
  backend: {
    loadPath: '/locales/{{lng}}.json',
  }
});


i18next.on('languageChanged', (lng) => {
  updateLocale();
});

// Odnośniki
const mainContainer = document.getElementById('mainContainer');
const galleryContainerTab = document.getElementById('galleryContainerTab');
const publicGalleryContainerTab = document.getElementById('publicGalleryContainerTab');
const generatorTab = document.getElementById('generatorTab');
const editorTab = document.getElementById('editorTab');
const galleryTab = document.getElementById('galleryTab');
const publicGalleryTab = document.getElementById('publicGalleryTab');
const helpTab = document.getElementById('helpTab');
const fullGallery = document.getElementById('fullGallery');
const lastGallery = document.getElementById('lastGallery');
const publicGallery = document.getElementById('publicGallery');

const comfyQueueOutputEl = document.getElementById('comfyQueueOutput');
const outputDiv = document.getElementById('output');
const imageInput = document.getElementById('imageInput');
const queueOutput = document.getElementById('queueOutput');
const langSelect = document.getElementById('languageSelect');

const submitButton = document.getElementById('submitButton');
const logoutButton = document.getElementById('logoutButton');
const modelDefaultBtn = document.getElementById('modelDefaults');
const editorDefaultBtn = document.getElementById('editorDefaults');
const editorDefaultPromptsBtn = document.getElementById('editorPrompts');
const imageUploadBtn = document.getElementById('imageUpload');
const uploadDialog = document.getElementById('uploadDialog');

const lightbox = document.getElementById('simpleLightbox');
const closeBtn = document.getElementById('lightboxCloseButton');
const deleteBtn = document.getElementById('lightboxDeleteButton');
const lightboxTogglePublicBtn = document.getElementById('lightboxTogglePublicButton');
const lightboxCopyParametersBtn = document.getElementById('lightboxCopyParametersButton');
const lightboxEditImageBtn = document.getElementById('lightboxEditImageButton');
const customConfirmYesBtn = document.getElementById('customConfirmYes');
const customConfirmNoBtn = document.getElementById('customConfirmNo');
const Rbuttons = document.querySelectorAll('.refresh-button');

const modelSelect = document.getElementById('modelSelect');
const editorSelect = document.getElementById('editorSelect');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');

window.addEventListener('resize', updateGridVariables);

// Inicjalizacja klienta
export const client = new Client({
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

// Odświeżenie zawartości i rozmiarów galerii
export function updateGridVariables(limit_start = null, limit_end = null) {
    clearTimeout(updateTimeout);

    updateTimeout = setTimeout(() => {
        if(isUpdating) return;
        isUpdating = true;
        
        const lastNum = Math.round(window.innerWidth / 202);
        fullGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;
        lastGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;
        publicGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;

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

// Greatest common divider
function gcd(a, b) {
    if (b === 0) {
        return a;
    }
    return gcd(b, a % b);
}

export function updateResRatio() {
    const widthInputV = parseInt(widthInput.value);
    const heightInputV = parseInt(heightInput.value);
    if (!isNaN(widthInputV) && !isNaN(heightInputV) && widthInputV > 0 && heightInputV > 0) {
        const divisor = gcd(widthInputV, heightInputV);
        const ratioX = widthInputV / divisor;
        const ratioY = heightInputV / divisor;
        document.getElementById('ratioOutput').innerText = `${i18next.t('ratioInput')}: ${ratioX}:${ratioY}`;
    } else {
        document.getElementById('ratioOutput').innerText = 'Wrong resolution values';
    }
}

let comfyQueuePollIntervalId = null; // For ComfyUI queue polling

export async function fetchAndUpdateComfyUIQueueDisplay() {
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
            if (comfyQueueOutputEl) {
                if (latestComfyUIServerQueueCount === -1) {
                    comfyQueueOutputEl.innerText = i18next.t('comfyQueueOutputUnknown');
                } else {
                    comfyQueueOutputEl.innerText = `${i18next.t('comfyQueueOutput')}: ${latestComfyUIServerQueueCount}`;
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
            comfyQueueOutputEl.innerText = i18next.t('comfyQueueOutputError');
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

export async function getTaskIdByUniqueId(uniqueTaskId) {
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

export async function removeTaskByTaskId(task) {
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

export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function updateQueueItemsIds() {
    if (!queue.queueItems || queue.queueItems.length === 0) {
        return;
    }
    for (let index = 0; index < queue.queueItems.length; index++) {
        const taskNoText = queue.queueItems[index].querySelector('.task-no-text');
        const serverQueueNo = await getTaskNoByUniqueId(taskNoText.id);
        taskNoText.innerHTML = `${i18next.t('taskNo')}${index + 1}<br>${i18next.t('taskID')}: ${taskNoText.id}<br>${i18next.t('comfyQueueOutput')}: ${serverQueueNo}`;
    }
}

window.loadImages = galleryLoad;

// EventListeners

submitButton.addEventListener('click', async () => {
    if (queue.queue >= queue.queueLimit) {
        alert(i18next.t('queueLimitAlert'));
        return;
    }
    try {
	    validateInputs();
    } catch (error) {
        console.error('Validation failed:', error);
        return;
    }
    const workflow = await setWorkflow(uid);
    queue.queue = queue.queue + 1;
    sessionStorage.setItem('comfyQueueCount', queue.queue.toString());
    queueOutput.innerText = `${i18next.t('queueOutput')}: ${queue.queue}/${queue.queueLimit}`;
    console.log(`Queue: ${queue.queue}`);
    generateImage(workflow);
});
modelSelect.addEventListener('change', changeModel);
editorSelect.addEventListener('change', changeModel);
generatorTab.addEventListener('click', () => {
    switchTab('generator');
});
editorTab.addEventListener('click', () => {
    switchTab('editor');
});
galleryTab.addEventListener('click', () => {
    switchTab('gallery');
});
publicGalleryTab.addEventListener('click', () => {
    switchTab('publicGallery');
});
helpTab.addEventListener('click', () => {
    switchTab('help');
});
widthInput.addEventListener('input', updateResRatio);
heightInput.addEventListener('input', updateResRatio);
logoutButton.addEventListener('click', () => {
    stopComfyQueuePolling();
    sessionStorage.removeItem('comfyQueueCount');
    window.location.href = '/logout';
});

Rbuttons.forEach(button => {
    button.addEventListener('click', () => {
        updateGridVariables();
    });
});

modelDefaultBtn.addEventListener('click', () => {
    restoreModelDefaults();
    updateResRatio();
});

editorDefaultBtn.addEventListener('click', () => {
    restoreModelDefaults();
    updateResRatio();
});

editorDefaultPromptsBtn.addEventListener('click', () => {
    restoreModelDefaultPrompts();
});

langSelect.addEventListener('change', (event) => {
    i18next.changeLanguage(event.target.value);
});

export async function init() {
    switchTab('generator');
    //updateGridVariables();
    updateResRatio();
    restoreModelDefaults();
    updateLocale();
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Running init...");
    init();
});

window.init = init;

// Lightbox

if (lightboxTogglePublicBtn) {
    lightboxTogglePublicBtn.addEventListener('click', async () => {
        const filename = lightboxTogglePublicBtn.dataset.filename;
        const ownerUid = lightboxTogglePublicBtn.dataset.ownerUid;

        if (!filename || !ownerUid) {
            alert(i18next.t('imageDetailsNotFoundAlert'));
            return;
        }
        // Ensure current logged-in user is the owner before sending request
        if (ownerUid !== uid) {
            alert(i18next.t('togglePublicForeignAlert'));
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
                    lightboxTogglePublicBtn.textContent = i18next.t('lightboxTogglePublicOff');
                    lightboxTogglePublicBtn.classList.add('is-public');
                } else {
                    lightboxTogglePublicBtn.textContent = i18next.t('lightboxTogglePublicOn');
                    lightboxTogglePublicBtn.classList.remove('is-public');
                }
                // Refresh public gallery if it's the active tab
                if (publicGalleryTab.classList.contains('active')) {
                    updateGridVariables();
                }
            } else {
                alert(`${i18next.t('error')}: ${result.error || i18next.t('failedTogglePublicAlert')}`);
            }
        } catch (error) {
            console.error("Error toggling public status:", error);
            alert(i18next.t('errorTryAgain'));
        }
    });
}

if (closeBtn) {
  closeBtn.addEventListener('click', closeLightbox);
}

if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
        lightboxVars.currentImageToDeleteUrl = deleteBtn.dataset.imageUrl;
        if (lightboxVars.currentImageToDeleteUrl) {
            showCustomConfirm();
        } else {
            alert(i18next.t('failedDetermineDeleteAlert'));
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
            modelSelect.value = workflowData.checkpointName;
        }
        lightboxCopySet(workflowData);
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
            alert(i18next.t('failedLoadGeneratedAlert'));
        };
        img.alt = i18next.t('imageToEditAlt');
        outputDiv.innerHTML = '';
        outputDiv.appendChild(img);
    });
}

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

// Image upload functionality

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
        alert(i18next.t('invalidFileTypeAlert'));
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
            alert(errorData.error || `${i18next.t('fileTooLargeAlert')} ${errorData.limit} + MB.`);
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
                    alert(i18next.t('failedLoadGeneratedAlert'));
                };
                img.alt = i18next.t('uploadedAlt');
                outputDiv.innerHTML = '';
                outputDiv.appendChild(img);
            }
        } else {
            throw new Error(result.error || 'Upload failed: No filename returned.');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert(`${i18next.t('errorUploadingAlert')}: ${error.message}`);
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
        alert(i18next.t('invalidFileTypeAlert'));
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
            alert(errorData.error || `${i18next.t('fileTooLargeAlert')} ${errorData.limit} + MB.`);
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
                    alert(i18next.t('failedLoadGeneratedAlert'));
                };
                img.alt = i18next.t('uploadedAlt');
                outputDiv.innerHTML = '';
                outputDiv.appendChild(img);
            }
        } else {
            throw new Error(result.error || 'Upload failed: No filename returned.');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert(`${i18next.t('errorUploadingAlert')}: ${error.message}`);
    } finally {
        uploadDialog.value = '';
    }
});