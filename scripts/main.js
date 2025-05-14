import { Client } from "https://cdn.jsdelivr.net/npm/@stable-canvas/comfyui-client@latest/dist/main.module.mjs";
import { galleryLoad } from './galleryLoader.js?cache-bust=1';
import { setWorkflow, validateInputs} from './workflows.js?cache-bust=1';

const FTP = window.location.origin;
const uid = document.body.dataset.username;
let queue = parseInt(sessionStorage.getItem('comfyQueueCount') || '0');
const queueLimit = 3;

function updateGridVariables(limit_start = null, limit_end = null) {
    
    const lastNum = Math.round(window.innerWidth / 320);
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
        loadImages('lastGallery', uid, null, lastNum);
    } else if (galleryContainerTab.style.display === 'grid') {
        loadImages('fullGallery', uid);
    } else if (publicGalleryContainerTab.style.display === 'grid') {
        loadImages('publicGallery', null, null, null, '/api/public-iiif-manifest');
    }
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
    // Default behavior, for SD3.5 & HDi1f
    document.getElementById('stepsRefineInput').hidden = true;
    document.getElementById('stepsRefineLabel').hidden = true;
    document.getElementById('schedulerSelect').hidden = false;
    document.getElementById('schedulerLabel').hidden = false;
    document.getElementById('cfgInput').hidden = false;
    document.getElementById('cfgLabel').hidden = false;
    document.getElementById('negativePromptBox').hidden = false;
    document.getElementById('guidanceInput').hidden = true;
    document.getElementById('guidanceLabel').hidden = true;
    document.getElementById('ratioLabel').hidden = true;
    document.getElementById('ratioInput').hidden = true;
    document.getElementById('widthInput').hidden = false;
    document.getElementById('widthLabel').hidden = false;
    document.getElementById('heightInput').hidden = false;
    document.getElementById('heightLabel').hidden = false;
    document.getElementById('ratioOutput').hidden = false;
    
    if (document.getElementById('modelSelect').value === 'sd_xl_base_1.0.safetensors') {
        document.getElementById('stepsRefineInput').hidden = false;
        document.getElementById('stepsRefineLabel').hidden = false;
    } 
    if (document.getElementById('modelSelect').value === 'sd_xl_turbo_1.0_fp16.safetensors') {
        document.getElementById('schedulerSelect').hidden = true;
        document.getElementById('schedulerLabel').hidden = true;
        document.getElementById('cfgInput').hidden = true;
        document.getElementById('cfgLabel').hidden = true;
    } 
    if (document.getElementById('modelSelect').value === 'flux1-dev-Q8_0.gguf') {
        document.getElementById('negativePromptBox').hidden = true;
        document.getElementById('cfgInput').hidden = true;
        document.getElementById('cfgLabel').hidden = true;
        document.getElementById('guidanceInput').hidden = false;
        document.getElementById('guidanceLabel').hidden = false;
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
    if (document.getElementById('modelSelect').value === 'hidream_i1_fast_fp8.safetensors') {
        document.getElementById('schedulerSelect').value = 'normal';
        document.getElementById('samplerSelect').value = 'lcm';
        document.getElementById('stepsInput').value = 16;
        document.getElementById('cfgInput').value = 1.0;
    }
    if (document.getElementById('modelSelect').value === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
        document.getElementById('negativePromptBox').hidden = true;

        document.getElementById('schedulerSelect').value = 'beta';
        document.getElementById('samplerSelect').value = 'euler';
        document.getElementById('stepsInput').value = 30;
        document.getElementById('cfgInput').value = 3.5;
    }
}

async function generateImage(workflow) {
    try {
        fetchAndUpdateComfyUIQueueDisplay();
	    const progressName = document.getElementById('progressName');
        const comfyQueueOutputEl = document.getElementById('comfyQueueOutput');
        const comfyQueueOutputValue = comfyQueueOutputEl.innerText.charAt(comfyQueueOutputEl.innerText.length-1);
        console.log(`ComfyUI queue output value: ${comfyQueueOutputValue}`);
        if (comfyQueueOutputValue > 0) {
            progressName.innerText = 'Queued...';
        } else {
            progressName.innerText = 'Processing...';
        }
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
    
        const img = document.createElement('img');
        img.src = imageUrl;
    
        // Obsługa błędów
        img.onerror = () => {
            alert('Failed to load the generated image. Please check the server response.');
        };
    
        // Wyświetlenie nowego obrazu
        const outputDiv = document.getElementById('output');
        outputDiv.innerHTML = '';
        outputDiv.appendChild(img);
		updateGridVariables();
    } catch (error) {
        console.error('Error generating image:', error);
        alert('Failed to generate image. Check the console for details.');
    }
    queue = queue - 1;
    sessionStorage.setItem('comfyQueueCount', queue.toString());
    console.log(`Queue: ${queue}`)
    document.getElementById('queueOutput').innerText = `Queue: ${queue}/${queueLimit}`;
}

export function switchTab(tab) {
    const generatorTab = document.getElementById('generatorTab');
    const galleryTab = document.getElementById('galleryTab');
    const publicGalleryTab = document.getElementById('publicGalleryTab');
    const mainContainer = document.getElementById('mainContainer');
    const galleryContainerTab = document.getElementById('galleryContainerTab');
    const publicGalleryContainerTab = document.getElementById('publicGalleryContainerTab');

    
    galleryTab.classList.remove('active');
    generatorTab.classList.remove('active');
    publicGalleryTab.classList.remove('active');
    mainContainer.style.display = 'none';
    galleryContainerTab.style.display = 'none';
    publicGalleryContainerTab.style.display = 'none';

    if (tab === 'generator') {
        generatorTab.classList.add('active');
        mainContainer.style.display = 'grid';
        mainContainer.style.gridTemplateColumns = `1fr 1fr`;
        document.getElementById('queueOutput').innerText = `Queue: ${queue}/${queueLimit}`;
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

window.loadImages = galleryLoad;

// EventListenery

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
document.getElementById('galleryTab').addEventListener('click', () => {
    switchTab('gallery');
});
document.getElementById('generatorTab').addEventListener('click', () => {
    switchTab('generator');
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

export async function init() {
    switchTab('generator');
    updateGridVariables();
    updateResRatio();
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
let currentImageToDeleteUrl = null;
let currentLightboxImageOwnerUid = null;
let currentLightboxImageFilename = null;

function openLightbox(imageUrl, workflowData, imageOwnerUid = null, isPublic = false, filename = null) {
    if (lightbox && lightboxImage) {
        lightboxImage.src = imageUrl;
        lightbox.style.display = 'flex';

        currentLightboxImageOwnerUid = imageOwnerUid || uid;
        currentLightboxImageFilename = filename || imageUrl.substring(imageUrl.lastIndexOf('/') + 1);

        if (deleteBtn) {
            deleteBtn.dataset.imageUrl = imageUrl;
            // Only show delete button if the current user owns the image in the lightbox
            deleteBtn.style.display = (currentLightboxImageOwnerUid === uid) ? 'inline-block' : 'none';
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
    }
    const prompts = document.getElementById('lightboxPrompts');
    const parameters = document.getElementById('lightboxParameters');
    if (workflowData) {
        try {
            parameters.innerHTML = '';
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
        console.log(workflowData);
        document.getElementById('modelSelect').value = workflowData.checkpointName;
        changeModel()
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
        }
        lightboxCopyParametersBtn.dataset.workflowData = null;
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