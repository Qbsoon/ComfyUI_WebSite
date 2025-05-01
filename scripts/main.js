import { Client } from "https://cdn.jsdelivr.net/npm/@stable-canvas/comfyui-client@latest/dist/main.module.mjs";
import { galleryLoad } from './galleryLoader.js?cache-bust=1';
import { setWorkflow, validateInputs} from './workflows.js?cache-bust=1';

const FTP = window.location.origin;
const uid = document.body.dataset.username;
var queue = 0;
const queueLimit = 5;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Running init...");
    console.log("Current User UID:", uid);
    init();
});

function updateGridVariables() {
    
    const lastNum = Math.round(window.innerWidth / 320);
    const fullGallery = document.getElementById('fullGallery');
    const lastGallery = document.getElementById('lastGallery');
    fullGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;
    lastGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;

    loadImages('lastGallery', uid,  lastNum);
    loadImages('fullGallery', uid);
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

function changeModel() {
    if (document.getElementById('modelSelect').value === 'sd_xl_base_1.0.safetensors') {
        document.getElementById('stepsRefineInput').hidden = false;
        document.getElementById('stepsRefineLabel').hidden = false;
    } else {
        document.getElementById('stepsRefineInput').hidden = true;
        document.getElementById('stepsRefineLabel').hidden = true;
    }
    if (document.getElementById('modelSelect').value === 'flux1-dev-Q8_0.gguf') {
        document.getElementById('negativePromptBox').hidden = true;
        document.getElementById('cfgInput').hidden = true;
        document.getElementById('cfgLabel').hidden = true;
        document.getElementById('guidanceInput').hidden = false;
        document.getElementById('guidanceLabel').hidden = false;
    } else {
        document.getElementById('negativePromptBox').hidden = false;
        document.getElementById('cfgInput').hidden = false;
        document.getElementById('cfgLabel').hidden = false;
        document.getElementById('guidanceInput').hidden = true;
        document.getElementById('guidanceLabel').hidden = true;
    }
    if (document.getElementById('modelSelect').value === 'PixArt-Sigma-XL-2-2K-MS.pth') {
        document.getElementById('ratioLabel').hidden = false;
        document.getElementById('ratioInput').hidden = false;
        document.getElementById('widthInput').hidden = true;
        document.getElementById('widthLabel').hidden = true;
        document.getElementById('heightInput').hidden = true;
        document.getElementById('heightLabel').hidden = true;
        document.getElementById('ratioOutput').hidden = true;
    } else {
        document.getElementById('ratioLabel').hidden = true;
        document.getElementById('ratioInput').hidden = true;
        document.getElementById('widthInput').hidden = false;
        document.getElementById('widthLabel').hidden = false;
        document.getElementById('heightInput').hidden = false;
        document.getElementById('heightLabel').hidden = false;
        document.getElementById('ratioOutput').hidden = false;
    }
}

async function generateImage(workflow) {
    try {
	    const progressName = document.getElementById('progressName');
        progressName.innerText = 'Processing...';
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
    console.log(`Queue: ${queue}`)
    document.getElementById('queueOutput').innerText = `Queue: ${queue}/5`;
}

export function switchTab(tab) {
    const generatorTab = document.getElementById('generatorTab');
    const galleryTab = document.getElementById('galleryTab');
    const mainContainer = document.getElementById('mainContainer');
    const galleryContainerTab = document.getElementById('galleryContainerTab');

    if (tab === 'generator') {
        generatorTab.classList.add('active');
        galleryTab.classList.remove('active');
        mainContainer.style.display = 'grid';
        mainContainer.style.gridTemplateColumns = `1fr 1fr`;
        galleryContainerTab.style.display = 'none';
        document.getElementById('queueOutput').innerText = `Queue: ${queue}/5`;
        updateGridVariables();
    } else if (tab === 'gallery') {
        generatorTab.classList.remove('active');
        galleryTab.classList.add('active');
        mainContainer.style.display = 'none';
        galleryContainerTab.style.display = 'grid';
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
        queue = 0;
        return;
    }
    const workflow = await setWorkflow(uid);
    queue = queue + 1;
    document.getElementById('queueOutput').innerText = `Queue: ${queue}/5`;
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
document.getElementById('widthInput').addEventListener('input', updateResRatio);
document.getElementById('heightInput').addEventListener('input', updateResRatio);


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
const closeBtn = document.querySelector('.lightbox-close');

function openLightbox(imageUrl) {
  if (lightbox && lightboxImage) {
    lightboxImage.src = imageUrl;
    lightbox.style.display = 'flex';
  }
}

function closeLightbox() {
  if (lightbox) {
    lightbox.style.display = 'none';
    lightboxImage.src = '';
  }
}

if (closeBtn) {
  closeBtn.addEventListener('click', closeLightbox);
}

if (lightbox) {
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
}

window.openLightbox = openLightbox;