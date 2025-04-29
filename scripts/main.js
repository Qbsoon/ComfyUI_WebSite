import { Client } from "https://cdn.jsdelivr.net/npm/@stable-canvas/comfyui-client@latest/dist/main.module.mjs";
import { galleryLoad } from './galleryLoader.js?cache-bust=1';
import { setWorkflow, validateInputs} from './workflows.js?cache-bust=1';

const CUI = "qbsoonw11:8000"
const FTP = "http://qbsoonw11:80"
const uid = 0
var queue = 0
const queueLimit = 5

function updateGridVariables() {
    
    const lastNum = Math.round(window.innerWidth / 320);
    const fullGallery = document.getElementById('fullGallery');
    const lastGallery = document.getElementById('lastGallery');
    fullGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;
    lastGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(202px, 1fr))`;

    loadImages(`${FTP}/gallery/${uid}`, 'lastGallery', lastNum);
    loadImages(`${FTP}/gallery/${uid}`, 'fullGallery', 0);
}

window.addEventListener('resize', updateGridVariables);

// TO-DO
// Zastanowić się nad większą ilością modeli/workflow
// Dodać limit kolejki

// Inicjalizacja klienta
const client = new Client({
    api_host: CUI, // Adres i port serwera ComfyUI
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
    console.log(document.getElementById('modelSelect').value);
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
    } else {
        document.getElementById('negativePromptBox').hidden = false;
        document.getElementById('cfgInput').hidden = false;
        document.getElementById('cfgLabel').hidden = false;
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
    console.log(queue)
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
        updateGridVariables();
    } else if (tab === 'gallery') {
        generatorTab.classList.remove('active');
        galleryTab.classList.add('active');
        mainContainer.style.display = 'none';
        galleryContainerTab.style.display = 'grid';
        updateGridVariables();
    }
}

window.loadImages = galleryLoad;

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
    const workflow = await setWorkflow();
    queue = queue + 1;
    console.log(queue)
    generateImage(workflow);
});
document.getElementById('modelSelect').addEventListener('change', changeModel);
document.getElementById('galleryTab').addEventListener('click', () => {
    switchTab('gallery');
});
document.getElementById('generatorTab').addEventListener('click', () => {
    switchTab('generator');
});

export async function init() {
    switchTab('generator');
    updateGridVariables();
}

window.init = init;